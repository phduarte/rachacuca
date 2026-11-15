/**
 * Modo retrô (seção 3.2): a imagem vira uma grade de pixels (até 128 × 128)
 * quantizada para as cores da paleta da partida, com pontilhado de Bayer 4 × 4.
 * O trabalho pesado roda num Web Worker com OffscreenCanvas; sem isso (Safari
 * antigo), roda na thread principal, que para 128 × 128 leva poucos ms.
 * O resultado fica em cache por (imagem, paleta, grade).
 */
import type { Palette } from './palettes';
import { hexToRgb, quantize, type Dither, type Rgb } from './quantize';
import type { RetroizeRequest, RetroizeResponse } from './retroize.worker';

export const RETRO_GRID = 128;
const DITHER: Dither = 'bayer';

/** Cores da paleta usadas na quantização (sem repetir). */
export function paletteColors(p: Palette): Rgb[] {
  const hexes = [p.bg, p.frame, p.bezel, p.face, p.text, p.accent, p.glow, p.uiText].map((h) => h.toLowerCase());
  return [...new Set(hexes)].map(hexToRgb);
}

const cache = new Map<string, Promise<string>>();
let worker: Worker | null | undefined;
let nextId = 0;
const pending = new Map<number, { resolve(b: Blob): void; reject(e: Error): void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    if (typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined') throw new Error('sem OffscreenCanvas');
    worker = new Worker(new URL('./retroize.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<RetroizeResponse>) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if ('blob' in e.data) job.resolve(e.data.blob);
      else job.reject(new Error(e.data.error));
    };
    worker.onerror = () => {
      // Worker quebrado (ex.: sem OffscreenCanvas 2D): tudo vai para a thread principal.
      for (const job of pending.values()) job.reject(new Error('worker'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

async function loadBitmap(url: string): Promise<ImageBitmap> {
  const blob = await (await fetch(url)).blob();
  return createImageBitmap(blob);
}

function inWorker(w: Worker, bitmap: ImageBitmap, grid: number, palette: Rgb[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    w.postMessage({ id, bitmap, grid, palette, dither: DITHER } satisfies RetroizeRequest, [bitmap]);
  });
}

async function onMainThread(url: string, grid: number, palette: Rgb[]): Promise<string> {
  const bitmap = await loadBitmap(url);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = grid;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, grid, grid);
  bitmap.close();
  const img = ctx.getImageData(0, 0, grid, grid);
  img.data.set(quantize(img.data, grid, grid, palette, DITHER));
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Versão retrô da imagem `url` na paleta `p`. `key` identifica a imagem no
 * cache (o id dela, já que a URL pode ser uma data URL enorme).
 * `grid` é o lado da grade de pixels (imagens menores não são ampliadas).
 */
export function retroize(key: string, url: string, p: Palette, grid = RETRO_GRID): Promise<string> {
  const cacheKey = `${key}|${p.id}|${grid}`;
  let hit = cache.get(cacheKey);
  if (!hit) {
    const colors = paletteColors(p);
    hit = (async () => {
      const w = getWorker();
      if (w) {
        try {
          const blob = await inWorker(w, await loadBitmap(url), grid, colors);
          return URL.createObjectURL(blob);
        } catch {
          /* cai para a thread principal */
        }
      }
      return onMainThread(url, grid, colors);
    })();
    hit.catch(() => cache.delete(cacheKey));
    cache.set(cacheKey, hit);
  }
  return hit;
}

/** Esquece o cache de uma imagem (ex.: a foto do jogador mudou). */
export function forgetRetro(key: string): void {
  for (const k of cache.keys()) {
    if (!k.startsWith(`${key}|`)) continue;
    void cache.get(k)!.then((u) => u.startsWith('blob:') && URL.revokeObjectURL(u), () => {});
    cache.delete(k);
  }
}
