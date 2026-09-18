import { getCardsForProject, moveCard } from '../storage';
import { COLUMN_ORDER, type Card } from '../types';

/**
 * Shrinks every line to the same font size — the smallest size that keeps the
 * longest-overflowing line on one line — so the three address lines never
 * appear at mismatched sizes.
 */
function shrinkLinesToFit(lines: HTMLElement[]): void {
  const scales = lines.map((line) =>
    line.scrollWidth <= line.clientWidth ? 1 : (line.clientWidth / line.scrollWidth) * 0.97,
  );
  const minScale = Math.min(...scales);
  if (minScale >= 1) return;

  const baseFontSize = parseFloat(getComputedStyle(lines[0]).fontSize);
  const fittedFontSize = `${baseFontSize * minScale}px`;
  for (const line of lines) {
    line.style.fontSize = fittedFontSize;
  }
}

export function openDetailView(card: Card, projectId: string, rerender: () => void): void {
  if (card.status === COLUMN_ORDER[0]) {
    moveCard(card.id, COLUMN_ORDER[1], null);
    card = { ...card, status: COLUMN_ORDER[1] };
    rerender();
  }

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
  advanceBtn.textContent = 'Next voter';
  advanceBtn.disabled = isLast;
  advanceBtn.addEventListener('click', goToNextVoter);

  panel.append(closeBtn, address, advanceBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  shrinkLinesToFit([nameLine, streetLine, cityLine]);

  function goToNextVoter(): void {
    if (isLast) return;
    const originalStatus = card.status;
    const nextColumn = COLUMN_ORDER[columnIndex + 1];
    moveCard(card.id, nextColumn, null);

    // Only the todo/writing stage auto-pulls in the next voter; later
    // stages (stamping, mailing) just advance the current card.
    const todoColumn = COLUMN_ORDER[0];
    const writingColumn = COLUMN_ORDER[1];
    const isWritingStage = originalStatus === todoColumn || originalStatus === writingColumn;

    const nextCard = isWritingStage
      ? getCardsForProject(projectId)
          .filter((c) => c.status === todoColumn && c.id !== card.id)
          .sort((a, b) => a.order - b.order)[0]
      : undefined;

    if (nextCard) {
      moveCard(nextCard.id, writingColumn, null);
    }

    close();
    rerender();

    if (nextCard) {
      const updatedNextCard = getCardsForProject(projectId).find((c) => c.id === nextCard.id);
      if (updatedNextCard) openDetailView(updatedNextCard, projectId, rerender);
    }
  }

  function close(): void {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNextVoter();
    }
  }
  document.addEventListener('keydown', onKeydown);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  closeBtn.focus();
}
