import { addVoter, clearSuspectQueue, getSuspectQueue, removeFromSuspectQueue } from '../storage';

export function openReviewSuspectsForm(projectId: string, rerender: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const panel = document.createElement('div');
  panel.className = 'panel form-panel suspects-panel';

  const title = document.createElement('h2');
  title.textContent = 'Review possible addresses';

  const hint = document.createElement('p');
  hint.className = 'suspects-hint';
  hint.textContent =
    "These lines might be addresses we couldn't parse automatically. Add the ones that are real — you can fix up the details afterward.";

  const list = document.createElement('ul');
  list.className = 'suspects-list';

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const addAllBtn = document.createElement('button');
  addAllBtn.type = 'button';
  addAllBtn.className = 'btn btn--secondary';
  addAllBtn.textContent = 'Add all as voters';
  addAllBtn.addEventListener('click', () => {
    for (const line of getSuspectQueue(projectId)) {
      addVoter(projectId, { name: line, street: '', city: '', state: '', zip: '' });
    }
    clearSuspectQueue(projectId);
    list.replaceChildren();
    rerender();
    close();
  });

  const discardAllBtn = document.createElement('button');
  discardAllBtn.type = 'button';
  discardAllBtn.className = 'btn btn--danger';
  discardAllBtn.textContent = 'Discard all';
  discardAllBtn.addEventListener('click', () => {
    clearSuspectQueue(projectId);
    list.replaceChildren();
    rerender();
    close();
  });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn--secondary';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', close);

  actions.append(addAllBtn, discardAllBtn, closeBtn);
  panel.append(title, hint, list, actions);
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

  function resolve(line: string): void {
    removeFromSuspectQueue(projectId, line);
    rerender();
    if (getSuspectQueue(projectId).length === 0) {
      close();
    }
  }

  for (const line of getSuspectQueue(projectId)) {
    const item = document.createElement('li');
    item.className = 'suspects-row';

    const text = document.createElement('code');
    text.className = 'suspects-row__text';
    text.textContent = line;

    const rowActions = document.createElement('div');
    rowActions.className = 'suspects-row__actions';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn--primary';
    addBtn.textContent = 'Add as voter';
    addBtn.addEventListener('click', () => {
      addVoter(projectId, { name: line, street: '', city: '', state: '', zip: '' });
      item.remove();
      resolve(line);
    });

    const discardBtn = document.createElement('button');
    discardBtn.type = 'button';
    discardBtn.className = 'btn btn--danger';
    discardBtn.textContent = 'Discard';
    discardBtn.addEventListener('click', () => {
      item.remove();
      resolve(line);
    });

    rowActions.append(addBtn, discardBtn);
    item.append(text, rowActions);
    list.appendChild(item);
  }
}
