export type ColumnId = string;

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

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface Voter {
  id: string;
  projectId: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  status: ColumnId;
  order: number;
  createdAt: string;
}

export interface StoredState {
  version: 1;
  projects: Project[];
  activeProjectId: string | null;
  voters: Voter[];
  /** Lines from a PDF/paste import that might be addresses but couldn't be parsed automatically, awaiting manual review. */
  suspectQueues: Record<string, string[]>;
  columns: Record<string, Column[]>;
}
