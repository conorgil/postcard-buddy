import { openDetailView } from '../detail/detailView';
import { openCardForm } from '../forms/cardForm';
import { deleteCard, moveCard } from '../storage';
import { COLUMN_ORDER, type Card } from '../types';
import { makeCardDraggable } from './dragDrop';

export function createCardElement(card: Card, projectId: string, rerender: () => void): HTMLElement {
  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.dataset.cardId = card.id;
  el.setAttribute('aria-label', `${card.name}, ${card.street}, ${card.city}, ${card.state} ${card.zip}`);

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
      rerender();
    }
  });

  controls.append(editBtn, deleteBtn);
  el.append(name, addr, controls);

  el.addEventListener('click', () => openDetailView(card, rerender));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetailView(card, rerender);
      return;
    }
    const currentIndex = COLUMN_ORDER.indexOf(card.status);
    if (e.key === 'ArrowRight' && currentIndex < COLUMN_ORDER.length - 1) {
      e.preventDefault();
      moveCard(card.id, COLUMN_ORDER[currentIndex + 1], null);
      rerender();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      moveCard(card.id, COLUMN_ORDER[currentIndex - 1], null);
      rerender();
    }
  });

  makeCardDraggable(el, card);

  return el;
}
