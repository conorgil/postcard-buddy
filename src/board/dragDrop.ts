import { moveCard } from '../storage';
import type { Card, ColumnId } from '../types';

export function makeCardDraggable(el: HTMLElement, card: Card): void {
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('text/plain', card.id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
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
    const insertBeforeId = findInsertBeforeId(columnBody, e.clientY);
    moveCard(cardId, columnId, insertBeforeId);
    rerender();
  });
}
