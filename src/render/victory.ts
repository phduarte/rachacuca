/**
 * Efeito de vitória (seção 7): a tela escurece, uma corrente elétrica nasce
 * na casa vazia (canto inferior direito) e corre pelas frestas entre as peças
 * até cobrir a grade, sobrecarrega soltando faíscas e explode num curto-
 * -circuito, deixando a tela clara de novo. Desenhado num <canvas> do tamanho
 * da viewport, sobre o jogo. Um toque pula para o fim.
 */

// Linha do tempo, em ms desde o início.
const SHADE_END = 400; // escurece
const PROP_END = 2000; // corrente percorre as frestas
const OVERLOAD_END = 2500; // grade acesa, faíscas, tremor
const BLAST_END = 2900; // clarão, anel de choque, raios, faíscas
const SETTLE_END = 3600; // brasas caindo
const REVEAL_AT = BLAST_END - 250; // mensagem aparece com o clarão sumindo
const SKIP_AFTER = 300; // toques antes disso não pulam (é o próprio lance final)

/** Linha do tempo para o som acompanhar a imagem (seção 7.2). */
export const VICTORY_TIMES = { propStart: SHADE_END, propEnd: PROP_END, blastAt: OVERLOAD_END } as const;

const SHADE_ALPHA = 0.72;
const MAX_PARTICLES = 400;
const GRAVITY = 900; // px/s²

interface Geometry {
  left: number;
  top: number;
  side: number;
  gap: number;
  n: number;
}

interface Edge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Nível na busca em largura a partir do canto inferior direito. */
  level: number;
  pts: number[];
}

export interface VictoryCallbacks {
  /** Hora de mostrar a mensagem de vitória. */
  reveal(): void;
  /** Efeito terminou (ou foi pulado). */
  done(): void;
}

export class VictoryEffect {
  readonly canvas: HTMLCanvasElement;
  /** Vibrar na explosão (opção do jogador). */
  vibration = true;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private start = 0;
  private last = 0;
  private frame = 0;
  private dpr = 1;
  private vw = 0;
  private vh = 0;
  private board: HTMLElement | null = null;
  private geo: Geometry = { left: 0, top: 0, side: 0, gap: 0, n: 0 };
  private edges: Edge[] = [];
  private bolts: number[][] = [];
  private glow = '#29adff';
  private reduced = false;
  /** Modo leve (seção 7.3): sem shadowBlur e com menos partículas. */
  private light = false;
  private slowFrames = 0;
  private blasted = false;
  private revealed = false;
  private cb: VictoryCallbacks | null = null;

  // Pool de partículas pré-alocado (seção 7.2).
  private px = new Float32Array(MAX_PARTICLES);
  private py = new Float32Array(MAX_PARTICLES);
  private pvx = new Float32Array(MAX_PARTICLES);
  private pvy = new Float32Array(MAX_PARTICLES);
  private plife = new Float32Array(MAX_PARTICLES);
  private pmax = new Float32Array(MAX_PARTICLES);
  private pnext = 0;

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
    this.blasted = false;
    this.revealed = false;
    this.frame = 0;
    this.plife.fill(0);
    this.glow = getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() || '#29adff';
    this.measure();
    this.canvas.classList.add('active');
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointerdown', this.onSkip, true);
    window.addEventListener('keydown', this.onSkip, true);
    this.start = this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /** Pula direto para o resultado. */
  skip(): void {
    if (!this.playing) return;
    const cb = this.cb;
    const revealed = this.revealed;
    this.stop();
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

  /** Tamanho do canvas e posição das frestas na tela. */
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
    this.buildEdges();
  }

  /**
   * Grafo das frestas: nós nos cruzamentos da grade ((N+1)² pontos), arestas
   * entre vizinhos. O nível de cada nó na busca em largura a partir do canto
   * inferior direito é a distância de Manhattan até ele; cada aresta vai do
   * nó mais perto ao mais longe.
   */
  private buildEdges(): void {
    const { left, top, side, gap, n } = this.geo;
    const cell = (side - gap) / n - gap;
    const at = (i: number) => i * (cell + gap) + gap / 2;
    const level = (r: number, c: number) => n - r + (n - c);
    this.edges = [];
    for (let r = 0; r <= n; r++) {
      for (let c = 0; c <= n; c++) {
        const x = left + at(c);
        const y = top + at(r);
        // Horizontal: de (r, c+1), mais perto do canto, para (r, c).
        if (c < n) this.edges.push({ ax: left + at(c + 1), ay: y, bx: x, by: y, level: level(r, c + 1), pts: [] });
        // Vertical: de (r+1, c) para (r, c).
        if (r < n) this.edges.push({ ax: x, ay: top + at(r + 1), bx: x, by: y, level: level(r + 1, c), pts: [] });
      }
    }
  }

  private tick = (now: number) => {
    const t = now - this.start;
    const dt = Math.min((now - this.last) / 1000, 0.05);
    // Seção 7.3: média acima de 20 ms por quadro no começo → modo leve.
    if (t < 400 && now - this.last > 20) this.slowFrames++;
    if (!this.light && this.slowFrames >= 6) this.light = true;
    this.last = now;
    this.frame++;

    if (!this.revealed && t >= REVEAL_AT) {
      this.revealed = true;
      this.cb?.reveal();
    }
    if (t >= SETTLE_END) {
      const cb = this.cb;
      this.stop();
      cb?.done();
      return;
    }

    this.shake(t);
    this.draw(t, dt);
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Tranco ao encaixar e tremor na sobrecarga (nada disso com movimento reduzido). */
  private shake(t: number): void {
    const b = this.board!;
    let dx = 0;
    let dy = 0;
    if (!this.reduced) {
      if (t < 120) dy = 4 * (1 - t / 120);
      else if (t >= PROP_END && t < BLAST_END - 200) {
        dx = rand(-3, 3);
        dy = rand(-3, 3);
      }
    }
    b.style.translate = dx || dy ? `${dx.toFixed(1)}px ${dy.toFixed(1)}px` : '';
    this.offX = dx;
    this.offY = dy;
  }

  private offX = 0;
  private offY = 0;

  private draw(t: number, dt: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.vw, this.vh);

    // Sombreamento: escurece, segura e some por trás do clarão.
    let shade = SHADE_ALPHA;
    if (t < SHADE_END) shade *= t / SHADE_END;
    else if (t >= OVERLOAD_END) shade *= Math.max(0, 1 - (t - OVERLOAD_END) / (BLAST_END - OVERLOAD_END));
    if (shade > 0) {
      ctx.fillStyle = `rgb(0 0 0 / ${shade})`;
      ctx.fillRect(0, 0, this.vw, this.vh);
    }

    ctx.save();
    ctx.translate(this.offX, this.offY);
    this.drawCurrent(t);
    ctx.restore();

    if (!this.reduced) {
      this.emitSparks(t);
      this.drawBlast(t);
      this.updateParticles(dt);
      this.drawParticles();
    }
  }

  /** A corrente pelas frestas. */
  private drawCurrent(t: number): void {
    if (t < SHADE_END * 0.75 || t >= BLAST_END) return;
    const { n, side } = this.geo;
    const levels = 2 * n;
    const step = (PROP_END - SHADE_END) / levels;
    const jitter = !this.reduced && this.frame % (this.light ? 4 : 3) === 0;
    const amp = this.reduced ? 0 : 0.15;

    let alpha = 1;
    let width = 1;
    if (t >= OVERLOAD_END) alpha = 1 - (t - OVERLOAD_END) / (BLAST_END - OVERLOAD_END);
    else if (t >= PROP_END) {
      // Sobrecarga: brilho subindo e pulsando abaixo de 3 Hz (WCAG 2.3.1).
      const k = (t - PROP_END) / (OVERLOAD_END - PROP_END);
      width = 1 + k * 0.8;
      if (!this.reduced) alpha = 0.8 + 0.2 * Math.sin(k * Math.PI * 2 * 1.2);
    }
    if (this.reduced && t >= PROP_END) alpha *= 0.85;

    const path = new Path2D();
    for (const e of this.edges) {
      const p = Math.min(1, Math.max(0, (t - SHADE_END - e.level * step) / step));
      if (p <= 0) continue;
      const bx = e.ax + (e.bx - e.ax) * p;
      const by = e.ay + (e.by - e.ay) * p;
      if (p < 1 || jitter || e.pts.length === 0) {
        e.pts.length = 0;
        e.pts.push(e.ax, e.ay);
        jag(e.pts, e.ax, e.ay, bx, by, amp, 4);
      }
      path.moveTo(e.pts[0]!, e.pts[1]!);
      for (let i = 2; i < e.pts.length; i += 2) path.lineTo(e.pts[i]!, e.pts[i + 1]!);
    }

    const ctx = this.ctx;
    const base = Math.max(2, side / 120);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.4 * alpha;
    ctx.strokeStyle = this.glow;
    ctx.lineWidth = base * 3 * width;
    if (!this.light) {
      ctx.shadowColor = this.glow;
      ctx.shadowBlur = 12;
    }
    ctx.stroke(path);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1.5, base * 0.75) * width;
    ctx.stroke(path);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Faíscas saltando dos cruzamentos na sobrecarga e a explosão. */
  private emitSparks(t: number): void {
    if (t >= PROP_END - 200 && t < OVERLOAD_END) {
      const per = this.light ? 2 : 4;
      for (let i = 0; i < per; i++) {
        const e = this.edges[(Math.random() * this.edges.length) | 0]!;
        const a = Math.random() * Math.PI * 2;
        const s = rand(120, 360);
        this.spawn(e.bx, e.by, Math.cos(a) * s, Math.sin(a) * s - 120, rand(0.25, 0.6));
      }
    }
    if (!this.blasted && t >= OVERLOAD_END) {
      this.blasted = true;
      const { cx, cy } = this.center();
      const count = this.light ? 75 : 150;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(200, 950);
        this.spawn(cx + rand(-10, 10), cy + rand(-10, 10), Math.cos(a) * s, Math.sin(a) * s - 150, rand(0.6, 1.3));
      }
      // 8–12 raios radiais até as bordas da tela.
      const reach = Math.hypot(this.vw, this.vh);
      const k = 8 + ((Math.random() * 5) | 0);
      this.bolts = [];
      for (let i = 0; i < k; i++) {
        const a = (i / k) * Math.PI * 2 + rand(-0.2, 0.2);
        this.bolts.push([a, reach]);
      }
      if (this.vibration) navigator.vibrate?.([20, 40, 20, 40, 120]);
    }
  }

  private center(): { cx: number; cy: number } {
    const { left, top, side } = this.geo;
    return { cx: left + side / 2, cy: top + side / 2 };
  }

  /** Clarão (uma vez só), anel de choque e raios radiais. */
  private drawBlast(t: number): void {
    if (t < OVERLOAD_END) return;
    const ctx = this.ctx;
    const k = (t - OVERLOAD_END) / (BLAST_END - OVERLOAD_END);
    const { cx, cy } = this.center();

    // Raios radiais, tremendo e sumindo.
    const boltK = Math.min(1, (t - OVERLOAD_END) / (BLAST_END - OVERLOAD_END + 200));
    if (boltK < 1) {
      const path = new Path2D();
      for (const [a, reach] of this.bolts as [number, number][]) {
        const pts = [cx, cy];
        jag(pts, cx, cy, cx + Math.cos(a) * reach, cy + Math.sin(a) * reach, 0.12, 5);
        path.moveTo(pts[0]!, pts[1]!);
        for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i]!, pts[i + 1]!);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * (1 - boltK);
      ctx.strokeStyle = this.glow;
      ctx.lineWidth = 6;
      ctx.stroke(path);
      ctx.globalAlpha = 1 - boltK;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke(path);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Anel de choque saindo do centro.
    const ringK = Math.min(1, (t - OVERLOAD_END) / 500);
    if (ringK < 1) {
      const r = easeOut(ringK) * Math.hypot(this.vw, this.vh) * 0.6;
      ctx.globalAlpha = 1 - ringK;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 + 10 * (1 - ringK);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Clarão branco: 0 → 0,9 → 0.
    if (k < 1) {
      const flash = k < 0.25 ? (k / 0.25) * 0.9 : 0.9 * (1 - (k - 0.25) / 0.75);
      ctx.globalAlpha = flash;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, this.vw, this.vh);
    }
    ctx.globalAlpha = 1;
  }

  private spawn(x: number, y: number, vx: number, vy: number, life: number): void {
    const i = this.pnext;
    this.pnext = (i + 1) % MAX_PARTICLES;
    this.px[i] = x;
    this.py[i] = y;
    this.pvx[i] = vx;
    this.pvy[i] = vy;
    this.plife[i] = life;
    this.pmax[i] = life;
  }

  private updateParticles(dt: number): void {
    const drag = Math.pow(0.15, dt);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.plife[i]! <= 0) continue;
      this.plife[i]! -= dt;
      this.pvx[i]! *= drag;
      this.pvy[i] = this.pvy[i]! * drag + GRAVITY * dt;
      this.px[i]! += this.pvx[i]! * dt;
      this.py[i]! += this.pvy[i]! * dt;
    }
  }

  /** Cada faísca é um risco na direção do movimento: branca quando nova, cor do brilho ao esfriar. */
  private drawParticles(): void {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const hot of [true, false]) {
      ctx.strokeStyle = hot ? '#fff7d6' : this.glow;
      ctx.lineWidth = hot ? 2 : 1.5;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const life = this.plife[i]!;
        if (life <= 0) continue;
        const k = life / this.pmax[i]!;
        if (k > 0.5 !== hot) continue;
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.beginPath();
        ctx.moveTo(this.px[i]!, this.py[i]!);
        ctx.lineTo(this.px[i]! - this.pvx[i]! * 0.025, this.py[i]! - this.pvy[i]! * 0.025);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

/**
 * Linha quebrada por deslocamento do ponto médio: acrescenta a `out` os
 * pontos de (x1, y1) exclusive até (x2, y2) inclusive.
 */
function jag(out: number[], x1: number, y1: number, x2: number, y2: number, amp: number, depth: number): void {
  if (depth === 0 || amp === 0) {
    out.push(x2, y2);
    return;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const off = (Math.random() * 2 - 1) * amp * len;
  const mx = (x1 + x2) / 2 + (len ? (-dy / len) * off : 0);
  const my = (y1 + y2) / 2 + (len ? (dx / len) * off : 0);
  jag(out, x1, y1, mx, my, amp, depth - 1);
  jag(out, mx, my, x2, y2, amp, depth - 1);
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function easeOut(k: number): number {
  return 1 - (1 - k) ** 3;
}
