import { openCardForm } from '../forms/cardForm';
import { importPdf } from '../pdf/importPdf';
import { getCardsForProject, setActiveProject } from '../storage';
import { COLUMN_LABELS, COLUMN_ORDER, type Project } from '../types';
import { showToast } from '../ui/toast';
import { createCardElement } from './card';
import { makeColumnDroppable } from './dragDrop';

function formatImportMessage(result: {
  importedCount: number;
  duplicateCount: number;
  skippedCount: number;
}): string {
  const parts = [`Imported ${result.importedCount} new card${result.importedCount === 1 ? '' : 's'}.`];
  if (result.duplicateCount > 0) {
    parts.push(`${result.duplicateCount} duplicate${result.duplicateCount === 1 ? '' : 's'} skipped.`);
  }
  if (result.skippedCount > 0) {
    parts.push(
      `${result.skippedCount} line${result.skippedCount === 1 ? '' : 's'} couldn't be parsed and ${
        result.skippedCount === 1 ? 'was' : 'were'
      } skipped.`,
    );
  }
  return parts.join(' ');
}

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

  const uploadLabel = document.createElement('label');
  uploadLabel.className = 'btn btn--secondary';
  uploadLabel.htmlFor = fileInput.id;
  uploadLabel.textContent = 'Upload PDF';

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const result = await importPdf(project.id, file);
      showToast(formatImportMessage(result), 'success');
      rerender();
    } catch (err) {
      console.error(err);
      showToast('Could not read this PDF. Please check the file and try again.', 'error');
    } finally {
      fileInput.value = '';
    }
  });

  const addCardBtn = document.createElement('button');
  addCardBtn.className = 'btn btn--primary';
  addCardBtn.textContent = '+ Add card';
  addCardBtn.addEventListener('click', () => openCardForm(project.id, rerender));

  controls.append(uploadLabel, fileInput, addCardBtn);
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

    const columnHeader = document.createElement('div');
    columnHeader.className = 'column__header';
    columnHeader.textContent = `${COLUMN_LABELS[columnId]} (${columnCards.length})`;

    const columnBody = document.createElement('div');
    columnBody.className = 'column__body';

    for (const card of columnCards) {
      columnBody.appendChild(createCardElement(card, project.id, rerender));
    }

    makeColumnDroppable(columnBody, columnId, rerender);

    column.append(columnHeader, columnBody);
    board.appendChild(column);
  }

  wrapper.append(header, board);
  container.appendChild(wrapper);
}
