import { openDetailView } from '../detail/detailView';
import { openVoterForm } from '../forms/voterForm';
import { deleteVoter, moveVoter, moveVoters } from '../storage';
import type { Column, Voter } from '../types';
import { makeVoterDraggable } from './dragDrop';
import {
  clearSelection,
  getSelectedCount,
  getSelectedIds,
  isSelected,
  removeFromSelection,
  selectRange,
  toggleSelect,
} from './selection';

export function createVoterElement(
  voter: Voter,
  projectId: string,
  columnVoterIds: string[],
  columns: Column[],
  rerender: () => void,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'voter-card';
  if (isSelected(voter.id)) el.classList.add('voter-card--selected');
  el.draggable = true;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.dataset.voterId = voter.id;
  el.setAttribute('aria-label', `${voter.name}, ${voter.street}, ${voter.city}, ${voter.state} ${voter.zip}`);

  const select = document.createElement('input');
  select.type = 'checkbox';
  select.className = 'voter-card__select';
  select.checked = isSelected(voter.id);
  select.setAttribute('aria-label', `Select ${voter.name}`);
  select.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if ((e as MouseEvent).shiftKey) {
      selectRange(columnVoterIds, voter.id);
    } else {
      toggleSelect(voter.id);
    }
    rerender();
  });

  const name = document.createElement('div');
  name.className = 'voter-card__name';
  name.textContent = voter.name;

  const addr = document.createElement('div');
  addr.className = 'voter-card__address';
  addr.textContent = `${voter.street}, ${voter.city}, ${voter.state} ${voter.zip}`;

  const controls = document.createElement('div');
  controls.className = 'voter-card__controls';

  const editBtn = document.createElement('button');
  editBtn.className = 'voter-card__icon-btn';
  editBtn.setAttribute('aria-label', 'Edit voter');
  editBtn.textContent = '✎';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openVoterForm(projectId, rerender, voter);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'voter-card__icon-btn';
  deleteBtn.setAttribute('aria-label', 'Delete voter');
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Delete the voter for ${voter.name}?`)) {
      deleteVoter(voter.id);
      removeFromSelection(voter.id);
      rerender();
    }
  });

  controls.append(editBtn, deleteBtn);
  el.append(select, name, addr, controls);

  el.addEventListener('click', (e) => {
    if (e.shiftKey) {
      selectRange(columnVoterIds, voter.id);
      rerender();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      toggleSelect(voter.id);
      rerender();
      return;
    }
    openDetailView(voter, projectId, rerender);
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetailView(voter, projectId, rerender);
      return;
    }
    const currentIndex = columns.findIndex((c) => c.id === voter.status);
    const movingSelection = isSelected(voter.id) && getSelectedCount() > 1;
    if (e.key === 'ArrowRight' && currentIndex !== -1 && currentIndex < columns.length - 1) {
      e.preventDefault();
      const target = columns[currentIndex + 1].id;
      if (movingSelection) {
        moveVoters(getSelectedIds(), target);
        clearSelection();
      } else {
        moveVoter(voter.id, target, null);
      }
      rerender();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      const target = columns[currentIndex - 1].id;
      if (movingSelection) {
        moveVoters(getSelectedIds(), target);
        clearSelection();
      } else {
        moveVoter(voter.id, target, null);
      }
      rerender();
    }
  });

  makeVoterDraggable(el, voter);

  return el;
}
