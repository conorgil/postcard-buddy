import { importPastedText } from '../pdf/importPastedText';
import { addToSuspectQueue, getSuspectQueue } from '../storage';
import { showToast } from '../ui/toast';
import { formatImportMessage } from '../ui/importMessage';
import { openReviewSuspectsForm } from './reviewSuspectsForm';

export function openPasteImportForm(projectId: string, rerender: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const panel = document.createElement('div');
  panel.className = 'panel form-panel paste-import-panel';

  const title = document.createElement('h2');
  title.textContent = 'Copy/paste voters';

  const hint = document.createElement('p');
  hint.className = 'paste-import-hint';
  hint.textContent = 'Enter one voter per line, e.g. "Voter Name, Street address, City, State, ZIP".';

  const form = document.createElement('form');

  const textareaField = document.createElement('label');
  textareaField.className = 'form-field';

  const textarea = document.createElement('textarea');
  textarea.className = 'paste-import-textarea';
  textarea.required = true;
  textareaField.append(textarea);

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn--secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', close);

  const importBtn = document.createElement('button');
  importBtn.type = 'submit';
  importBtn.className = 'btn btn--primary';
  importBtn.textContent = 'Import';

  actions.append(cancelBtn, importBtn);
  form.append(textareaField, actions);
  panel.append(title, hint, form);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function close(): void {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKeydown);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = importPastedText(projectId, textarea.value);
    close();
    showToast(formatImportMessage(result), 'success');
    addToSuspectQueue(projectId, result.suspectedLines);
    rerender();
    if (getSuspectQueue(projectId).length > 0) {
      openReviewSuspectsForm(projectId, rerender);
    }
  });

  textarea.focus();
}
