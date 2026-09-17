export type ColumnId = 'todo' | 'writing' | 'written' | 'stamped' | 'mailed';

export const COLUMN_ORDER: ColumnId[] = ['todo', 'writing', 'written', 'stamped', 'mailed'];

export const COLUMN_LABELS: Record<ColumnId, string> = {
  todo: 'TODO',
  writing: 'Writing',
  written: 'Written',
  stamped: 'Stamp Applied',
  mailed: 'Mailed',
};

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface Card {
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
  cards: Card[];
}
