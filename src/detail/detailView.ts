import stampImageUrl from '../assets/stamp.jpg';
import { getColumns, getVotersForProject, moveVoter } from '../storage';
import type { Voter } from '../types';
import { showToast } from '../ui/toast';

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

function attachTooltip(el: HTMLElement, html: string, ariaLabel: string, delayMs: number): void {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.innerHTML = html;
  tooltip.hidden = true;
  el.setAttribute('aria-label', ariaLabel);
  el.appendChild(tooltip);

  let timer: ReturnType<typeof setTimeout> | undefined;

  el.addEventListener('mouseenter', () => {
    timer = setTimeout(() => {
      tooltip.hidden = false;
    }, delayMs);
  });

  el.addEventListener('mouseleave', () => {
    clearTimeout(timer);
    tooltip.hidden = true;
  });
}

export function openDetailView(voter: Voter, projectId: string, rerender: () => void): void {
  const columns = getColumns(projectId);
  const firstColumn = columns[0];
  const secondColumn = columns[1];
  const thirdColumn = columns[2];

  if (firstColumn && secondColumn && voter.status === firstColumn.id) {
    moveVoter(voter.id, secondColumn.id, null);
    voter = { ...voter, status: secondColumn.id };
    showToast(`Moved ${voter.name} to the ${secondColumn.label} column`, 'success');
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

  const closeRow = document.createElement('div');
  closeRow.className = 'detail-panel__close-row';
  closeRow.appendChild(closeBtn);

  const postcard = document.createElement('div');
  postcard.className = 'postcard';

  const message = document.createElement('div');
  message.className = 'postcard__message';

  for (let i = 0; i < 3; i++) {
    const ruleLine = document.createElement('div');
    ruleLine.className = 'postcard__rule-line';
    if (i === 0) {
      const messagePlaceholder = document.createElement('span');
      messagePlaceholder.className = 'postcard__message-placeholder';
      messagePlaceholder.textContent = 'Your message goes here!';
      ruleLine.appendChild(messagePlaceholder);
    }
    message.appendChild(ruleLine);
  }

  const right = document.createElement('div');
  right.className = 'postcard__right';

  const stamp = document.createElement('div');
  stamp.className = 'postcard__stamp';
  const stampImg = document.createElement('img');
  stampImg.className = 'postcard__stamp-img';
  stampImg.src = stampImageUrl;
  stampImg.alt = 'Stamp';
  stamp.appendChild(stampImg);
  attachTooltip(
    stamp,
    'This is where the stamp goes. To save money, make sure to buy a <strong>postcard stamp</strong> ($0.65) instead of a normal letter stamp ($0.82). You can buy postcard stamps at the post office or online at <a href="https://store.usps.com/store/stamps/postcard/_/N-16jpffz" target="_blank" rel="noopener noreferrer">usps.com</a>.',
    'This is where the stamp goes. To save money, buy a postcard stamp instead of a normal letter stamp.',
    1000,
  );

  const address = document.createElement('div');
  address.className = 'postcard-address';

  const nameLine = document.createElement('div');
  nameLine.className = 'postcard-address__line';
  nameLine.textContent = voter.name;

  const streetLine = document.createElement('div');
  streetLine.className = 'postcard-address__line';
  streetLine.textContent = voter.street;

  const cityLine = document.createElement('div');
  cityLine.className = 'postcard-address__line';
  cityLine.textContent = `${voter.city}, ${voter.state} ${voter.zip}`;

  address.append(nameLine, streetLine, cityLine);
  right.append(stamp, address);
  postcard.append(message, right);

  const columnIndex = columns.findIndex((c) => c.id === voter.status);
  const isLast = columnIndex === -1 || columnIndex === columns.length - 1;

  const footer = document.createElement('div');
  footer.className = 'detail-panel__footer';

  if (secondColumn && thirdColumn && voter.status === secondColumn.id) {
    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn--secondary detail-panel__advance';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', () => {
      moveVoter(voter.id, thirdColumn.id, null);
      close();
      rerender();
    });
    footer.append(doneBtn);
  }

  const advanceBtn = document.createElement('button');
  advanceBtn.className = 'btn btn--primary detail-panel__advance';
  advanceBtn.textContent = 'Next voter';
  advanceBtn.disabled = isLast;
  advanceBtn.addEventListener('click', goToNextVoter);
  footer.append(advanceBtn);

  panel.append(closeRow, postcard, footer);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  shrinkLinesToFit([nameLine, streetLine, cityLine]);

  function goToNextVoter(): void {
    if (isLast) return;
    const originalStatus = voter.status;
    const nextColumn = columns[columnIndex + 1];
    moveVoter(voter.id, nextColumn.id, null);
    showToast(`Moved previous voter (${voter.name}) to the ${nextColumn.label} column`, 'success');

    // Only the todo/writing stage auto-pulls in the next voter; later
    // stages (stamping, mailing) just advance the current voter.
    const isWritingStage =
      !!firstColumn && !!secondColumn && (originalStatus === firstColumn.id || originalStatus === secondColumn.id);

    const nextVoter =
      isWritingStage && firstColumn
        ? getVotersForProject(projectId)
            .filter((v) => v.status === firstColumn.id && v.id !== voter.id)
            .sort((a, b) => a.order - b.order)[0]
        : undefined;

    if (nextVoter && secondColumn) {
      moveVoter(nextVoter.id, secondColumn.id, null);
    }

    close();
    rerender();

    if (nextVoter) {
      const updatedNextVoter = getVotersForProject(projectId).find((v) => v.id === nextVoter.id);
      if (updatedNextVoter) openDetailView(updatedNextVoter, projectId, rerender);
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
