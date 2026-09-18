import { openSplash } from './splashView';

export function createHelpButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn btn--secondary help-btn';
  btn.setAttribute('aria-label', 'Help');
  btn.textContent = '?';
  btn.addEventListener('click', () => openSplash());
  return btn;
}
