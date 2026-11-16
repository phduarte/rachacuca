/**
 * Painel de resultado (seção 7.4): sobe no assentamento da vitória com
 * "VOCÊ RACHOU A CUCA!" (na arte da logomarca), tempo, movimentos, espiadas
 * e a comparação com o recorde do tamanho; "NOVO RECORDE!" pisca abaixo de
 * 3 vezes por segundo. Botões NOVO JOGO e MENU. A vitória é anunciada por
 * aria-live (seção 12.1).
 */
import { formatTime } from '../core/timer';

export interface ResultData {
  size: number;
  timeMs: number;
  moves: number;
  peeks: number;
  /** Recordes do tamanho antes desta partida (undefined = primeira vitória). */
  previousBestTimeMs?: number;
  previousBestMoves?: number;
  newBestTime: boolean;
  newBestMoves: boolean;
}

export interface ResultHandlers {
  newGame(): void;
  menu(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Palavras na arte da logomarca (mesmo estilo da mensagem de vitória). */
function logoWord(word: string, mod: 'top' | 'bottom'): HTMLSpanElement {
  const w = el('span', `win-word win-word--${mod}`);
  w.dataset.text = word;
  w.setAttribute('aria-hidden', 'true');
  w.append(el('span', undefined, word));
  return w;
}

export function createResultPanel(h: ResultHandlers): { el: HTMLDivElement; show(d: ResultData): void; hide(): void } {
  const root = el('div', 'result');
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-labelledby', 'result-title');

  const title = el('h2', 'result-title');
  title.id = 'result-title';
  title.setAttribute('aria-label', 'Você rachou a cuca!');
  title.append(el('span', 'result-you', 'VOCÊ'), logoWord('RACHOU', 'top'), logoWord('A CUCA!', 'bottom'));

  const record = el('p', 'result-record', 'NOVO RECORDE!');
  const rows = el('dl', 'result-rows');
  const live = el('p', 'visually-hidden');
  live.setAttribute('aria-live', 'assertive');

  const actions = el('div', 'result-actions');
  const again = el('button', 'menu-primary', 'NOVO JOGO');
  const menu = el('button', 'pause-option', 'MENU');
  actions.append(again, menu);
  root.append(title, record, rows, actions, live);

  again.addEventListener('click', () => h.newGame());
  menu.addEventListener('click', () => h.menu());

  function row(label: string, value: string, note?: string, best = false): void {
    const dt = el('dt', undefined, label);
    const dd = el('dd', best ? 'result-best' : undefined, value);
    if (note) dd.append(el('small', undefined, note));
    rows.append(dt, dd);
  }

  return {
    el: root,
    show(d) {
      rows.replaceChildren();
      const timeNote =
        d.previousBestTimeMs === undefined ? 'PRIMEIRA VITÓRIA' : d.newBestTime ? `ANTES: ${formatTime(d.previousBestTimeMs)}` : `RECORDE: ${formatTime(d.previousBestTimeMs)}`;
      const movesNote =
        d.previousBestMoves === undefined ? undefined : d.newBestMoves ? `ANTES: ${d.previousBestMoves}` : `RECORDE: ${d.previousBestMoves}`;
      row('TEMPO', formatTime(d.timeMs), timeNote, d.newBestTime);
      row('MOVIMENTOS', String(d.moves), movesNote, d.newBestMoves);
      row('ESPIADAS', String(d.peeks));
      const isRecord = d.newBestTime || d.newBestMoves;
      record.hidden = !isRecord;
      live.textContent =
        `Você rachou a cuca! ${d.size} por ${d.size} em ${formatTime(d.timeMs)}, ${d.moves} movimentos, ${d.peeks} espiadas.` +
        (isRecord ? ' Novo recorde!' : '');
      root.hidden = false;
      // Sobe depois de ser exibido, para a transição acontecer.
      requestAnimationFrame(() => root.classList.add('show'));
      again.focus({ preventScroll: true });
    },
    hide() {
      root.classList.remove('show');
      root.hidden = true;
    },
  };
}
