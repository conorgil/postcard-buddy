import { exportVoterStatusPdf } from '../export/exportVoterStatusPdf';
import { openVoterForm } from '../forms/voterForm';
import { openPasteImportForm } from '../forms/pasteImportForm';
import { openPdfImportForm } from '../forms/pdfImportForm';
import { openReviewSuspectsForm } from '../forms/reviewSuspectsForm';
import { createHelpButton } from '../splash/helpButton';
import { getVotersForProject, getSuspectQueue, setActiveProject } from '../storage';
import { COLUMN_LABELS, COLUMN_ORDER, type Project } from '../types';
import { createDropdownButton } from '../ui/dropdownMenu';
import { createVoterElement } from './voter';
import { makeColumnDroppable } from './dragDrop';
import { clearSelection, isSelected, toggleSelectAllInColumn } from './selection';

export function renderBoardView(container: HTMLElement, project: Project, rerender: () => void): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'board-view';

  // --- Header ---
  const header = document.createElement('div');
  header.className = 'board-header';

  const backLink = document.createElement('button');
  backLink.className = 'btn btn--link';
  backLink.textContent = '← All projects';
  backLink.addEventListener('click', () => {
    setActiveProject(null);
    clearSelection();
    rerender();
  });

  const title = document.createElement('h1');
  title.className = 'board-header__title';
  title.textContent = project.name;

  const controls = document.createElement('div');
  controls.className = 'board-header__controls';

  const importBtn = createDropdownButton(
    'Import voter list...',
    [
      { label: '...via PDF', onSelect: () => openPdfImportForm(project.id, rerender) },
      { label: '...via copy/paste', onSelect: () => openPasteImportForm(project.id, rerender) },
    ],
    'primary',
  );

  const addVoterBtn = document.createElement('button');
  addVoterBtn.className = 'btn btn--secondary';
  addVoterBtn.textContent = 'Add single voter';
  addVoterBtn.addEventListener('click', () => openVoterForm(project.id, rerender));

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn--secondary';
  exportBtn.textContent = 'Export voter list';
  exportBtn.addEventListener('click', () => {
    exportVoterStatusPdf(project, getVotersForProject(project.id));
  });

  controls.append(importBtn, addVoterBtn, exportBtn);

  const pendingSuspects = getSuspectQueue(project.id);
  if (pendingSuspects.length > 0) {
    const reviewSuspectsBtn = document.createElement('button');
    reviewSuspectsBtn.className = 'btn btn--secondary';
    reviewSuspectsBtn.textContent = `Review possible addresses (${pendingSuspects.length})`;
    reviewSuspectsBtn.addEventListener('click', () => openReviewSuspectsForm(project.id, rerender));
    controls.append(reviewSuspectsBtn);
  }

  controls.append(createHelpButton());
  header.append(backLink, title, controls);

  // --- Columns ---
  const board = document.createElement('div');
  board.className = 'board';

  const voters = getVotersForProject(project.id);

  for (const columnId of COLUMN_ORDER) {
    const column = document.createElement('section');
    column.className = 'column';
    column.dataset.columnId = columnId;

    const columnVoters = voters.filter((v) => v.status === columnId).sort((a, b) => a.order - b.order);
    const columnVoterIds = columnVoters.map((v) => v.id);
    const selectedInColumn = columnVoterIds.filter((id) => isSelected(id)).length;

    const columnHeader = document.createElement('div');
    columnHeader.className = 'column__header';

    const columnLabel = document.createElement('span');
    columnLabel.textContent = `${COLUMN_LABELS[columnId]} (${columnVoters.length})`;

    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'column__select-all';
    selectAllBtn.textContent =
      selectedInColumn > 0 ? `${selectedInColumn} selected` : 'Select all';
    selectAllBtn.disabled = columnVoterIds.length === 0;
    selectAllBtn.addEventListener('click', () => {
      toggleSelectAllInColumn(columnVoterIds);
      rerender();
    });

    columnHeader.append(columnLabel, selectAllBtn);

    const columnBody = document.createElement('div');
    columnBody.className = 'column__body';

    for (const voter of columnVoters) {
      columnBody.appendChild(createVoterElement(voter, project.id, columnVoterIds, rerender));
    }

    makeColumnDroppable(columnBody, columnId, rerender);

    column.append(columnHeader, columnBody);
    board.appendChild(column);
  }

  wrapper.append(header, board);
  container.appendChild(wrapper);
}
