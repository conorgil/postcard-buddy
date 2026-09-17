import { createProject, deleteProject, getCardsForProject, getProjects, renameProject, setActiveProject } from '../storage';

export function renderProjectList(container: HTMLElement, rerender: () => void): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'project-list-view';

  const header = document.createElement('div');
  header.className = 'project-list-header';

  const title = document.createElement('h1');
  title.textContent = 'Postcard Buddy';

  const newBtn = document.createElement('button');
  newBtn.className = 'btn btn--primary';
  newBtn.textContent = '+ New Project';
  newBtn.addEventListener('click', () => {
    const name = window.prompt('Project name:');
    if (!name || !name.trim()) return;
    createProject(name);
    rerender();
  });

  header.append(title, newBtn);

  const list = document.createElement('div');
  list.className = 'project-list';

  const projects = getProjects();

  if (projects.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'project-list-empty';
    empty.textContent = 'No projects yet. Create one to import a voter list PDF and start writing postcards.';
    list.appendChild(empty);
  }

  for (const project of projects) {
    const cardCount = getCardsForProject(project.id).length;

    const row = document.createElement('div');
    row.className = 'project-row';

    const info = document.createElement('div');
    info.className = 'project-row__info';

    const name = document.createElement('div');
    name.className = 'project-row__name';
    name.textContent = project.name;

    const meta = document.createElement('div');
    meta.className = 'project-row__meta';
    meta.textContent = `${cardCount} card${cardCount === 1 ? '' : 's'} · created ${new Date(
      project.createdAt,
    ).toLocaleDateString()}`;

    info.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'project-row__actions';

    const openBtn = document.createElement('button');
    openBtn.className = 'btn btn--primary';
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', () => {
      setActiveProject(project.id);
      rerender();
    });

    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn btn--secondary';
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', () => {
      const name = window.prompt('Rename project:', project.name);
      if (name === null || !name.trim()) return;
      renameProject(project.id, name);
      rerender();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn--danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      const confirmed = window.confirm(
        `Delete "${project.name}" and all ${cardCount} of its cards? This can't be undone.`,
      );
      if (!confirmed) return;
      deleteProject(project.id);
      rerender();
    });

    actions.append(openBtn, renameBtn, deleteBtn);
    row.append(info, actions);
    list.appendChild(row);
  }

  wrapper.append(header, list);
  container.appendChild(wrapper);
}
