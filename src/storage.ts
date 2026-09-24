import type { Column, ColumnId, Project, StoredState, Voter } from './types';
import { DEFAULT_COLUMNS } from './types';

const STORAGE_KEY = 'hello-fellow-voter:v1';

function cloneDefaultColumns(): Column[] {
  return DEFAULT_COLUMNS.map((c) => ({ ...c }));
}

function emptyState(): StoredState {
  return { version: 1, projects: [], activeProjectId: null, voters: [], suspectQueues: {}, columns: {} };
}

function loadState(): StoredState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) {
      console.warn('hello-fellow-voter: unknown storage version, resetting state');
      return emptyState();
    }
    // Older stored state predates the suspect-address review queue.
    if (!parsed.suspectQueues) parsed.suspectQueues = {};
    // Older stored state kept voters under the field name "cards".
    if (!parsed.voters && Array.isArray(parsed.cards)) {
      parsed.voters = parsed.cards;
      delete parsed.cards;
    }
    if (!parsed.voters) parsed.voters = [];
    // Older stored state predates customizable columns; backfill the same defaults every board used to show.
    if (!parsed.columns) parsed.columns = {};
    for (const project of parsed.projects ?? []) {
      if (!parsed.columns[project.id]) {
        parsed.columns[project.id] = cloneDefaultColumns();
      }
    }
    return parsed as StoredState;
  } catch (err) {
    console.warn('hello-fellow-voter: failed to parse stored state, resetting', err);
    return emptyState();
  }
}

function persistState(state: StoredState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const MAX_UNDO_HISTORY = 50;
const undoHistory: string[] = [];
const redoHistory: string[] = [];

/** Persists a data-changing mutation, snapshotting the prior state so it can be undone. */
function saveState(state: StoredState): void {
  const previousRaw = localStorage.getItem(STORAGE_KEY);
  if (previousRaw !== null) {
    undoHistory.push(previousRaw);
    if (undoHistory.length > MAX_UNDO_HISTORY) undoHistory.shift();
  }
  redoHistory.length = 0;
  persistState(state);
}

export function canUndo(): boolean {
  return undoHistory.length > 0;
}

export function canRedo(): boolean {
  return redoHistory.length > 0;
}

/** Restores the most recent pre-mutation snapshot, if any. */
export function undo(): boolean {
  const previousRaw = undoHistory.pop();
  if (previousRaw === undefined) return false;
  const currentRaw = localStorage.getItem(STORAGE_KEY);
  if (currentRaw !== null) redoHistory.push(currentRaw);
  localStorage.setItem(STORAGE_KEY, previousRaw);
  return true;
}

/** Re-applies the most recently undone snapshot, if any. */
export function redo(): boolean {
  const nextRaw = redoHistory.pop();
  if (nextRaw === undefined) return false;
  const currentRaw = localStorage.getItem(STORAGE_KEY);
  if (currentRaw !== null) undoHistory.push(currentRaw);
  localStorage.setItem(STORAGE_KEY, nextRaw);
  return true;
}

export function getState(): StoredState {
  return loadState();
}

// --- Projects ---

export function getProjects(): Project[] {
  return loadState().projects;
}

export function getActiveProject(): Project | null {
  const state = loadState();
  return state.projects.find((p) => p.id === state.activeProjectId) ?? null;
}

export function setActiveProject(id: string | null): void {
  const state = loadState();
  state.activeProjectId = id;
  persistState(state);
}

function isDuplicateProjectName(projects: Project[], name: string, excludeId?: string): boolean {
  const key = name.trim().toLowerCase();
  return projects.some((p) => p.id !== excludeId && p.name.trim().toLowerCase() === key);
}

/** Returns null if a project with this name (case-insensitive) already exists — project names must be unique. */
export function createProject(name: string): Project | null {
  const state = loadState();
  if (isDuplicateProjectName(state.projects, name)) return null;
  const project: Project = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  state.projects.push(project);
  state.activeProjectId = project.id;
  state.columns[project.id] = cloneDefaultColumns();
  saveState(state);
  return project;
}

/** Returns false if the project doesn't exist or another project already has this name (case-insensitive). */
export function renameProject(id: string, name: string): boolean {
  const state = loadState();
  const project = state.projects.find((p) => p.id === id);
  if (!project) return false;
  if (isDuplicateProjectName(state.projects, name, id)) return false;
  project.name = name.trim();
  saveState(state);
  return true;
}

export function deleteProject(id: string): void {
  const state = loadState();
  state.projects = state.projects.filter((p) => p.id !== id);
  state.voters = state.voters.filter((v) => v.projectId !== id);
  if (state.activeProjectId === id) state.activeProjectId = null;
  delete state.columns[id];
  delete state.suspectQueues[id];
  saveState(state);
}

// --- Columns ---

export function getColumns(projectId: string): Column[] {
  return loadState().columns[projectId] ?? [];
}

function isDuplicateColumnLabel(columns: Column[], label: string, excludeId?: string): boolean {
  const key = label.trim().toLowerCase();
  return columns.some((c) => c.id !== excludeId && c.label.trim().toLowerCase() === key);
}

/** Returns null if a column with this label (case-insensitive) already exists in the project. */
export function addColumn(projectId: string, label: string): Column | null {
  const state = loadState();
  const columns = state.columns[projectId] ?? [];
  if (isDuplicateColumnLabel(columns, label)) return null;
  const column: Column = { id: crypto.randomUUID(), label: label.trim() };
  state.columns[projectId] = [...columns, column];
  saveState(state);
  return column;
}

/** Returns false if the column doesn't exist or another column in the project already has this label. */
export function renameColumn(projectId: string, columnId: string, label: string): boolean {
  const state = loadState();
  const columns = state.columns[projectId] ?? [];
  const column = columns.find((c) => c.id === columnId);
  if (!column) return false;
  if (isDuplicateColumnLabel(columns, label, columnId)) return false;
  column.label = label.trim();
  saveState(state);
  return true;
}

export type DeleteColumnResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'last-column' }
  | { ok: false; reason: 'not-empty'; voterCount: number };

/** Refuses to delete the project's last remaining column, or a column that still has voters in it. */
export function deleteColumn(projectId: string, columnId: string): DeleteColumnResult {
  const state = loadState();
  const columns = state.columns[projectId] ?? [];
  const column = columns.find((c) => c.id === columnId);
  if (!column) return { ok: false, reason: 'not-found' };
  if (columns.length <= 1) return { ok: false, reason: 'last-column' };
  const voterCount = state.voters.filter((v) => v.projectId === projectId && v.status === columnId).length;
  if (voterCount > 0) return { ok: false, reason: 'not-empty', voterCount };
  state.columns[projectId] = columns.filter((c) => c.id !== columnId);
  saveState(state);
  return { ok: true };
}

/** Reorders a project's columns; newOrderOfIds must be a permutation of its current column ids. */
export function reorderColumns(projectId: string, newOrderOfIds: string[]): boolean {
  const state = loadState();
  const columns = state.columns[projectId] ?? [];
  if (newOrderOfIds.length !== columns.length) return false;
  const byId = new Map(columns.map((c) => [c.id, c]));
  const reordered: Column[] = [];
  for (const id of newOrderOfIds) {
    const column = byId.get(id);
    if (!column) return false;
    reordered.push(column);
  }
  state.columns[projectId] = reordered;
  saveState(state);
  return true;
}

// --- Voters ---

export function getVotersForProject(projectId: string): Voter[] {
  return loadState().voters.filter((v) => v.projectId === projectId);
}

function nextOrderInColumn(voters: Voter[], projectId: string, status: ColumnId): number {
  const columnVoters = voters.filter((v) => v.projectId === projectId && v.status === status);
  return columnVoters.length === 0 ? 0 : Math.max(...columnVoters.map((v) => v.order)) + 1;
}

export interface NewVoterInput {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export function addVoter(projectId: string, input: NewVoterInput): Voter {
  const state = loadState();
  const firstColumnId = state.columns[projectId]?.[0]?.id ?? '';
  const voter: Voter = {
    id: crypto.randomUUID(),
    projectId,
    name: input.name.trim(),
    street: input.street.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    zip: input.zip.trim(),
    status: firstColumnId,
    order: nextOrderInColumn(state.voters, projectId, firstColumnId),
    createdAt: new Date().toISOString(),
  };
  state.voters.push(voter);
  saveState(state);
  return voter;
}

/** Bulk-append pre-built voters (used by PDF import) in a single load/save cycle. */
export function addVoters(voters: Voter[]): void {
  if (voters.length === 0) return;
  const state = loadState();
  state.voters.push(...voters);
  saveState(state);
}

export function updateVoter(id: string, patch: NewVoterInput): void {
  const state = loadState();
  const voter = state.voters.find((v) => v.id === id);
  if (!voter) return;
  voter.name = patch.name.trim();
  voter.street = patch.street.trim();
  voter.city = patch.city.trim();
  voter.state = patch.state.trim();
  voter.zip = patch.zip.trim();
  saveState(state);
}

export function deleteVoter(id: string): void {
  const state = loadState();
  state.voters = state.voters.filter((v) => v.id !== id);
  saveState(state);
}

/** Moves a voter to a new column, optionally inserting before another voter in that column. */
export function moveVoter(voterId: string, newStatus: ColumnId, insertBeforeVoterId: string | null): void {
  const state = loadState();
  const voter = state.voters.find((v) => v.id === voterId);
  if (!voter) return;

  voter.status = newStatus;

  const columnVoters = state.voters
    .filter((v) => v.projectId === voter.projectId && v.status === newStatus && v.id !== voterId)
    .sort((a, b) => a.order - b.order);

  const insertIndex = insertBeforeVoterId
    ? columnVoters.findIndex((v) => v.id === insertBeforeVoterId)
    : -1;

  if (insertIndex === -1) {
    columnVoters.push(voter);
  } else {
    columnVoters.splice(insertIndex, 0, voter);
  }

  columnVoters.forEach((v, i) => {
    v.order = i;
  });

  saveState(state);
}

/** Moves multiple voters to a new column in one load/save cycle, preserving their relative order. */
export function moveVoters(voterIds: string[], newStatus: ColumnId): void {
  const state = loadState();
  const idSet = new Set(voterIds);
  const movingVoters = state.voters.filter((v) => idSet.has(v.id));
  if (movingVoters.length === 0) return;

  const projectId = movingVoters[0].projectId;
  const existingColumnVoters = state.voters
    .filter((v) => v.projectId === projectId && v.status === newStatus && !idSet.has(v.id))
    .sort((a, b) => a.order - b.order);

  for (const voter of movingVoters) {
    voter.status = newStatus;
  }

  [...existingColumnVoters, ...movingVoters].forEach((v, i) => {
    v.order = i;
  });

  saveState(state);
}

// --- Dedupe (scoped per-project, used only during PDF import) ---

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function dedupeKey(
  projectId: string,
  name: string,
  street: string,
  city: string,
  state: string,
  zip: string,
): string {
  const zip5 = zip.slice(0, 5);
  return `${projectId}|${normalize(name)}|${normalize(street)}|${normalize(city)}|${normalize(state)}|${zip5}`;
}

// --- Suspected-address review queue (per-project, ephemeral import review aid) ---

export function getSuspectQueue(projectId: string): string[] {
  return loadState().suspectQueues[projectId] ?? [];
}

/** Appends newly-found suspect lines to a project's review queue, skipping exact duplicates already queued. */
export function addToSuspectQueue(projectId: string, lines: string[]): void {
  if (lines.length === 0) return;
  const state = loadState();
  const existing = state.suspectQueues[projectId] ?? [];
  const existingSet = new Set(existing);
  const additions = lines.filter((line) => !existingSet.has(line));
  if (additions.length === 0) return;
  state.suspectQueues[projectId] = [...existing, ...additions];
  saveState(state);
}

/** Removes one resolved line (added as a card, or discarded) from a project's review queue. */
export function removeFromSuspectQueue(projectId: string, line: string): void {
  const state = loadState();
  const existing = state.suspectQueues[projectId];
  if (!existing) return;
  state.suspectQueues[projectId] = existing.filter((l) => l !== line);
  saveState(state);
}

/** Empties a project's review queue in one write, e.g. after a bulk "add all"/"discard all" action. */
export function clearSuspectQueue(projectId: string): void {
  const state = loadState();
  if (!state.suspectQueues[projectId]?.length) return;
  state.suspectQueues[projectId] = [];
  saveState(state);
}
