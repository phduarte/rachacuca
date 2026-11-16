/**
 * Menu principal (seção 10.2): CONTINUAR (se houver partida) · NOVO JOGO ·
 * TAMANHO · IMAGENS · ESTATÍSTICAS · OPÇÕES · INSTALAR.
 */
import { SIZE_OPTIONS } from './menu';

export interface MainMenuState {
  canContinue: boolean;
  size: number;
  unlocked6: boolean;
  install: boolean;
  update: boolean;
  /** ESTATÍSTICAS só aparece quando a tela existir (fase 5). */
  stats: boolean;
}

export interface MainMenuHandlers {
  continue(): void;
  newGame(): void;
  size(n: 3 | 4 | 5 | 6): void;
  images(): void;
  stats(): void;
  options(): void;
  install(): void;
  update(): void;
}

export function createMainMenu(state: () => MainMenuState, h: MainMenuHandlers): { el: HTMLDivElement; render(): void } {
  const el = document.createElement('div');
  el.className = 'screen main-menu';
  el.hidden = true;
  el.setAttribute('role', 'menu');
  el.setAttribute('aria-label', 'Menu principal');

  const logo = document.createElement('img');
  logo.className = 'main-menu-logo';
  logo.src = `${import.meta.env.BASE_URL}brand/logo.webp`;
  logo.alt = 'Racha Cuca';
  logo.draggable = false;

  const list = document.createElement('div');
  list.className = 'main-menu-list';

  const item = (label: string, onClick: () => void, primary = false) => {
    const b = document.createElement('button');
    b.className = primary ? 'main-item main-item--primary' : 'main-item';
    b.setAttribute('role', 'menuitem');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  };

  const update = item('NOVA VERSÃO! REINICIAR?', () => h.update());
  update.classList.add('main-item--update');
  const cont = item('CONTINUAR', () => h.continue(), true);
  const newGame = item('NOVO JOGO', () => h.newGame(), true);

  const sizeRow = document.createElement('div');
  sizeRow.className = 'main-size';
  const sizeLabel = document.createElement('span');
  sizeLabel.className = 'main-size-label';
  const sizeButtons = document.createElement('div');
  sizeButtons.className = 'main-size-buttons';
  sizeButtons.setAttribute('role', 'radiogroup');
  sizeButtons.setAttribute('aria-label', 'Tamanho');
  sizeRow.append(sizeLabel, sizeButtons);

  const images = item('IMAGENS', () => h.images());
  const stats = item('ESTATÍSTICAS', () => h.stats());
  const options = item('OPÇÕES', () => h.options());
  const install = item('INSTALAR', () => h.install());
  list.append(update, cont, newGame, sizeRow, images, stats, options, install);
  el.append(logo, list);

  sizeButtons.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-size]');
    if (!b || b.disabled) return;
    h.size(Number(b.dataset.size) as 3 | 4 | 5 | 6);
    render();
  });

  function render(): void {
    const s = state();
    update.hidden = !s.update;
    cont.hidden = !s.canContinue;
    stats.hidden = !s.stats;
    install.hidden = !s.install;
    const current = SIZE_OPTIONS.find((o) => o.n === s.size)!;
    sizeLabel.textContent = `TAMANHO: ${current.name}`;
    sizeButtons.replaceChildren(
      ...SIZE_OPTIONS.map(({ n, name }) => {
        const b = document.createElement('button');
        b.className = 'main-size-btn';
        b.dataset.size = String(n);
        b.textContent = String(n);
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(n === s.size));
        const locked = n === 6 && !s.unlocked6;
        b.disabled = locked;
        b.setAttribute('aria-label', locked ? `${n} × ${n}: vença um 5 × 5 para liberar` : `${n} × ${n}, ${name}`);
        return b;
      }),
    );
  }

  return { el, render };
}
