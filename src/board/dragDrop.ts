import { moveVoter, moveVoters } from '../storage';
import type { ColumnId, Voter } from '../types';
import { clearSelection, getSelectedCount, getSelectedIds, isSelected } from './selection';

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
