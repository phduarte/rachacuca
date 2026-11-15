/**
 * Efeitos sonoros sintetizados com Web Audio (seções 6.2, 6.3 e 7.2).
 * Nada de arquivos: cada som é montado na hora, com pequenas variações
 * aleatórias para não soar repetido. Um único AudioContext para o app todo,
 * criado e destravado no primeiro toque (exigência do iOS e do Chrome).
 */

/** Pico do estalo, por volta de −24 dBFS (seção 6.2). */
const BASE = 0.063;
/** Volume geral por nível das opções: desligado, baixo, médio, alto. */
export const VOLUME_LEVELS = [0, 0.5, 1, 1.8] as const;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let volume: number = VOLUME_LEVELS[2];

/** Cria (se preciso) e retoma o AudioContext. Chamar dentro de um gesto. */
export function unlockAudio(): void {
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      return;
    }
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    noiseBuf = makeNoise(ctx, 1);
  }
  if (ctx.state !== 'running') void ctx.resume().catch(() => {});
}

/** Nível de 0 a 3 (VOLUME_LEVELS). */
export function setVolume(level: number): void {
  volume = VOLUME_LEVELS[Math.max(0, Math.min(VOLUME_LEVELS.length - 1, level | 0))]!;
  if (ctx && master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
}

/** Contexto pronto para tocar agora (e com som ligado). */
function ready(): AudioContext | null {
  return ctx && master && noiseBuf && ctx.state === 'running' && volume > 0 ? ctx : null;
}

function makeNoise(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.round(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const db = (v: number) => Math.pow(10, v / 20);

/** Fonte de ruído branco começando num ponto aleatório do buffer. */
function noise(c: AudioContext, t: number, dur: number): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.start(t, Math.random() * 0.5, dur + 0.02);
  return src;
}

/** Envelope: ataque linear e queda exponencial. */
function env(c: AudioContext, t: number, peak: number, attack: number, decay: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

/**
 * Estalo de acrílico (seção 6.2): rajada de ruído de 15 ms num passa-banda
 * de 3,2 kHz (Q 8) mais uma senoide de 1,9 kHz 12 dB abaixo, com ±6% na
 * frequência e ±2 dB no volume a cada toque.
 */
export function click(scale = 1, delayS = 0, out?: AudioNode): void {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + delayS;
  const dest = out ?? master!;
  const peak = BASE * scale * db(rand(-2, 2));

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200 * rand(0.94, 1.06);
  bp.Q.value = 8;
  // O passa-banda estreito deixa passar pouca energia do ruído: compensa.
  const n = env(c, t, peak * 4.5, 0.001, 0.025);
  noise(c, t, 0.015).connect(bp).connect(n).connect(dest);

  const osc = c.createOscillator();
  osc.frequency.value = 1900 * rand(0.94, 1.06);
  const body = env(c, t, peak * db(-12), 0.001, 0.04);
  osc.connect(body).connect(dest);
  osc.start(t);
  osc.stop(t + 0.05);
}

/** Deslize em fila: um estalo por peça, a cada 18 ms, caindo 15% por estalo. */
export function slide(count: number): void {
  for (let i = 0; i < count; i++) click(Math.pow(0.85, i), i * 0.018);
}

/** "Tunc" grave e abafado de 60 ms: peça que não pode mexer. */
export function thud(scale = 1, delayS = 0, out?: AudioNode): void {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + delayS;
  const dest = out ?? master!;
  const peak = BASE * 2.2 * scale;

  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(rand(150, 170), t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
  osc.connect(env(c, t, peak, 0.002, 0.06)).connect(dest);
  osc.start(t);
  osc.stop(t + 0.08);

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  noise(c, t, 0.03).connect(lp).connect(env(c, t, peak * 0.8, 0.001, 0.03)).connect(dest);
}

/** Chacoalhar ao embaralhar: 12 estalos aleatórios em 600 ms. */
export function rattle(durationMs = 600, count = 12): void {
  for (let i = 0; i < count; i++) click(rand(0.45, 1), Math.random() * (durationMs / 1000));
}

/** Bipe de onda quadrada, 1 kHz, 30 ms (menus). */
export function beep(): void {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 1000;
  const g = c.createGain();
  g.gain.setValueAtTime(BASE * 0.4, t);
  g.gain.setValueAtTime(BASE * 0.4, t + 0.025);
  g.gain.linearRampToValueAtTime(0, t + 0.03);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + 0.035);
}

/** Momentos da linha do tempo do efeito de vitória, em ms. */
export interface VictoryTimes {
  propStart: number;
  propEnd: number;
  blastAt: number;
}

/**
 * Som da vitória (seção 7.2): estalo forte do encaixe, zumbido de dente-de-
 * -serra a 60 Hz com passa-baixa abrindo de 200 Hz a 2 kHz durante a
 * propagação, estalos de faísca, subida de tom na sobrecarga e, na explosão,
 * ruído de 400 ms com queda e um "boom" senoidal de 50 Hz.
 * Retorna uma função que corta o som (toque para pular, novo jogo).
 */
export function victory(times: VictoryTimes): () => void {
  const c = ready();
  if (!c) return () => {};
  const t0 = c.currentTime;
  const ps = t0 + times.propStart / 1000;
  const pe = t0 + times.propEnd / 1000;
  const bl = t0 + times.blastAt / 1000;

  const bus = c.createGain();
  bus.connect(master!);
  const nodes: AudioScheduledSourceNode[] = [];

  // Encaixe da última peça.
  click(2, 0, bus);
  thud(1, 0, bus);

  // Zumbido elétrico.
  const hum = c.createOscillator();
  hum.type = 'sawtooth';
  hum.frequency.setValueAtTime(60, ps);
  hum.frequency.setValueAtTime(60, pe);
  hum.frequency.exponentialRampToValueAtTime(110, bl);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 6;
  lp.frequency.setValueAtTime(200, ps);
  lp.frequency.exponentialRampToValueAtTime(2000, pe);
  lp.frequency.exponentialRampToValueAtTime(3500, bl);
  const humGain = c.createGain();
  humGain.gain.setValueAtTime(0, ps);
  humGain.gain.linearRampToValueAtTime(BASE * 1.2, ps + 0.3);
  humGain.gain.linearRampToValueAtTime(BASE * 1.8, pe);
  humGain.gain.linearRampToValueAtTime(BASE * 2.6, bl - 0.01);
  humGain.gain.linearRampToValueAtTime(0, bl + 0.02);
  hum.connect(lp).connect(humGain).connect(bus);
  hum.start(ps);
  hum.stop(bl + 0.05);
  nodes.push(hum);

  // Faíscas: estalos de ruído agudo, cada vez mais frequentes.
  const span = bl - ps;
  for (let i = 0; i < 45; i++) {
    const k = Math.sqrt(Math.random()); // mais perto do fim
    const t = ps + k * span;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = rand(2500, 6000);
    const src = noise(c, t, 0.012);
    src.connect(hp).connect(env(c, t, BASE * rand(0.6, 1.6) * (0.5 + k), 0.001, rand(0.008, 0.02))).connect(bus);
    nodes.push(src);
  }

  // Explosão: ruído com queda e passa-baixa fechando.
  const boomLp = c.createBiquadFilter();
  boomLp.type = 'lowpass';
  boomLp.frequency.setValueAtTime(5000, bl);
  boomLp.frequency.exponentialRampToValueAtTime(250, bl + 0.4);
  const blast = noise(c, bl, 0.45);
  blast.connect(boomLp).connect(env(c, bl, BASE * 5, 0.003, 0.4)).connect(bus);
  nodes.push(blast);

  const boom = c.createOscillator();
  boom.frequency.setValueAtTime(110, bl);
  boom.frequency.exponentialRampToValueAtTime(50, bl + 0.08);
  boom.connect(env(c, bl, BASE * 6, 0.004, 0.6)).connect(bus);
  boom.start(bl);
  boom.stop(bl + 0.7);
  nodes.push(boom);

  let stopped = false;
  return () => {
    if (stopped || !ctx) return;
    stopped = true;
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0, now + 0.06);
    for (const n of nodes) {
      try {
        n.stop(now + 0.08);
      } catch {
        /* já parou */
      }
    }
    setTimeout(() => bus.disconnect(), 200);
  };
}
