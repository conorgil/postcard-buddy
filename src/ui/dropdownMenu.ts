export interface DropdownOption {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export function createDropdownButton(
  buttonLabel: string,
  options: DropdownOption[],
  variant: 'primary' | 'secondary' = 'secondary',
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'dropdown';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = `btn btn--${variant}`;
  toggleBtn.textContent = buttonLabel;

  const menu = document.createElement('div');
  menu.className = 'dropdown__menu';
  menu.hidden = true;

  for (const option of options) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'dropdown__item';
    item.textContent = option.label;
    item.disabled = option.disabled ?? false;
    item.addEventListener('click', () => {
      close();
      option.onSelect();
    });
    menu.appendChild(item);
  }

  toggleBtn.addEventListener('click', () => {
    menu.hidden ? open() : close();
  });

  function open(): void {
    menu.hidden = false;
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('keydown', onKeydown);
  }

  function close(): void {
    menu.hidden = true;
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('keydown', onKeydown);
  }

  function onOutsideClick(e: MouseEvent): void {
    if (!wrapper.contains(e.target as Node)) close();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') close();
  }

  wrapper.append(toggleBtn, menu);
  return wrapper;
}
