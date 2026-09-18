import './style.css';
import { renderBoardView } from './board/render';
import { clearSelection, getSelectedCount } from './board/selection';
import { renderProjectList } from './projects/projectListView';
import { isSplashPermanentlyDismissed } from './splash/splashPrefs';
import { openSplash } from './splash/splashView';
import { getActiveProject, redo, undo } from './storage';

const app: HTMLDivElement =
  document.querySelector<HTMLDivElement>('#app') ??
  (() => {
    throw new Error('#app root element not found');
  })();

function render(): void {
  app.innerHTML = '';
  const activeProject = getActiveProject();
  if (!activeProject) {
    renderProjectList(app, render);
  } else {
    renderBoardView(app, activeProject, render);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && getSelectedCount() > 0) {
    clearSelection();
    render();
    return;
  }

  const hasModifier = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  const isUndoShortcut = hasModifier && !e.shiftKey && key === 'z';
  const isRedoShortcut = (hasModifier && e.shiftKey && key === 'z') || (e.ctrlKey && key === 'y');
  if (!isUndoShortcut && !isRedoShortcut) return;

  const target = e.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  e.preventDefault();

  const applied = isUndoShortcut ? undo() : redo();
  if (applied) {
    clearSelection();
    render();
  }
});

render();

if (!isSplashPermanentlyDismissed()) {
  openSplash();
}
