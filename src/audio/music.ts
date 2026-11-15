/**
 * Música opcional (seção 6.3): chiptune original em loop, com pulso de 25%
 * na melodia, triângulo no baixo e ruído na bateria, por volta de −30 dB.
 * Padrão desligada. Usa o AudioContext dos efeitos (um só para o app) e
 * agenda as notas um pouco à frente do relógio do áudio, para não atrasar
 * quando a thread principal engasga.
 */
import { audioContext } from './sfx';

const BPM = 132;
/** Duração de uma semicolcheia (16 passos por compasso). */
const STEP = 60 / BPM / 4;
/** Volume do bus da música: −30 dB (seção 6.3). */
const LEVEL = Math.pow(10, -30 / 20);
/** Quanto do futuro agendar a cada volta do relógio, em segundos. */
const LOOKAHEAD = 0.15;
const TICK_MS = 30;

/*
 * Partitura em lá menor: Am F C G | Am F G E. Um token por semicolcheia:
 * nota ("A4", "G#4"), "-" segura a anterior e "." é pausa.
 */
const LEAD = [
  'E5 - . A4 C5 - E5 - D5 - C5 - B4 - A4 -',
  'C5 - - - A4 - F4 - A4 - C5 - F5 - - -',
  'G5 - E5 - C5 - E5 - G5 - - C6 - - B5 -',
  'D5 - - - B4 - G4 - B4 - D5 - . . . .',
  'E5 - . A4 C5 - E5 - A5 - G5 - E5 - C5 -',
  'F5 - E5 - C5 - A4 - C5 - - - A4 - - -',
  'B4 - D5 - G5 - - - F5 - E5 - D5 - B4 -',
  'G#4 - B4 - E5 - - - D5 - - - B4 - G#4 -',
];
const BASS_ROOTS = ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'G2', 'E2'];
/** Bateria por passo: k = bumbo, s = caixa, h = chimbal, . = nada. */
const DRUMS = 'k.h.s.h.k.hks.h.';

interface NoteEvent {
  step: number;
  midi: number;
  steps: number;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midiOf(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`nota inválida: ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]!]! + acc;
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function parseLead(bars: string[]): NoteEvent[] {
  const tokens = bars.flatMap((b) => b.trim().split(/\s+/));
  const out: NoteEvent[] = [];
  tokens.forEach((tok, i) => {
    if (tok === '-') {
      const last = out[out.length - 1];
      if (last && last.step + last.steps === i) last.steps++;
    } else if (tok !== '.') {
      out.push({ step: i, midi: midiOf(tok), steps: 1 });
    }
  });
  return out;
}

/** Baixo em colcheias alternando a fundamental e a oitava. */
function makeBass(roots: string[]): NoteEvent[] {
  return roots.flatMap((r, bar) => {
    const root = midiOf(r);
    return Array.from({ length: 8 }, (_, i) => ({ step: bar * 16 + i * 2, midi: root + (i % 2 ? 12 : 0), steps: 2 }));
  });
}

const LOOP_STEPS = LEAD.length * 16;
const leadByStep = groupByStep(parseLead(LEAD));
const bassByStep = groupByStep(makeBass(BASS_ROOTS));

function groupByStep(events: NoteEvent[]): Map<number, NoteEvent> {
  return new Map(events.map((e) => [e.step, e]));
}

let wanted = false;
let timer: ReturnType<typeof setInterval> | null = null;
/** Estado da execução atual; null quando parada. */
let run: { ctx: AudioContext; bus: GainNode; step: number; next: number } | null = null;
let pulse: PeriodicWave | null = null;
let pulseCtx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

/** Liga ou desliga a música (opção do menu). */
export function setMusic(on: boolean): void {
  wanted = on;
  sync();
}

/** Motivos para calar a música por um tempo, sem mexer na opção. */
export type HoldReason = 'hidden' | 'victory';
const holds = new Set<HoldReason>();

/** Cala a música enquanto o app está escondido ou durante a vitória. */
export function holdMusic(reason: HoldReason, hold: boolean): void {
  if (hold) holds.add(reason);
  else holds.delete(reason);
  sync();
}

function sync(): void {
  const shouldRun = wanted && holds.size === 0;
  if (shouldRun && !timer) {
    timer = setInterval(tick, TICK_MS);
    tick();
  } else if (!shouldRun && timer) {
    clearInterval(timer);
    timer = null;
    fadeOut();
  }
}

function fadeOut(): void {
  if (!run) return;
  const { ctx, bus } = run;
  run = null;
  const now = ctx.currentTime;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(bus.gain.value, now);
  bus.gain.linearRampToValueAtTime(0, now + 0.15);
  setTimeout(() => bus.disconnect(), 400);
}

function tick(): void {
  const ctx = audioContext();
  if (!ctx) {
    // Áudio ainda travado (sem toque) ou suspenso: recomeça quando voltar.
    if (run) fadeOut();
    return;
  }
  if (!run || run.ctx !== ctx) {
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(LEVEL, ctx.currentTime + 0.3);
    bus.connect(ctx.destination);
    run = { ctx, bus, step: 0, next: ctx.currentTime + 0.05 };
  }
  // Se o relógio ficou muito para trás (aba throttled), pula para o presente.
  if (run.next < ctx.currentTime - 0.1) run.next = ctx.currentTime + 0.02;
  while (run.next < ctx.currentTime + LOOKAHEAD) {
    playStep(run.ctx, run.bus, run.step % LOOP_STEPS, run.next);
    run.step++;
    run.next += STEP;
  }
}

function playStep(ctx: AudioContext, bus: GainNode, step: number, t: number): void {
  const lead = leadByStep.get(step);
  if (lead) tone(ctx, bus, pulseWave(ctx), hz(lead.midi), t, lead.steps * STEP, 0.42);
  const bass = bassByStep.get(step);
  if (bass) tone(ctx, bus, 'triangle', hz(bass.midi), t, bass.steps * STEP * 0.9, 0.9);
  const d = DRUMS[step % 16];
  if (d === 'k') kick(ctx, bus, t);
  else if (d === 's') hit(ctx, bus, t, 'bandpass', 1800, 0.12, 0.5);
  else if (d === 'h') hit(ctx, bus, t, 'highpass', 7000, 0.03, 0.22);
}

/** Nota com ataque curto e soltura rápida, no estilo dos consoles. */
function tone(ctx: AudioContext, bus: GainNode, wave: OscillatorType | PeriodicWave, freq: number, t: number, dur: number, peak: number): void {
  const osc = ctx.createOscillator();
  if (wave instanceof PeriodicWave) osc.setPeriodicWave(wave);
  else osc.type = wave;
  osc.frequency.value = freq;
  const g = ctx.createGain();
  const end = t + dur;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.setValueAtTime(peak * 0.75, t + Math.min(0.06, dur * 0.5));
  g.gain.setValueAtTime(peak * 0.75, end - 0.012);
  g.gain.linearRampToValueAtTime(0, end);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(end + 0.01);
}

/** Bumbo: triângulo caindo de tom rapidamente. */
function kick(ctx: AudioContext, bus: GainNode, t: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);
  const g = ctx.createGain();
  g.gain.setValueAtTime(1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.13);
}

/** Caixa e chimbal: ruído filtrado com queda exponencial. */
function hit(ctx: AudioContext, bus: GainNode, t: number, type: BiquadFilterType, freq: number, decay: number, peak: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(f).connect(g).connect(bus);
  src.start(t, Math.random() * 0.3, decay + 0.01);
}

/** Onda de pulso com ciclo de 25%, o timbre clássico dos consoles 8 bits. */
function pulseWave(ctx: AudioContext): PeriodicWave {
  if (pulse && pulseCtx === ctx) return pulse;
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
  pulse = ctx.createPeriodicWave(real, imag);
  pulseCtx = ctx;
  return pulse;
}

function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.5), ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
