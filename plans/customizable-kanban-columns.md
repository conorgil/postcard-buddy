# Customizable kanban columns — Implementation Plan

**Status: shipped.**

## Context

The board's five columns (TODO / Writing / Written / Stamp Applied / Mailed) are currently hardcoded as global constants (`COLUMN_ORDER`, `COLUMN_LABELS` in `src/types.ts`), shared identically across every project. Conor wants each project's columns to be fully user-editable: rename them, delete ones they don't need, add new ones, and reorder them — while the existing automatic status-advancement behavior (opening a postcard auto-moves it from column 1 to column 2; a "Done" button in column 2 moves it to column 3; "Next voter" pulls a fresh column-1 voter into column 2) keeps working based on **column position**, not the column's name or id. This means reordering columns is itself a meaningful feature — it's how a user chooses which column gets that positional behavior.

Decisions already confirmed with Conor:
1. Columns are **per-project** (each project has its own independent list, cloned from today's 5 defaults).
2. Deleting a column that still has voters in it is **blocked** with an inline error — voters must be moved out manually first.
3. **Drag-to-reorder** columns is in scope, not just add/rename/delete.

## Design

### Data model (`src/types.ts`)

Replace the closed union with data:
```ts
export interface Column {
  id: string;
  label: string;
}

export const DEFAULT_COLUMNS: Column[] = [
  { id: 'todo', label: 'TODO' },
  { id: 'writing', label: 'Writing' },
  { id: 'written', label: 'Written' },
  { id: 'stamped', label: 'Stamp Applied' },
  { id: 'mailed', label: 'Mailed' },
];

export type ColumnId = string; // was a closed union; now just an id
```
`COLUMN_ORDER`/`COLUMN_LABELS` are deleted. `Voter.status: ColumnId` and every function signature that already says `ColumnId` (`moveVoter`, `moveVoters`, `nextOrderInColumn`, `makeColumnDroppable`, ...) needs **no signature change** — only what `ColumnId` means changes, from a fixed union to an arbitrary per-project column id.

Columns are stored per-project, keyed by project id, mirroring the existing `suspectQueues: Record<string, string[]>` pattern in `StoredState` (`src/storage.ts`):
```ts
export interface StoredState {
  version: 1;
  projects: Project[];
  activeProjectId: string | null;
  voters: Voter[];
  suspectQueues: Record<string, string[]>;
  columns: Record<string, Column[]>;
}
```
`emptyState()` adds `columns: {}`.

**Migration (`loadState()`)** — additive, same style as the existing `suspectQueues`/`voters`-rename guards, still inside the single `version === 1` branch (no version bump):
```ts
if (!parsed.columns) parsed.columns = {};
for (const project of parsed.projects ?? []) {
  if (!parsed.columns[project.id]) {
    parsed.columns[project.id] = DEFAULT_COLUMNS.map((c) => ({ ...c }));
  }
}
```
Because the backfilled default columns reuse the exact literal ids already stored on every existing voter's `status` (`'todo'`, `'writing'`, etc.), this is a pure additive metadata write — no voter record changes, so existing users' boards look identical immediately after upgrading. `createProject` seeds new projects with the same default set (via a small shared `cloneDefaultColumns()` helper so there's one source of truth).

### Storage-layer functions (`src/storage.ts`)

Following the `createProject`/`renameProject` null/boolean-return convention already used for project-name uniqueness:

```ts
export function getColumns(projectId: string): Column[]

// null if a column with this label (case-insensitive, trimmed) already exists in the project
export function addColumn(projectId: string, label: string): Column | null

// false if the column doesn't exist, or another column in the project already has this label
export function renameColumn(projectId: string, columnId: string, label: string): boolean

export type DeleteColumnResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'last-column' }      // a project must always have ≥1 column
  | { ok: false; reason: 'not-empty'; voterCount: number };
export function deleteColumn(projectId: string, columnId: string): DeleteColumnResult

// newOrderOfIds must be a permutation of the project's current column ids; false if not
export function reorderColumns(projectId: string, newOrderOfIds: string[]): boolean
```

Column labels are unique within a project (case-insensitive), mirroring `isDuplicateProjectName` — avoids two identically-labeled columns being ambiguous as drag targets or in exports. `deleteColumn` counts voters via `state.voters.filter(v => v.projectId === projectId && v.status === columnId)` and refuses with `{ reason: 'not-empty', voterCount }` if any exist, or `{ reason: 'last-column' }` if it's the project's only column (prevents an unrecoverable zero-column project, since `addVoter`/import both need a first column to exist).

While touching `deleteProject` to add `delete state.columns[id]`, also fix a small pre-existing leak by adding `delete state.suspectQueues[id]` (currently only `voters`/`projects` are cleaned up) — trivial, same function, same kind of cleanup.

`addVoter` (storage.ts) and `importRecords` (`src/pdf/importPdf.ts`, used by both PDF and paste import) currently hardcode `status: 'todo'` in three spots total. All three become `getColumns(projectId)[0]?.id` — this is the one correctness-critical ripple: since a user can rename or reorder column 0 away from being literally called "todo", new voters must land in whatever column currently occupies **position 0** for that project, not a literal string.

### Auto-move logic rework (`src/detail/detailView.ts`)

Every reserved-role reference (`COLUMN_ORDER[0]`, `[1]`, `[2]`) becomes an index into `getColumns(projectId)` fetched once at the top of `openDetailView`, guarding each behavior on the referenced column actually existing:
```ts
const columns = getColumns(projectId);
const firstColumn = columns[0];
const secondColumn = columns[1];
if (firstColumn && secondColumn && voter.status === firstColumn.id) {
  moveVoter(voter.id, secondColumn.id, null);
  ...
}
```
Same treatment for the "Done" button (`columns[1]`/`columns[2]`) and `goToNextVoter`'s todo/writing-stage pull-in logic. A project with fewer than 3 columns just skips the behaviors that reference a missing index (e.g. no "Done" button if there's no 3rd column) instead of throwing — this is a natural consequence of Conor's own "positions, not names" spec, not a new edge case to design around.

### Ripple through remaining consumers

- **`src/board/render.ts`**: column-building loop switches from `for (const columnId of COLUMN_ORDER)` to `for (const column of getColumns(project.id))`, using `column.id`/`column.label` instead of `columnId`/`COLUMN_LABELS[columnId]`. Gains the column-management UI (below).
- **`src/board/voter.ts`**: `createVoterElement` gains a `columns: Column[]` param (passed once from `render.ts`'s loop) instead of importing `COLUMN_ORDER`; keyboard ArrowLeft/ArrowRight look up `columns.findIndex(c => c.id === voter.status)`.
- **`src/board/dragDrop.ts`**: `makeColumnDroppable` needs no change (column id was always an opaque string). Gains new column-reorder drag functions (below).
- **`src/export/buildExportRows.ts`**: `buildExportRows(voters, columns)` and `summarizeByStatus(voters, columns)` both take the project's `Column[]` as a second argument, replacing `COLUMN_ORDER.indexOf`/`COLUMN_LABELS[...]` lookups with `columns.findIndex(c => c.id === status)` / `columns.find(c => c.id === status)?.label`. Caller **`src/export/exportVoterStatusPdf.ts`** fetches `getColumns(project.id)` and passes it through to both calls.

### Column management UI (`src/board/render.ts`, `src/board/dragDrop.ts`, `src/style.css`)

- **Rename**: reuse the inline-edit pattern already built for the project title (`showTitleButton`/`showTitleEditor` in `render.ts`) — clicking the column label swaps it for a text input, committing on Enter/blur via `renameColumn`, reverting on Escape, showing a `.form-error`-style message on a duplicate label without a full rerender.
- **Delete / Rename entry point**: a small "⋯" dropdown per column header, reusing `createDropdownButton` (`src/ui/dropdownMenu.ts`, already used for the "Import voter list..." button) with two options, "Rename column" (focuses the inline editor) and "Delete column" (calls `deleteColumn`). On `not-empty`, show an inline message under the header — e.g. *"Move all N voters out of this column before deleting it."* — no native `confirm`/`alert`, consistent with this app's established convention of inline errors instead of browser dialogs. On `last-column`, similarly: *"A project must have at least one column."*
- **Add column**: an extra ghost `<section class="column column--add">` appended after the real columns (the board is already a `grid-auto-flow: column` grid, so this is just one more track) showing a `+ Add column` button that swaps to an inline text input + Save/Cancel, calling `addColumn`; a duplicate label shows an inline error without closing the input.
- **Reorder via drag-and-drop**: a small drag handle glyph in each column header (not the whole header, to avoid ambiguity with the existing per-voter-card dragging nested inside `column__body`), using a distinct dataTransfer MIME type (`'application/x-column-id'`) so it can't be confused with the existing voter-card drag payload (`'text/plain'`). New functions in `dragDrop.ts`:
  ```ts
  export function makeColumnDraggable(handle: HTMLElement, columnEl: HTMLElement, columnId: string): void
  export function makeBoardColumnDroppable(board: HTMLElement, projectId: string, rerender: () => void): void
  ```
  `makeBoardColumnDroppable` mirrors the existing `findInsertBeforeVoterId` pattern (`dragDrop.ts`) but horizontally — comparing `e.clientX` against each column's `rect.left + rect.width / 2` to find the insertion point — then calls `reorderColumns`. Wired once on the `.board` element itself in `render.ts`, right after the column loop.

### CSS (`src/style.css`)

Reuse existing classes/values, following the file's minimal no-comment style:
- `.column__title`, `.column__title--editable`, `.column__title-input` — copy `.board-header__title`/`--editable`/`-input` at the column header's existing smaller font size.
- `.column__header-error` — same colors as `.form-error` (`color: var(--color-danger); font-size: 0.85rem;`) but with normal top margin (it's a new row, not overlapping a form field).
- `.column__drag-handle` — `cursor: grab; opacity: 0.5;`, `:hover { opacity: 1; }`.
- `.column.column--dragging` — mirrors the existing `.voter-card.dragging` treatment.
- `.column--add` — dashed-border variant of `.column` (`border: 2px dashed var(--color-border); background: transparent;`), centered `+ Add column` button.

## Implementation

### Critical files
- `src/types.ts` — `Column`/`DEFAULT_COLUMNS`, `ColumnId` becomes `string`, drop `COLUMN_ORDER`/`COLUMN_LABELS`.
- `src/storage.ts` — `columns` field + migration/`emptyState`, `getColumns`/`addColumn`/`renameColumn`/`deleteColumn`/`reorderColumns`, `addVoter`'s hardcoded `'todo'` → first-column lookup, `deleteProject` cleanup.
- `src/detail/detailView.ts` — positional auto-move rework against `getColumns(projectId)`.
- `src/board/render.ts` — column loop reads `getColumns(project.id)`; new rename/delete/add/reorder UI.
- `src/board/dragDrop.ts` — new `makeColumnDraggable`/`makeBoardColumnDroppable`.
- `src/board/voter.ts` — `columns: Column[]` param for keyboard nav, replacing `COLUMN_ORDER` import.
- `src/export/buildExportRows.ts` + `src/export/exportVoterStatusPdf.ts` — `columns` param threaded through.
- `src/pdf/importPdf.ts` — `importRecords`'s two hardcoded `'todo'` spots → first-column lookup.

## Verification

1. **Unit tests** (`src/storage.test.ts`, following the existing `mustCreateProject` convention):
   - New project gets the 5 default columns with today's ids/labels/order; two projects' column lists are independent.
   - `addColumn`/`renameColumn`/`deleteColumn`/`reorderColumns`: success paths, case-insensitive duplicate-label rejection, `deleteColumn` blocked on `not-empty` (add a voter, assert refusal, move it out, assert deletion now succeeds) and on `last-column`, `reorderColumns` rejecting a non-permutation.
   - **Migration test**: seed raw pre-feature JSON (no `columns` key, voters with literal `'todo'`/etc. statuses) directly into the mocked `localStorage`, call `getColumns`, and assert the backfilled defaults exactly match today's `COLUMN_ORDER`/`COLUMN_LABELS` and that every existing voter's `status` still resolves to a real column — this is the test that guarantees existing users' boards don't change on upgrade.
   - `src/export/buildExportRows.test.ts`: update call sites to the new `(voters, columns)` signature; add one test with a custom, reordered/relabeled column list to prove sorting/labeling is genuinely data-driven (not a stray leftover `COLUMN_ORDER` reference).
2. `npm run typecheck` and `npx vitest run` — confirm no regressions across the whole ripple.
3. **Manual Playwright scratch-script verification** (this app's established ad hoc pattern — no formal e2e suite exists): rename a column inline; add a new column; attempt to delete a non-empty column (confirm inline error, no native dialog, nothing deleted) then move its voters out and delete it successfully; attempt to delete a project down to its last column (confirm blocked); drag-reorder two columns and confirm the board visually reorders and persists across reload; after reordering (and renaming, for good measure), confirm the positional auto-move behaviors follow the *new* position 0/1/2 regardless of label — opening a card in position 0 advances it to position 1, "Done" in position 1 advances to position 2, "Next voter" from position 0/1 pulls a fresh position-0 voter into position 1.
