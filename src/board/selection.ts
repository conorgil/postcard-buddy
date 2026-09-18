let selectedIds = new Set<string>();
let anchorId: string | null = null;

export function isSelected(id: string): boolean {
  return selectedIds.has(id);
}

export function getSelectedIds(): string[] {
  return [...selectedIds];
}

export function getSelectedCount(): number {
  return selectedIds.size;
}

export function toggleSelect(id: string): void {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
  anchorId = id;
}

export function selectRange(orderedColumnIds: string[], toId: string): void {
  const anchorIndex = anchorId ? orderedColumnIds.indexOf(anchorId) : -1;
  const toIndex = orderedColumnIds.indexOf(toId);
  if (anchorIndex === -1 || toIndex === -1) {
    toggleSelect(toId);
    return;
  }
  const [start, end] = anchorIndex <= toIndex ? [anchorIndex, toIndex] : [toIndex, anchorIndex];
  for (let i = start; i <= end; i++) {
    selectedIds.add(orderedColumnIds[i]);
  }
}

export function toggleSelectAllInColumn(columnIds: string[]): void {
  const allSelected = columnIds.length > 0 && columnIds.every((id) => selectedIds.has(id));
  if (allSelected) {
    for (const id of columnIds) selectedIds.delete(id);
  } else {
    for (const id of columnIds) selectedIds.add(id);
  }
}

export function removeFromSelection(id: string): void {
  selectedIds.delete(id);
  if (anchorId === id) anchorId = null;
}

export function clearSelection(): void {
  selectedIds.clear();
  anchorId = null;
}
