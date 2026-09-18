import { openDetailView } from '../detail/detailView';
import { openCardForm } from '../forms/cardForm';
import { deleteCard, moveCard, moveCards } from '../storage';
import { COLUMN_ORDER, type Card } from '../types';
import { makeCardDraggable } from './dragDrop';
import {
  clearSelection,
  getSelectedCount,
  getSelectedIds,
  isSelected,
  removeFromSelection,
  selectRange,
  toggleSelect,
} from './selection';

export function createCardElement(
  card: Card,
  projectId: string,
  columnCardIds: string[],
  rerender: () => void,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'card';
  if (isSelected(card.id)) el.classList.add('card--selected');
  el.draggable = true;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.dataset.cardId = card.id;
  el.setAttribute('aria-label', `${card.name}, ${card.street}, ${card.city}, ${card.state} ${card.zip}`);

  const select = document.createElement('input');
  select.type = 'checkbox';
  select.className = 'card__select';
  select.checked = isSelected(card.id);
  select.setAttribute('aria-label', `Select ${card.name}`);
  select.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if ((e as MouseEvent).shiftKey) {
      selectRange(columnCardIds, card.id);
    } else {
      toggleSelect(card.id);
    }
    rerender();
  });

  const name = document.createElement('div');
  name.className = 'card__name';
  name.textContent = card.name;

  const addr = document.createElement('div');
  addr.className = 'card__address';
  addr.textContent = `${card.street}, ${card.city}, ${card.state} ${card.zip}`;

  const controls = document.createElement('div');
  controls.className = 'card__controls';

  const editBtn = document.createElement('button');
  editBtn.className = 'card__icon-btn';
  editBtn.setAttribute('aria-label', 'Edit card');
  editBtn.textContent = '✎';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openCardForm(projectId, rerender, card);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card__icon-btn';
  deleteBtn.setAttribute('aria-label', 'Delete card');
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Delete the card for ${card.name}?`)) {
      deleteCard(card.id);
      removeFromSelection(card.id);
      rerender();
    }
  });

  controls.append(editBtn, deleteBtn);
  el.append(select, name, addr, controls);

  el.addEventListener('click', (e) => {
    if (e.shiftKey) {
      selectRange(columnCardIds, card.id);
      rerender();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      toggleSelect(card.id);
      rerender();
      return;
    }
    openDetailView(card, projectId, rerender);
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetailView(card, projectId, rerender);
      return;
    }
    const currentIndex = COLUMN_ORDER.indexOf(card.status);
    const movingSelection = isSelected(card.id) && getSelectedCount() > 1;
    if (e.key === 'ArrowRight' && currentIndex < COLUMN_ORDER.length - 1) {
      e.preventDefault();
      const target = COLUMN_ORDER[currentIndex + 1];
      if (movingSelection) {
        moveCards(getSelectedIds(), target);
        clearSelection();
      } else {
        moveCard(card.id, target, null);
      }
      rerender();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      const target = COLUMN_ORDER[currentIndex - 1];
      if (movingSelection) {
        moveCards(getSelectedIds(), target);
        clearSelection();
      } else {
        moveCard(card.id, target, null);
      }
      rerender();
    }
  });

  makeCardDraggable(el, card);

  return el;
}
