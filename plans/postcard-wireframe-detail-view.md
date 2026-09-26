# Wireframe postcard back for the voter detail view

## Context

Conor's mom got confused opening a voter's address view: she didn't know whether to write her message on the side with the address or the blank side, because she'd never mailed a postcard before. Conor suspects this is common — many people, especially younger ones, may never have mailed anything by post at all. The detail view currently just shows the recipient's name/address as giant centered text (`src/detail/detailView.ts`, `.postcard-address`/`.postcard-address__line` in `src/style.css`) with no visual reference to an actual postcard. The fix: redraw that view as a wireframe line-drawing of a real postcard's back side, so the layout itself teaches the user where things go — address in the address spot, a placeholder message in the message spot, and a fake stamp in the stamp spot.

Decided with Conor (via AskUserQuestion): build it as a **hybrid** — the overall card layout (border, vertical divider, message area, address block) stays plain CSS/DOM, matching the rest of this app (which uses zero SVG anywhere today), and only the fake stamp is a small inline SVG (dashed/perforated-look border + a simple icon), since a stamp's perforated edge is fiddly to fake convincingly with CSS borders alone.

## Design

Real USPS-style postcard backs share one universal layout, which is what makes them legible without instructions: a vertical line splits the card into a **wider left message area** and a **narrower right area** that stacks a **stamp box (top-right corner)** above the **recipient address (lower-right)**. Mirroring that exactly is the whole point — no invented layout.

### Structure (`src/detail/detailView.ts`)

Replace the current single `.postcard-address` block with:
```
.postcard                          (the card itself — border, aspect-ratio 3/2)
  .postcard__message                (left column)
    .postcard__message-placeholder  "Your message goes here!"
    .postcard__rule-line × 4-5       faint horizontal lines, like ruled paper
  .postcard__divider                (vertical line between columns — can just be a border-left on the right column)
  .postcard__right                  (right column, flex column)
    .postcard__stamp                 (top-right, fixed corner) — contains the inline SVG
    .postcard-address                (existing element/class, now anchored lower-right instead of centered across the whole panel)
      .postcard-address__line × 3    (unchanged — reuse `shrinkLinesToFit` as-is)
```
This is a layout change only — `voter.name`/`street`/`city,state,zip` still populate the same three `.postcard-address__line` elements the same way, and `shrinkLinesToFit(lines)` (already in `detailView.ts`) is called unchanged. It adapts to whatever container width it's given, so no logic change is needed there, only the CSS around it.

### Stamp (inline SVG, in `detailView.ts`)

A small self-contained `<svg>` built once (e.g. a `createStampSvg()` helper in `detailView.ts`, since this app has no dedicated icon/asset module to put it in instead): a rect with `stroke-dasharray` for the perforated edge, and one simple icon inside (a 5-point star or a plain flag glyph) using `currentColor`/`var(--color-border)` so it stays monochrome and matches the wireframe aesthetic — no photographic stamp, no color.

### CSS (`src/style.css`)

- `.postcard`: `aspect-ratio: 3 / 2`, `border: 2px solid var(--color-border)`, `border-radius: 6px`, `display: flex`, sized to fill the available space in `.detail-panel` (replacing `.postcard-address`'s current `flex: 1`).
- `.postcard__message`: ~60% width, padding, muted-grey italic placeholder text, `.postcard__rule-line` as thin `border-bottom: 1px solid var(--color-border)` elements (or one `repeating-linear-gradient` background) spaced like ruled paper.
- `.postcard__right`: ~40% width, `border-left: 2px solid var(--color-border)` (this is the divider), `display: flex; flex-direction: column;`, stamp pinned top-right via `align-self: flex-end` or `margin-left: auto`, address block taking the remaining space lower down (was `justify-content: center` across the whole panel — now scoped to just this narrower column).
- `.postcard-address__line`: the existing `clamp(2rem, 5vw, 4.5rem)` font sizing was tuned for a full-panel-width block of text; it needs to shrink significantly now that the address lives in a ~40%-width column — retune by eye during manual verification (this is the one value that can't be nailed down analytically, since it depends on the actual rendered column width).
- `.postcard__stamp` / its `svg`: small fixed size (e.g. `56px` square), `color: var(--color-border)` for the SVG strokes to pick up via `currentColor`.

## Implementation

### Critical files
- `src/detail/detailView.ts` — rebuild the markup inside `openDetailView` per the structure above; add the `createStampSvg()` helper; `shrinkLinesToFit` call and the three address-line elements stay as they are today, just reparented.
- `src/style.css` — new `.postcard`/`.postcard__*` rules; retune `.postcard-address__line`'s clamp() now that its column is much narrower.

### Out of scope
- No changes to `src/export/exportVoterStatusPdf.ts` or any PDF output — this is only the on-screen detail-view modal, not a printable artifact.
- No new dependency/asset pipeline for the SVG — it's authored inline as a DOM `SVGElement`, consistent with how every other element in this file is built (`document.createElement`), not loaded from a file.

## Verification

1. `npm run typecheck` and `npx vitest run` — this is a presentational change with no new branching logic, so no new unit tests are expected, but the full suite must stay green (existing tests don't touch `detailView.ts`'s DOM structure directly, so no test updates are anticipated — confirm this holds once the change is made).
2. **Manual Playwright scratch-script verification** (this app's established pattern): open a voter's detail view and confirm, via DOM queries and a screenshot: the address lines render inside `.postcard__right`/`.postcard-address` (right side), the "Your message goes here!" placeholder renders inside `.postcard__message` (left side), the stamp SVG renders top-right within `.postcard__right`, and a long name/address still fits on one line per `shrinkLinesToFit` (no overflow) in the narrower column. Visually eyeball the screenshot for overall postcard-likeness and retune the address font clamp() if it looks oversized or too small for the new column width.
3. Manually re-check the existing auto-move-on-open and "Done"/"Next voter" behaviors still work unchanged (this task doesn't touch that logic, but the markup it's called within is being rebuilt, so a quick regression pass is warranted).
