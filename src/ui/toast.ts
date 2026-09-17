export type ToastKind = 'success' | 'error';

export function showToast(message: string, kind: ToastKind): void {
  const toast = document.createElement('div');
  toast.className = `toast toast--${kind}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;

  const close = document.createElement('button');
  close.className = 'toast__close';
  close.setAttribute('aria-label', 'Dismiss');
  close.textContent = '×';
  close.addEventListener('click', () => toast.remove());
  toast.appendChild(close);

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}
