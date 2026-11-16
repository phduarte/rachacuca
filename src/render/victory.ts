/**
 * Efeito de vitória (seção 7): luz neon percorrendo o tabuleiro.
 *
 * A última peça entra no encaixe com um tranco de 4 px e as frestas
 * escurecem; dois cometas de neon contornam o tabuleiro a partir do canto
 * onde ela entrou; uma varredura acende as linhas da grade na diagonal; o
 * tabuleiro todo acende num brilho suave; o neon apaga e as frestas fecham,
 * deixando a imagem inteira. Desenhado num <canvas> do tamanho da viewport,
 * sobre o jogo. Um toque pula direto para o estado final.
 *
 * Sem pisca-pisca nem clarão (WCAG 2.3.1): o brilho sobe e desce uma vez.
 * Com movimento reduzido, sem tranco nem cometas: a grade acende em
 * sequência, suave, e apaga.
 */

// Linha do tempo, em ms desde o início.
const SNAP_END = 300; // encaixe da última peça
const BORDER_END = 1100; // cometas contornam o tabuleiro
const SWEEP_END = 1900; // varredura acende a grade na diagonal
const GLOW_END = 2300; // tabuleiro todo aceso
const SETTLE_AT = 2300; // neon apaga e as frestas fecham
const REVEAL_AT = 2400; // painel de resultado sobe
const END = 2800;
const SKIP_AFTER = 300; // toques antes disso não pulam (é o próprio lance final)

/** Linha do tempo para o som acompanhar a imagem (seção 7.2). */
export const VICTORY_TIMES = { propStart: SNAP_END, propEnd: SWEEP_END, blastAt: SWEEP_END } as const;

const SHADE_ALPHA = 0.6;

interface Geometry {
  left: number;
  top: number;
  side: number;
  gap: number;
  n: number;
}

interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Ordem na varredura diagonal, a partir do canto inferior direito. */
  level: number;
}

export interface VictoryCallbacks {
  /** Assentamento: hora de fechar as frestas. */
  settle(): void;
  /** Hora de mostrar o resultado. */
  reveal(): void;
  /** Efeito terminou (ou foi pulado). */
  done(): void;
}

export class VictoryEffect {
  readonly canvas: HTMLCanvasElement;
  /** Vibrar quando o tabuleiro acende (opção do jogador). */
  vibration = true;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private start = 0;
  private last = 0;
  private dpr = 1;
  private vw = 0;
  private vh = 0;
  private board: HTMLElement | null = null;
  private geo: Geometry = { left: 0, top: 0, side: 0, gap: 0, n: 0 };
  private grid: Segment[] = [];
  private neonA = '#29adff';
  private neonB = '#ff2a6d';
  private reduced = false;
  /** Modo leve (seção 7.3): sem shadowBlur. */
  private light = false;
  private slowFrames = 0;
  private lit = false;
  private settled = false;
  private revealed = false;
  private cb: VictoryCallbacks | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'victory-fx';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d')!;
  }

  get playing(): boolean {
    return this.raf !== 0;
  }

  play(board: HTMLElement, size: number, cb: VictoryCallbacks): void {
    this.cancel();
    this.board = board;
    this.cb = cb;
    this.geo.n = size;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.light = false;
    this.slowFrames = 0;
    this.lit = false;
    this.settled = false;
    this.revealed = false;
    const css = getComputedStyle(document.documentElement);
    this.neonA = css.getPropertyValue('--glow').trim() || '#29adff';
    this.neonB = css.getPropertyValue('--accent').trim() || '#ff2a6d';
    this.measure();
    this.canvas.classList.add('active');
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointerdown', this.onSkip, true);
    window.addEventListener('keydown', this.onSkip, true);
    this.start = this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /** Pula direto para o estado final: imagem inteira e resultado. */
  skip(): void {
    if (!this.playing) return;
    const cb = this.cb;
    const { settled, revealed } = this;
    this.stop();
    if (!settled) cb?.settle();
    if (!revealed) cb?.reveal();
    cb?.done();
  }

  /** Interrompe sem avisar (novo jogo no meio do efeito). */
  cancel(): void {
    if (this.playing) this.stop();
  }

  private stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.cb = null;
    this.canvas.classList.remove('active');
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.board) this.board.style.translate = '';
    this.board = null;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointerdown', this.onSkip, true);
    window.removeEventListener('keydown', this.onSkip, true);
  }

  private onResize = () => this.measure();

  private onSkip = () => {
    if (performance.now() - this.start >= SKIP_AFTER) this.skip();
  };

  /** Tamanho do canvas e posição do tabuleiro e das linhas da grade na tela. */
  private measure(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.canvas.width = Math.round(this.vw * this.dpr);
    this.canvas.height = Math.round(this.vh * this.dpr);

    const b = this.board!;
    const shake = b.style.translate;
    b.style.translate = '';
    const rect = b.getBoundingClientRect();
    b.style.translate = shake;
    const g = this.geo;
    g.left = rect.left + b.clientLeft;
    g.top = rect.top + b.clientTop;
    g.side = b.clientWidth;
    g.gap = parseFloat(getComputedStyle(b).getPropertyValue('--gap')) || 0;
    this.buildGrid();
  }

  /**
   * Linhas internas da grade (as frestas entre as peças), em segmentos de uma
   * casa. A ordem de cada segmento na varredura é a distância de Manhattan
   * até o canto inferior direito, onde a última peça entrou.
   */
  private buildGrid(): void {
    const { left, top, side, gap, n } = this.geo;
    const cell = (side - gap) / n - gap;
    const at = (i: number) => i * (cell + gap) + gap / 2;
    const level = (r: number, c: number) => n - r + (n - c);
    this.grid = [];
    for (let r = 0; r <= n; r++) {
      for (let c = 0; c <= n; c++) {
        // Só as linhas internas: o contorno é dos cometas.
        if (c < n && r > 0 && r < n) {
          this.grid.push({ ax: left + at(c + 1), ay: top + at(r), bx: left + at(c), by: top + at(r), level: level(r, c + 1) });
        }
        if (r < n && c > 0 && c < n) {
          this.grid.push({ ax: left + at(c), ay: top + at(r + 1), bx: left + at(c), by: top + at(r), level: level(r + 1, c) });
        }
      }
    }
  }

  private tick = (now: number) => {
    const t = now - this.start;
    // Seção 7.3: quadros lentos no começo → modo leve (sem shadowBlur).
    if (t < 400 && now - this.last > 20) this.slowFrames++;
    if (!this.light && this.slowFrames >= 6) this.light = true;
    this.last = now;

    if (!this.lit && t >= SWEEP_END) {
      this.lit = true;
      if (this.vibration) navigator.vibrate?.([30, 60, 30]);
    }
    if (!this.settled && t >= SETTLE_AT) {
      this.settled = true;
      this.cb?.settle();
    }
    if (!this.revealed && t >= REVEAL_AT) {
      this.revealed = true;
      this.cb?.reveal();
    }
    if (t >= END) {
      const cb = this.cb;
      this.stop();
      cb?.done();
      return;
    }

    this.jolt(t);
    this.draw(t);
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Tranco de 4 px no encaixe (sem ele com movimento reduzido). */
  private jolt(t: number): void {
    const b = this.board!;
    const dy = !this.reduced && t < 140 ? 4 * (1 - t / 140) : 0;
    b.style.translate = dy ? `0 ${dy.toFixed(1)}px` : '';
  }

  private draw(t: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.vw, this.vh);

    // A tela escurece para o neon brilhar, e clareia no assentamento.
    let shade = SHADE_ALPHA * Math.min(1, t / SNAP_END);
    if (t >= SETTLE_AT) shade *= Math.max(0, 1 - (t - SETTLE_AT) / (END - SETTLE_AT));
    if (shade > 0) {
      const { left, top, side } = this.geo;
      ctx.fillStyle = `rgb(0 0 0 / ${shade})`;
      // Escurece em volta do tabuleiro; o tabuleiro em si fica visível.
      ctx.beginPath();
      ctx.rect(0, 0, this.vw, this.vh);
      ctx.rect(left + side, top, -side, side);
      ctx.fill('evenodd');
    }

    // Intensidade geral do neon: acende, brilha uma vez e apaga.
    let power = 1;
    if (t >= SWEEP_END && t < GLOW_END && !this.reduced) {
      const k = (t - SWEEP_END) / (GLOW_END - SWEEP_END);
      power = 1 + 0.6 * Math.sin(k * Math.PI);
    } else if (t >= SETTLE_AT) {
      power = Math.max(0, 1 - (t - SETTLE_AT) / (END - SETTLE_AT - 100));
    }
    if (power <= 0) return;

    this.drawBorder(t, power);
    this.drawGrid(t, power);
  }

  /** Traço de neon em três passadas: halo largo, tubo colorido e núcleo claro. */
  private neon(path: Path2D, color: string, power: number, width: number): void {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = Math.min(1, 0.22 * power);
    ctx.lineWidth = width * 4;
    if (!this.light) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
    }
    ctx.stroke(path);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = Math.min(1, 0.75 * power);
    ctx.lineWidth = width * 1.6;
    ctx.stroke(path);
    ctx.globalAlpha = Math.min(1, 0.9 * power);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, width * 0.55);
    ctx.stroke(path);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Contorno: dois cometas saem do canto inferior direito, um subindo pela
   * direita e outro indo pela base, e se encontram no canto superior esquerdo.
   */
  private drawBorder(t: number, power: number): void {
    const { left, top, side } = this.geo;
    const L = left + 1;
    const T = top + 1;
    const R = left + side - 1;
    const B = top + side - 1;
    const k = this.reduced ? Math.min(1, Math.max(0, (t - SNAP_END) / 300)) : easeInOut(clamp01((t - SNAP_END) / (BORDER_END - SNAP_END)));
    if (k <= 0) return;
    const width = Math.max(2.5, side / 110);
    const path = new Path2D();
    if (this.reduced) {
      // Sem cometas: o contorno acende inteiro, devagar.
      path.rect(L, T, R - L, B - T);
      this.neon(path, this.neonB, power * k, width);
      return;
    }
    const len = 2 * (R - L) * k;
    const heads: Array<[number, number]> = [];
    // Cometa 1: sobe pela direita, depois vai pela borda de cima.
    heads.push(trace(path, [[R, B], [R, T], [L, T]], len));
    // Cometa 2: vai pela base, depois sobe pela esquerda.
    heads.push(trace(path, [[R, B], [L, B], [L, T]], len));
    this.neon(path, this.neonB, power, width);
    // Cabeças dos cometas: um ponto de luz mais forte, enquanto correm.
    if (k < 1) {
      const ctx = this.ctx;
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y] of heads) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, width * 6);
        g.addColorStop(0, 'rgb(255 255 255 / 0.95)');
        g.addColorStop(0.3, this.neonB);
        g.addColorStop(1, 'rgb(0 0 0 / 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - width * 6, y - width * 6, width * 12, width * 12);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** Varredura: as linhas da grade acendem na diagonal, do canto da última peça. */
  private drawGrid(t: number, power: number): void {
    if (t < BORDER_END - 200) return;
    const levels = 2 * this.geo.n + 1;
    const step = (SWEEP_END - (BORDER_END - 200)) / levels;
    const path = new Path2D();
    for (const s of this.grid) {
      const p = clamp01((t - (BORDER_END - 200) - s.level * step) / (step * 2));
      if (p <= 0) continue;
      path.moveTo(s.ax, s.ay);
      path.lineTo(s.ax + (s.bx - s.ax) * p, s.ay + (s.by - s.ay) * p);
    }
    this.neon(path, this.neonA, power, Math.max(1.5, this.geo.side / 200));
  }
}

/**
 * Acrescenta a `path` o trecho inicial de comprimento `len` da polilinha
 * `pts` e devolve a ponta.
 */
function trace(path: Path2D, pts: Array<[number, number]>, len: number): [number, number] {
  let [x, y] = pts[0]!;
  path.moveTo(x, y);
  let left = len;
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [nx, ny] = pts[i]!;
    const d = Math.hypot(nx - x, ny - y);
    const k = Math.min(1, left / d);
    x += (nx - x) * k;
    y += (ny - y) * k;
    path.lineTo(x, y);
    left -= d;
  }
  return [x, y];
}

function clamp01(k: number): number {
  return Math.max(0, Math.min(1, k));
}

function easeInOut(k: number): number {
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}
