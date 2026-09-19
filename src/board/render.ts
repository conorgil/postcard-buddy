import { exportVoterStatusPdf } from '../export/exportVoterStatusPdf';
import { openCardForm } from '../forms/cardForm';
import { openPasteImportForm } from '../forms/pasteImportForm';
import { openReviewSuspectsForm } from '../forms/reviewSuspectsForm';
import { importPdf } from '../pdf/importPdf';
import { createHelpButton } from '../splash/helpButton';
import { addToSuspectQueue, getCardsForProject, getSuspectQueue, setActiveProject } from '../storage';
import { COLUMN_LABELS, COLUMN_ORDER, type Project } from '../types';
import { createDropdownButton } from '../ui/dropdownMenu';
import { formatImportMessage } from '../ui/importMessage';
import { showToast } from '../ui/toast';
import { createCardElement } from './card';
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

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/pdf';
  fileInput.className = 'visually-hidden';
  fileInput.id = 'pdf-upload-input';

  const importBtn = createDropdownButton('Import voters', [
    { label: 'Parse a PDF', onSelect: () => fileInput.click() },
    { label: 'Copy/paste', onSelect: () => openPasteImportForm(project.id, rerender) },
  ]);

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const result = await importPdf(project.id, file);
      showToast(formatImportMessage(result), 'success');
      addToSuspectQueue(project.id, result.suspectedLines);
      rerender();
      if (getSuspectQueue(project.id).length > 0) {
        openReviewSuspectsForm(project.id, rerender);
      }
    } catch (err) {
      console.error(err);
      showToast('Could not read this PDF. Please check the file and try again.', 'error');
    } finally {
      fileInput.value = '';
    }
  });

  const addVoterBtn = document.createElement('button');
  addVoterBtn.className = 'btn btn--primary';
  addVoterBtn.textContent = '+ Add voter';
  addVoterBtn.addEventListener('click', () => openCardForm(project.id, rerender));

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn--secondary';
  exportBtn.textContent = 'Export voters';
  exportBtn.addEventListener('click', () => {
    exportVoterStatusPdf(project, getCardsForProject(project.id));
    showToast('Exported progress PDF.', 'success');
  });

  controls.append(addVoterBtn, importBtn, fileInput, exportBtn);

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

  const cards = getCardsForProject(project.id);

  for (const columnId of COLUMN_ORDER) {
    const column = document.createElement('section');
    column.className = 'column';
    column.dataset.columnId = columnId;

    const columnCards = cards.filter((c) => c.status === columnId).sort((a, b) => a.order - b.order);
    const columnCardIds = columnCards.map((c) => c.id);
    const selectedInColumn = columnCardIds.filter((id) => isSelected(id)).length;

    const columnHeader = document.createElement('div');
    columnHeader.className = 'column__header';

    const columnLabel = document.createElement('span');
    columnLabel.textContent = `${COLUMN_LABELS[columnId]} (${columnCards.length})`;

    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'column__select-all';
    selectAllBtn.textContent =
      selectedInColumn > 0 ? `${selectedInColumn} selected` : 'Select all';
    selectAllBtn.disabled = columnCardIds.length === 0;
    selectAllBtn.addEventListener('click', () => {
      toggleSelectAllInColumn(columnCardIds);
      rerender();
    });

    columnHeader.append(columnLabel, selectAllBtn);

    const columnBody = document.createElement('div');
    columnBody.className = 'column__body';

    for (const card of columnCards) {
      columnBody.appendChild(createCardElement(card, project.id, columnCardIds, rerender));
    }

    makeColumnDroppable(columnBody, columnId, rerender);

    column.append(columnHeader, columnBody);
    board.appendChild(column);
  }

  wrapper.append(header, board);
  container.appendChild(wrapper);
}
