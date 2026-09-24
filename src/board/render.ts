import { exportVoterStatusPdf } from '../export/exportVoterStatusPdf';
import { openVoterForm } from '../forms/voterForm';
import { openPasteImportForm } from '../forms/pasteImportForm';
import { openPdfImportForm } from '../forms/pdfImportForm';
import { openReviewSuspectsForm } from '../forms/reviewSuspectsForm';
import { createHelpButton } from '../splash/helpButton';
import {
  addColumn,
  deleteColumn,
  getColumns,
  getVotersForProject,
  getSuspectQueue,
  renameColumn,
  renameProject,
  setActiveProject,
} from '../storage';
import type { Project } from '../types';
import { createDropdownButton } from '../ui/dropdownMenu';
import { createVoterElement } from './voter';
import { makeBoardColumnDroppable, makeColumnDraggable, makeColumnDroppable } from './dragDrop';
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

  const titleWrap = document.createElement('div');
  titleWrap.className = 'board-header__title-wrap';

  function showTitleButton(): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'board-header__title board-header__title--editable';
    button.textContent = project.name;
    button.setAttribute('aria-label', 'Rename project');
    button.addEventListener('click', showTitleEditor);
    titleWrap.replaceChildren(button);
  }

  function showTitleEditor(): void {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'board-header__title-input';
    input.required = true;
    input.value = project.name;
    form.append(input);

    const errorText = document.createElement('p');
    errorText.className = 'form-error';
    errorText.hidden = true;

    titleWrap.replaceChildren(form, errorText);

    let cancelled = false;

    function commit(): void {
      const name = input.value.trim();
      if (!name || name === project.name) {
        showTitleButton();
        return;
      }
      if (!renameProject(project.id, name)) {
        errorText.textContent = 'A project with this name already exists.';
        errorText.hidden = false;
        input.focus();
        return;
      }
      rerender();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      commit();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cancelled = true;
        showTitleButton();
      }
    });

    input.addEventListener('blur', () => {
      if (cancelled) return;
      commit();
    });

    input.focus();
    input.select();
  }

  showTitleButton();

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
  header.append(backLink, titleWrap, controls);

  // --- Columns ---
  const board = document.createElement('div');
  board.className = 'board';

  const voters = getVotersForProject(project.id);
  const columns = getColumns(project.id);

  for (const column of columns) {
    const columnEl = document.createElement('section');
    columnEl.className = 'column';
    columnEl.dataset.columnId = column.id;

    const columnVoters = voters.filter((v) => v.status === column.id).sort((a, b) => a.order - b.order);
    const columnVoterIds = columnVoters.map((v) => v.id);
    const selectedInColumn = columnVoterIds.filter((id) => isSelected(id)).length;

    const columnHeader = document.createElement('div');
    columnHeader.className = 'column__header';

    const columnHeaderTop = document.createElement('div');
    columnHeaderTop.className = 'column__header-top';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'column__drag-handle';
    dragHandle.setAttribute('aria-label', 'Reorder column');
    dragHandle.textContent = '⠿';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'column__title-wrap';

    const headerError = document.createElement('p');
    headerError.className = 'column__header-error';
    headerError.hidden = true;

    function showColumnError(message: string): void {
      headerError.textContent = message;
      headerError.hidden = false;
    }

    function showColumnTitleButton(): void {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'column__title column__title--editable';
      button.setAttribute('aria-label', 'Rename column');
      button.addEventListener('click', showColumnTitleEditor);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'column__title-label';
      labelSpan.textContent = column.label;

      const countSpan = document.createElement('span');
      countSpan.className = 'column__title-count';
      countSpan.textContent = String(columnVoters.length);

      button.append(labelSpan, countSpan);
      titleWrap.replaceChildren(button);
    }

    function showColumnTitleEditor(): void {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'column__title-input';
      input.required = true;
      input.value = column.label;
      form.append(input);

      titleWrap.replaceChildren(form);

      let cancelled = false;

      function commit(): void {
        const label = input.value.trim();
        if (!label || label === column.label) {
          showColumnTitleButton();
          return;
        }
        if (!renameColumn(project.id, column.id, label)) {
          showColumnError('A column with this name already exists.');
          input.focus();
          return;
        }
        rerender();
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        commit();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          cancelled = true;
          showColumnTitleButton();
        }
      });

      input.addEventListener('blur', () => {
        if (cancelled) return;
        commit();
      });

      input.focus();
      input.select();
    }

    showColumnTitleButton();

    const menuBtn = createDropdownButton(
      '⋯',
      [
        {
          label: selectedInColumn > 0 ? `${selectedInColumn} selected` : 'Select all',
          onSelect: () => {
            toggleSelectAllInColumn(columnVoterIds);
            rerender();
          },
          disabled: columnVoterIds.length === 0,
        },
        { label: 'Rename column', onSelect: showColumnTitleEditor },
        {
          label: 'Delete column',
          onSelect: () => {
            const result = deleteColumn(project.id, column.id);
            if (result.ok) {
              rerender();
              return;
            }
            if (result.reason === 'not-empty') {
              showColumnError(
                `Move all ${result.voterCount} voter${result.voterCount === 1 ? '' : 's'} out of this column before deleting it.`,
              );
            } else if (result.reason === 'last-column') {
              showColumnError('A project must have at least one column.');
            }
          },
        },
      ],
      'secondary',
    );

    columnHeaderTop.append(dragHandle, titleWrap, menuBtn);
    columnHeader.append(columnHeaderTop, headerError);

    const columnBody = document.createElement('div');
    columnBody.className = 'column__body';

    for (const voter of columnVoters) {
      columnBody.appendChild(createVoterElement(voter, project.id, columnVoterIds, columns, rerender));
    }

    makeColumnDroppable(columnBody, column.id, rerender);
    makeColumnDraggable(dragHandle, columnEl, column.id, rerender);

    columnEl.append(columnHeader, columnBody);
    board.appendChild(columnEl);
  }

  const addColumnEl = document.createElement('section');
  addColumnEl.className = 'column column--add';

  function showAddColumnButton(): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--secondary column__add-btn';
    button.textContent = '+ Add column';
    button.addEventListener('click', showAddColumnEditor);
    addColumnEl.replaceChildren(button);
  }

  function showAddColumnEditor(): void {
    const form = document.createElement('form');

    const input = document.createElement('input');
    input.type = 'text';
    input.required = true;
    input.placeholder = 'Column name';

    const errorText = document.createElement('p');
    errorText.className = 'form-error';
    errorText.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn--secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', showAddColumnButton);
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'btn btn--primary';
    saveBtn.textContent = 'Add';
    actions.append(cancelBtn, saveBtn);

    form.append(input, errorText, actions);
    addColumnEl.replaceChildren(form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const label = input.value.trim();
      if (!label) return;
      if (!addColumn(project.id, label)) {
        errorText.textContent = 'A column with this name already exists.';
        errorText.hidden = false;
        return;
      }
      rerender();
    });

    input.focus();
  }

  showAddColumnButton();
  board.appendChild(addColumnEl);

  makeBoardColumnDroppable(board, project.id);

  wrapper.append(header, board);
  container.appendChild(wrapper);
}
