/**
 * Botão de pausa e tela de pausa (seções 2.5 e 10.2). A tela cobre o
 * tabuleiro, para não dar para estudar a posição com o relógio parado.
 */
export interface PauseHandlers {
  resume(): void;
  restart(): void;
  menu(): void;
}

export function createPauseButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'icon-btn pause-btn';
  btn.setAttribute('aria-label', 'Pausar');
  btn.innerHTML = '<span></span><span></span>';
  return btn;
}

export function createPauseScreen(h: PauseHandlers): { el: HTMLDivElement; show(time: string, moves: number): void; hide(): void; readonly shown: boolean } {
  const el = document.createElement('div');
  el.className = 'pause';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'pause-title');

  const title = document.createElement('h2');
  title.id = 'pause-title';
  title.textContent = 'PAUSA';
  const info = document.createElement('p');
  info.className = 'pause-info';

  const resume = button('CONTINUAR', 'menu-primary');
  const restart = button('REINICIAR', 'pause-option');
  const menu = button('MENU', 'pause-option');
  const actions = document.createElement('div');
  actions.className = 'pause-actions';
  actions.append(resume, restart, menu);
  el.append(title, info, actions);

  resume.addEventListener('click', () => h.resume());
  restart.addEventListener('click', () => h.restart());
  menu.addEventListener('click', () => h.menu());

  return {
    el,
    show(time, moves) {
      info.textContent = `${time} · ${moves} MOV.`;
      el.hidden = false;
      resume.focus({ preventScroll: true });
    },
    hide() {
      el.hidden = true;
    },
    get shown() {
      return !el.hidden;
    },
  };
}

function button(label: string, className: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = className;
  b.textContent = label;
  return b;
}
