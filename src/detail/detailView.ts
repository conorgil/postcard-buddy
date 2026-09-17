import { moveCard } from '../storage';
import { COLUMN_ORDER, type Card } from '../types';

export function openDetailView(card: Card, rerender: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const panel = document.createElement('div');
  panel.className = 'panel detail-panel';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'detail-panel__close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', close);

  const address = document.createElement('div');
  address.className = 'postcard-address';

  const nameLine = document.createElement('div');
  nameLine.className = 'postcard-address__line';
  nameLine.textContent = card.name;

  const streetLine = document.createElement('div');
  streetLine.className = 'postcard-address__line';
  streetLine.textContent = card.street;

  const cityLine = document.createElement('div');
  cityLine.className = 'postcard-address__line';
  cityLine.textContent = `${card.city}, ${card.state} ${card.zip}`;

  address.append(nameLine, streetLine, cityLine);

  const columnIndex = COLUMN_ORDER.indexOf(card.status);
  const isLast = columnIndex === COLUMN_ORDER.length - 1;

  const advanceBtn = document.createElement('button');
  advanceBtn.className = 'btn btn--primary detail-panel__advance';
  advanceBtn.textContent = 'Finished writing';
  advanceBtn.disabled = isLast;
  advanceBtn.addEventListener('click', () => {
    if (isLast) return;
    const nextColumn = COLUMN_ORDER[columnIndex + 1];
    moveCard(card.id, nextColumn, null);
    close();
    rerender();
  });

  panel.append(closeBtn, address, advanceBtn);
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
