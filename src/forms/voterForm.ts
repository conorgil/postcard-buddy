import { addVoter, updateVoter } from '../storage';
import type { Voter } from '../types';

function field(label: string, value: string): { wrapper: HTMLLabelElement; input: HTMLInputElement } {
  const wrapper = document.createElement('label');
  wrapper.className = 'form-field';
  const span = document.createElement('span');
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.required = true;
  wrapper.append(span, input);
  return { wrapper, input };
}

export function openVoterForm(projectId: string, rerender: () => void, existing?: Voter): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const panel = document.createElement('div');
  panel.className = 'panel form-panel';

  const title = document.createElement('h2');
  title.textContent = existing ? 'Edit voter' : 'Add voter';

  const form = document.createElement('form');

  const nameField = field('Name', existing?.name ?? '');
  const streetField = field('Street', existing?.street ?? '');
  const cityField = field('City', existing?.city ?? '');
  const stateField = field('State', existing?.state ?? '');
  const zipField = field('ZIP', existing?.zip ?? '');

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
  saveBtn.textContent = existing ? 'Save changes' : 'Add voter';

  actions.append(cancelBtn, saveBtn);
  form.append(
    nameField.wrapper,
    streetField.wrapper,
    cityField.wrapper,
    stateField.wrapper,
    zipField.wrapper,
    actions,
  );
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
    const input = {
      name: nameField.input.value,
      street: streetField.input.value,
      city: cityField.input.value,
      state: stateField.input.value,
      zip: zipField.input.value,
    };
    if (existing) {
      updateVoter(existing.id, input);
    } else {
      addVoter(projectId, input);
    }
    close();
    rerender();
  });

  nameField.input.focus();
}
