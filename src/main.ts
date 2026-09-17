import './style.css';
import { renderBoardView } from './board/render';
import { renderProjectList } from './projects/projectListView';
import { getActiveProject } from './storage';

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

render();
