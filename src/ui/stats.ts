/**
 * Tela de estatísticas (seção 8.2): abas por tamanho, indicadores, gráfico
 * de barras pixeladas das últimas 20 partidas, lista das últimas partidas com
 * detalhes e JOGAR DE NOVO, exportar (JSON) e zerar (confirmação dupla).
 */
import { formatTime } from '../core/timer';
import type { Aggregates, GameRecord } from '../data/db';
import { ALL, clearStats, exportStats, getGame, listGames, loadAggregates, recentAverages } from '../data/stats';
import { paletteById } from '../theme/palettes';
import { confirmDialog } from './confirm';

export interface StatsHandlers {
  back(): void;
  replay(game: GameRecord): void;
  /** Miniatura da imagem de uma partida (null = só números). */
  thumb(imageId: string): string | null;
}

const TABS: Array<{ key: string; label: string }> = [
  { key: '3', label: '3×3' },
  { key: '4', label: '4×4' },
  { key: '5', label: '5×5' },
  { key: '6', label: '6×6' },
  { key: ALL, label: 'TODOS' },
];
const CHART_GAMES = 20;
const LIST_GAMES = 30;

function date(ms: number): string {
  return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function createStatsScreen(h: StatsHandlers): { el: HTMLDivElement; show(size: number): void } {
  const root = el('div', 'screen stats-screen');
  root.hidden = true;
  root.setAttribute('role', 'region');
  root.setAttribute('aria-labelledby', 'stats-title');

  const head = el('header', 'stats-head');
  const back = el('button', 'stats-back', '◀ VOLTAR');
  const title = el('h2', undefined, 'ESTATÍSTICAS');
  title.id = 'stats-title';
  head.append(back, title);

  const tabs = el('div', 'stats-tabs');
  tabs.setAttribute('role', 'tablist');
  const body = el('div', 'stats-body');
  body.setAttribute('role', 'tabpanel');

  const actions = el('div', 'stats-actions');
  const exportBtn = el('button', 'pause-option', 'EXPORTAR');
  const resetBtn = el('button', 'pause-option stats-reset', 'ZERAR ESTATÍSTICAS');
  actions.append(exportBtn, resetBtn);

  root.append(head, tabs, body, actions);

  let current = '4';

  function renderTabs(): void {
    tabs.replaceChildren(
      ...TABS.map((t) => {
        const b = el('button', 'stats-tab', t.label);
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(t.key === current));
        b.dataset.tab = t.key;
        return b;
      }),
    );
  }

  function tile(label: string, value: string, sub?: string, thumb?: string | null): HTMLDivElement {
    const t = el('div', 'stat-tile');
    t.append(el('span', 'stat-tile-label', label), el('span', 'stat-tile-value', value));
    if (sub) t.append(el('span', 'stat-tile-sub', sub));
    if (thumb !== undefined) {
      const th = el('span', thumb ? 'stats-thumb' : 'stats-thumb stats-thumb--numbers', thumb ? '' : '123');
      if (thumb) th.style.backgroundImage = `url("${thumb}")`;
      t.append(th);
    }
    return t;
  }

  async function render(): Promise<void> {
    const key = current;
    const size = key === ALL ? undefined : Number(key);
    const [agg, games] = await Promise.all([loadAggregates(key), listGames(size)]);
    if (key !== current) return;
    const [bestTimeGame, bestMovesGame] = await Promise.all([
      agg.bestTimeGameId ? getGame(agg.bestTimeGameId) : undefined,
      agg.bestMovesGameId ? getGame(agg.bestMovesGameId) : undefined,
    ]);
    if (key !== current) return;
    body.replaceChildren(indicators(agg, games, bestTimeGame, bestMovesGame), chart(games), list(games));
  }

  function indicators(agg: Aggregates, games: GameRecord[], bt?: GameRecord, bm?: GameRecord): HTMLDivElement {
    const grid = el('div', 'stats-grid');
    const rate = agg.played ? Math.round((agg.won / agg.played) * 100) : 0;
    const avg = recentAverages(games);
    grid.append(
      tile('JOGADAS / CONCLUÍDAS', `${agg.played} / ${agg.won}`, `${rate}% CONCLUÍDAS`),
      tile(
        'MELHOR TEMPO',
        agg.bestTimeMs !== undefined ? formatTime(agg.bestTimeMs) : '—',
        bt ? date(bt.finishedAt) : undefined,
        bt ? h.thumb(bt.imageId) : undefined,
      ),
      tile('MENOS MOVIMENTOS', agg.bestMoves !== undefined ? String(agg.bestMoves) : '—', bm ? date(bm.finishedAt) : undefined),
      tile('MÉDIA (ÚLTIMAS 10)', avg ? formatTime(avg.timeMs) : '—', avg ? `${Math.round(avg.moves)} MOV.` : undefined),
      tile('SEQUÊNCIA', `${agg.currentStreak}`, `MAIOR: ${agg.bestStreak}`),
      tile('TEMPO TOTAL', formatTime(agg.totalTimeMs)),
    );
    return grid;
  }

  /** Barras pixeladas: tempo das últimas 20 partidas, a melhor destacada. */
  function chart(games: GameRecord[]): HTMLElement {
    const box = el('section', 'stats-chart');
    box.append(el('h3', undefined, 'ÚLTIMAS 20 PARTIDAS'));
    const last = games.slice(0, CHART_GAMES).reverse();
    if (!last.length) {
      box.append(el('p', 'stats-empty', 'NENHUMA PARTIDA AINDA.'));
      return box;
    }
    const max = Math.max(...last.map((g) => g.timeMs), 1);
    const wins = last.filter((g) => g.status === 'won');
    const best = wins.length ? Math.min(...wins.map((g) => g.timeMs)) : -1;
    const bars = el('div', 'stats-bars');
    bars.setAttribute('role', 'img');
    bars.setAttribute('aria-label', `Tempo das últimas ${last.length} partidas`);
    for (const g of last) {
      const b = el('span', 'stats-bar');
      // Altura em degraus de 1/16, para parecer pixel.
      b.style.setProperty('--h', String(Math.max(1, Math.round((g.timeMs / max) * 16))));
      if (g.status !== 'won') b.classList.add('stats-bar--abandoned');
      else if (g.timeMs === best) b.classList.add('stats-bar--best');
      b.title = `${formatTime(g.timeMs)} · ${g.status === 'won' ? 'concluída' : 'abandonada'}`;
      bars.append(b);
    }
    box.append(bars);
    return box;
  }

  function list(games: GameRecord[]): HTMLElement {
    const box = el('section', 'stats-list');
    box.append(el('h3', undefined, 'PARTIDAS'));
    const ul = el('ul');
    for (const g of games.slice(0, LIST_GAMES)) {
      const li = el('li');
      const b = el('button', 'stats-row');
      b.dataset.game = g.id;
      const th = h.thumb(g.imageId);
      const thumb = el('span', th ? 'stats-thumb' : 'stats-thumb stats-thumb--numbers', th ? '' : '123');
      if (th) thumb.style.backgroundImage = `url("${th}")`;
      const p = paletteById(g.paletteId);
      thumb.style.borderColor = p.bezel;
      const info = el('span', 'stats-row-info');
      info.append(
        el('span', undefined, `${date(g.finishedAt)} · ${g.size}×${g.size}`),
        el('span', undefined, `${formatTime(g.timeMs)} · ${g.moves} MOV.`),
      );
      const st = el('span', `stats-status stats-status--${g.status}`, g.status === 'won' ? 'OK' : 'ABAND.');
      b.append(thumb, info, st);
      b.setAttribute('aria-label', `${date(g.finishedAt)}, ${g.size} por ${g.size}, ${formatTime(g.timeMs)}, ${g.moves} movimentos, ${g.status === 'won' ? 'concluída' : 'abandonada'}`);
      li.append(b);
      ul.append(li);
    }
    if (!games.length) box.append(el('p', 'stats-empty', 'JOGUE UMA PARTIDA PARA VER AQUI.'));
    else box.append(ul);
    return box;
  }

  /** Detalhes de uma partida, com JOGAR DE NOVO (mesma semente, imagem e tamanho). */
  async function details(id: string): Promise<void> {
    const g = await getGame(id);
    if (!g) return;
    const dlg = el('dialog', 'menu stats-detail');
    const headEl = el('header', 'menu-head');
    headEl.append(el('h2', undefined, 'PARTIDA'));
    const close = el('button', 'icon-btn close-btn');
    close.setAttribute('aria-label', 'Fechar');
    close.innerHTML = '<span></span><span></span>';
    headEl.append(close);
    const bodyEl = el('div', 'menu-body');
    const dl = el('dl', 'stats-detail-list');
    const rows: Array<[string, string]> = [
      ['DATA', date(g.finishedAt)],
      ['TAMANHO', `${g.size}×${g.size}`],
      ['SITUAÇÃO', g.status === 'won' ? 'CONCLUÍDA' : 'ABANDONADA'],
      ['TEMPO', formatTime(g.timeMs)],
      ['MOVIMENTOS', String(g.moves)],
      ['ESPIADAS', String(g.peeks)],
      ['PALETA', paletteById(g.paletteId).name],
      ['SEMENTE', String(g.seed)],
    ];
    for (const [k, v] of rows) dl.append(el('dt', undefined, k), el('dd', undefined, v));
    const again = el('button', 'menu-primary', 'JOGAR DE NOVO');
    bodyEl.append(dl, again);
    dlg.append(headEl, bodyEl);
    close.addEventListener('click', () => dlg.close());
    again.addEventListener('click', () => {
      dlg.close();
      h.replay(g);
    });
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
  }

  tabs.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
    if (!b) return;
    current = b.dataset.tab!;
    renderTabs();
    void render();
  });
  body.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-game]');
    if (b) void details(b.dataset.game!);
  });
  back.addEventListener('click', () => h.back());
  exportBtn.addEventListener('click', async () => {
    const data = await exportStats();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = el('a');
    a.href = url;
    a.download = `racha-cuca-estatisticas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  resetBtn.addEventListener('click', async () => {
    // Confirmação dupla (seção 8.2).
    if (!(await confirmDialog('ZERAR ESTATÍSTICAS?', 'APAGA O HISTÓRICO E OS RECORDES DESTE APARELHO.'))) return;
    if (!(await confirmDialog('TEM CERTEZA?', 'NÃO DÁ PARA DESFAZER.', 'ZERAR', 'CANCELAR'))) return;
    await clearStats();
    void render();
  });

  return {
    el: root,
    show(size) {
      current = String(size);
      renderTabs();
      void render();
      root.scrollTop = 0;
    },
  };
}
