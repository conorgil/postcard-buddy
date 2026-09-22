import { renameProject } from '../storage';
import type { Project } from '../types';

export function openRenameProjectForm(project: Project, rerender: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const panel = document.createElement('div');
  panel.className = 'panel form-panel';

  const title = document.createElement('h2');
  title.textContent = 'Rename project';

  const form = document.createElement('form');

  const field = document.createElement('label');
  field.className = 'form-field';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.required = true;
  nameInput.value = project.name;
  field.append(nameInput);

  const errorText = document.createElement('p');
  errorText.className = 'form-error';
  errorText.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn--secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', close);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn btn--primary';
  saveBtn.textContent = 'Save';

  actions.append(cancelBtn, saveBtn);
  form.append(field, errorText, actions);
  panel.append(title, form);
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
    const name = nameInput.value.trim();
    if (!name) return;
    if (!renameProject(project.id, name)) {
      errorText.textContent = 'A project with this name already exists.';
      errorText.hidden = false;
      return;
    }
    close();
    rerender();
  });

  nameInput.focus();
  nameInput.select();
}
