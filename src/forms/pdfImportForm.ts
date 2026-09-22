import { importPdf } from '../pdf/importPdf';
import { addToSuspectQueue, getSuspectQueue } from '../storage';
import { formatImportMessage } from '../ui/importMessage';
import { showToast } from '../ui/toast';
import { openReviewSuspectsForm } from './reviewSuspectsForm';

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function openPdfImportForm(projectId: string, rerender: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const panel = document.createElement('div');
  panel.className = 'panel form-panel pdf-import-panel';

  const title = document.createElement('h2');
  title.textContent = 'Import voters from a PDF';

  const dropZone = document.createElement('div');
  dropZone.className = 'pdf-drop-zone';

  const dropText = document.createElement('p');
  dropText.className = 'pdf-drop-zone__text';
  dropText.textContent = 'Drag and drop a PDF here';

  const orText = document.createElement('p');
  orText.className = 'pdf-drop-zone__or';
  orText.textContent = 'or';

  const browseBtn = document.createElement('button');
  browseBtn.type = 'button';
  browseBtn.className = 'btn btn--primary';
  browseBtn.textContent = 'Choose a file';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/pdf';
  fileInput.className = 'visually-hidden';

  dropZone.append(dropText, orText, browseBtn, fileInput);

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn--secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', close);

  actions.append(cancelBtn);
  panel.append(title, dropZone, actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) void handleFile(file);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dropZone.classList.add('pdf-drop-zone--active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('pdf-drop-zone--active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('pdf-drop-zone--active');
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    if (!isPdfFile(file)) {
      showToast('Please drop a PDF file.', 'error');
      return;
    }
    void handleFile(file);
  });

  async function handleFile(file: File): Promise<void> {
    try {
      const result = await importPdf(projectId, file);
      close();
      showToast(formatImportMessage(result), 'success');
      addToSuspectQueue(projectId, result.suspectedLines);
      rerender();
      if (getSuspectQueue(projectId).length > 0) {
        openReviewSuspectsForm(projectId, rerender);
      }
    } catch (err) {
      console.error(err);
      showToast('Could not read this PDF. Please check the file and try again.', 'error');
    }
  }

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
}
