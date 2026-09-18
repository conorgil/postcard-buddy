import splashHtml from '../content/splash.html?raw';
import { dismissSplashPermanently } from './splashPrefs';

export function openSplash(offerPermanentDismiss = true): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const panel = document.createElement('div');
  panel.className = 'panel splash-panel';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'detail-panel__close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', close);

  const content = document.createElement('div');
  content.className = 'splash-content';
  content.innerHTML = splashHtml;

  const actions = document.createElement('div');
  actions.className = 'splash-actions';

  if (offerPermanentDismiss) {
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn btn--primary';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', close);

    const neverShowBtn = document.createElement('button');
    neverShowBtn.className = 'btn btn--secondary';
    neverShowBtn.textContent = "Don't show again";
    neverShowBtn.addEventListener('click', () => {
      dismissSplashPermanently();
      close();
    });

    actions.append(neverShowBtn, dismissBtn);
  } else {
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn btn--primary';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', close);

    actions.append(dismissBtn);
  }

  panel.append(closeBtn, content, actions);
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

  closeBtn.focus();
}
