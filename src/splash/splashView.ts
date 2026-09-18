import splashHtml from '../content/splash.html?raw';
import { dismissSplashPermanently } from './splashPrefs';

export function openSplash(): void {
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

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'btn btn--secondary';
  dismissBtn.textContent = 'Dismiss for now';
  dismissBtn.addEventListener('click', close);

  const neverShowBtn = document.createElement('button');
  neverShowBtn.className = 'btn btn--primary';
  neverShowBtn.textContent = "Don't show again";
  neverShowBtn.addEventListener('click', () => {
    dismissSplashPermanently();
    close();
  });

  actions.append(dismissBtn, neverShowBtn);
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
