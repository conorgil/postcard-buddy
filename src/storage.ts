import type { Card, ColumnId, Project, StoredState } from './types';

const STORAGE_KEY = 'hello-fellow-voter:v1';

function emptyState(): StoredState {
  return { version: 1, projects: [], activeProjectId: null, cards: [] };
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

export function createProject(name: string): Project {
  const state = loadState();
  const project: Project = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  state.projects.push(project);
  state.activeProjectId = project.id;
  saveState(state);
  return project;
}

export function renameProject(id: string, name: string): void {
  const state = loadState();
  const project = state.projects.find((p) => p.id === id);
  if (!project) return;
  project.name = name.trim();
  saveState(state);
}

export function deleteProject(id: string): void {
  const state = loadState();
  state.projects = state.projects.filter((p) => p.id !== id);
  state.cards = state.cards.filter((c) => c.projectId !== id);
  if (state.activeProjectId === id) state.activeProjectId = null;
  saveState(state);
}

// --- Cards ---

export function getCardsForProject(projectId: string): Card[] {
  return loadState().cards.filter((c) => c.projectId === projectId);
}

function nextOrderInColumn(cards: Card[], projectId: string, status: ColumnId): number {
  const columnCards = cards.filter((c) => c.projectId === projectId && c.status === status);
  return columnCards.length === 0 ? 0 : Math.max(...columnCards.map((c) => c.order)) + 1;
}

export interface NewCardInput {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export function addCard(projectId: string, input: NewCardInput): Card {
  const state = loadState();
  const card: Card = {
    id: crypto.randomUUID(),
    projectId,
    name: input.name.trim(),
    street: input.street.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    zip: input.zip.trim(),
    status: 'todo',
    order: nextOrderInColumn(state.cards, projectId, 'todo'),
    createdAt: new Date().toISOString(),
  };
  state.cards.push(card);
  saveState(state);
  return card;
}

/** Bulk-append pre-built cards (used by PDF import) in a single load/save cycle. */
export function addCards(cards: Card[]): void {
  if (cards.length === 0) return;
  const state = loadState();
  state.cards.push(...cards);
  saveState(state);
}

export function updateCard(id: string, patch: NewCardInput): void {
  const state = loadState();
  const card = state.cards.find((c) => c.id === id);
  if (!card) return;
  card.name = patch.name.trim();
  card.street = patch.street.trim();
  card.city = patch.city.trim();
  card.state = patch.state.trim();
  card.zip = patch.zip.trim();
  saveState(state);
}

export function deleteCard(id: string): void {
  const state = loadState();
  state.cards = state.cards.filter((c) => c.id !== id);
  saveState(state);
}

/** Moves a card to a new column, optionally inserting before another card in that column. */
export function moveCard(cardId: string, newStatus: ColumnId, insertBeforeCardId: string | null): void {
  const state = loadState();
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) return;

  card.status = newStatus;

  const columnCards = state.cards
    .filter((c) => c.projectId === card.projectId && c.status === newStatus && c.id !== cardId)
    .sort((a, b) => a.order - b.order);

  const insertIndex = insertBeforeCardId
    ? columnCards.findIndex((c) => c.id === insertBeforeCardId)
    : -1;

  if (insertIndex === -1) {
    columnCards.push(card);
  } else {
    columnCards.splice(insertIndex, 0, card);
  }

  columnCards.forEach((c, i) => {
    c.order = i;
  });

  saveState(state);
}

/** Moves multiple cards to a new column in one load/save cycle, preserving their relative order. */
export function moveCards(cardIds: string[], newStatus: ColumnId): void {
  const state = loadState();
  const idSet = new Set(cardIds);
  const movingCards = state.cards.filter((c) => idSet.has(c.id));
  if (movingCards.length === 0) return;

  const projectId = movingCards[0].projectId;
  const existingColumnCards = state.cards
    .filter((c) => c.projectId === projectId && c.status === newStatus && !idSet.has(c.id))
    .sort((a, b) => a.order - b.order);

  for (const card of movingCards) {
    card.status = newStatus;
  }

  [...existingColumnCards, ...movingCards].forEach((c, i) => {
    c.order = i;
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
