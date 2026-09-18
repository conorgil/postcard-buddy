import { moveCard, moveCards } from '../storage';
import type { Card, ColumnId } from '../types';
import { clearSelection, getSelectedCount, getSelectedIds, isSelected } from './selection';

function createGroupDragPreview(count: number): HTMLElement {
  const preview = document.createElement('div');
  preview.className = 'drag-group-preview';
  preview.textContent = `Group of ${count} voters`;
  document.body.appendChild(preview);
  return preview;
}

export function makeCardDraggable(el: HTMLElement, card: Card): void {
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('text/plain', card.id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');

    const selectedCount = getSelectedCount();
    if (e.dataTransfer && isSelected(card.id) && selectedCount > 1) {
      const preview = createGroupDragPreview(selectedCount);
      e.dataTransfer.setDragImage(preview, preview.offsetWidth / 2, preview.offsetHeight / 2);
      setTimeout(() => preview.remove(), 0);
    }
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
}

function findInsertBeforeId(columnBody: HTMLElement, clientY: number): string | null {
  const cardEls = [...columnBody.querySelectorAll<HTMLElement>('.card')];
  for (const cardEl of cardEls) {
    const rect = cardEl.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return cardEl.dataset.cardId ?? null;
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
    const cardId = e.dataTransfer?.getData('text/plain');
    if (!cardId) return;
    if (isSelected(cardId) && getSelectedCount() > 1) {
      moveCards(getSelectedIds(), columnId);
      clearSelection();
    } else {
      const insertBeforeId = findInsertBeforeId(columnBody, e.clientY);
      moveCard(cardId, columnId, insertBeforeId);
    }
    rerender();
  });
}
