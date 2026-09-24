import { getColumns, moveVoter, moveVoters, reorderColumns } from '../storage';
import type { ColumnId, Voter } from '../types';
import { clearSelection, getSelectedCount, getSelectedIds, isSelected } from './selection';

const COLUMN_DRAG_MIME = 'application/x-column-id';

function createGroupDragPreview(count: number): HTMLElement {
  const preview = document.createElement('div');
  preview.className = 'drag-group-preview';
  preview.textContent = `Group of ${count} voters`;
  document.body.appendChild(preview);
  return preview;
}

export function makeVoterDraggable(el: HTMLElement, voter: Voter): void {
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('text/plain', voter.id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');

    const selectedCount = getSelectedCount();
    if (e.dataTransfer && isSelected(voter.id) && selectedCount > 1) {
      const preview = createGroupDragPreview(selectedCount);
      e.dataTransfer.setDragImage(preview, preview.offsetWidth / 2, preview.offsetHeight / 2);
      setTimeout(() => preview.remove(), 0);
    }
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
}

function findInsertBeforeVoterId(columnBody: HTMLElement, clientY: number): string | null {
  const voterEls = [...columnBody.querySelectorAll<HTMLElement>('.voter-card')];
  for (const voterEl of voterEls) {
    const rect = voterEl.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return voterEl.dataset.voterId ?? null;
    }
  }
  return null;
}

export function makeColumnDroppable(columnBody: HTMLElement, columnId: ColumnId, rerender: () => void): void {
  columnBody.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  });

  columnBody.addEventListener('drop', (e) => {
    e.preventDefault();
    const voterId = e.dataTransfer?.getData('text/plain');
    if (!voterId) return;
    if (isSelected(voterId) && getSelectedCount() > 1) {
      moveVoters(getSelectedIds(), columnId);
      clearSelection();
    } else {
      const insertBeforeId = findInsertBeforeVoterId(columnBody, e.clientY);
      moveVoter(voterId, columnId, insertBeforeId);
    }
    rerender();
  });
}

export function makeColumnDraggable(handle: HTMLElement, columnEl: HTMLElement, columnId: string, rerender: () => void): void {
  handle.draggable = true;
  handle.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData(COLUMN_DRAG_MIME, columnId);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    columnEl.classList.add('column--dragging');
  });
  // Always rerenders, whether or not a 'drop' persisted a change — this snaps the live-dragged
  // DOM position (see makeBoardColumnDroppable) back in sync with the actual stored column order.
  handle.addEventListener('dragend', () => {
    columnEl.classList.remove('column--dragging');
    rerender();
  });
}

function findInsertBeforeColumnId(board: HTMLElement, clientX: number, draggedId: string): string | null {
  const columnEls = [...board.querySelectorAll<HTMLElement>('.column:not(.column--add)')].filter(
    (el) => el.dataset.columnId !== draggedId,
  );
  for (const columnEl of columnEls) {
    const rect = columnEl.getBoundingClientRect();
    if (clientX < rect.left + rect.width / 2) {
      return columnEl.dataset.columnId ?? null;
    }
  }
  return null;
}

/**
 * Mirrors GitHub Projects' column drag: the dragged column itself stays put (dimmed, via
 * .column--dragging) and a blue line marks where it would land. The line is only redrawn when the
 * drag crosses into a new slot (tracked via lastInsertBeforeId), not on every dragover event, and
 * it's hidden entirely for the slots immediately adjacent to the dragged column's own position,
 * since dropping there wouldn't actually change the order.
 */
export function makeBoardColumnDroppable(board: HTMLElement, projectId: string): void {
  let lastInsertBeforeId: string | null | undefined;
  let indicator: HTMLElement | null = null;

  function hideIndicator(): void {
    indicator?.remove();
    indicator = null;
  }

  function showIndicatorBefore(targetEl: HTMLElement): void {
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'column-drop-indicator';
      board.appendChild(indicator);
    }
    const gap = parseFloat(getComputedStyle(board).columnGap) || 0;
    indicator.style.left = `${targetEl.offsetLeft - gap / 2 - 1.5}px`;
  }

  board.addEventListener('dragover', (e) => {
    if (!e.dataTransfer?.types.includes(COLUMN_DRAG_MIME)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

    const draggedEl = board.querySelector<HTMLElement>('.column--dragging');
    if (!draggedEl) return;
    const draggedId = draggedEl.dataset.columnId ?? '';
    const insertBeforeId = findInsertBeforeColumnId(board, e.clientX, draggedId);
    if (insertBeforeId === lastInsertBeforeId) return;
    lastInsertBeforeId = insertBeforeId;

    const columnEls = [...board.querySelectorAll<HTMLElement>('.column:not(.column--add)')];
    const draggedIndex = columnEls.findIndex((el) => el.dataset.columnId === draggedId);
    const targetIndex = insertBeforeId
      ? columnEls.findIndex((el) => el.dataset.columnId === insertBeforeId)
      : columnEls.length;

    if (targetIndex === draggedIndex || targetIndex === draggedIndex + 1) {
      hideIndicator();
      return;
    }

    const targetEl = insertBeforeId
      ? board.querySelector<HTMLElement>(`.column[data-column-id="${insertBeforeId}"]`)
      : board.querySelector<HTMLElement>('.column--add');
    if (targetEl) showIndicatorBefore(targetEl);
  });

  board.addEventListener('drop', (e) => {
    e.preventDefault();
    lastInsertBeforeId = undefined;
    hideIndicator();
    const draggedId = e.dataTransfer?.getData(COLUMN_DRAG_MIME);
    if (!draggedId) return;

    const insertBeforeId = findInsertBeforeColumnId(board, e.clientX, draggedId);
    const currentIds = getColumns(projectId).map((c) => c.id);
    const withoutDragged = currentIds.filter((id) => id !== draggedId);
    const insertAt = insertBeforeId ? withoutDragged.indexOf(insertBeforeId) : withoutDragged.length;
    const newOrder = [...withoutDragged.slice(0, insertAt), draggedId, ...withoutDragged.slice(insertAt)];
    if (newOrder.join() === currentIds.join()) return;
    reorderColumns(projectId, newOrder);
  });
}
