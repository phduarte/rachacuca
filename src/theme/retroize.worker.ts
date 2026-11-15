/// <reference lib="webworker" />
/**
 * Web Worker do modo retrô (seção 11.2): reduz a imagem para uma grade de
 * pixels com OffscreenCanvas e quantiza para a paleta, fora da thread
 * principal, para não travar a animação do embaralhamento.
 */
import { quantize, type Dither, type Rgb } from './quantize';

export interface RetroizeRequest {
  id: number;
  bitmap: ImageBitmap;
  grid: number;
  palette: Rgb[];
  dither: Dither;
}

export type RetroizeResponse = { id: number; blob: Blob } | { id: number; error: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (e: MessageEvent<RetroizeRequest>) => {
  const { id, bitmap, grid, palette, dither } = e.data;
  try {
    const canvas = new OffscreenCanvas(grid, grid);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, grid, grid);
    bitmap.close();
    const img = ctx.getImageData(0, 0, grid, grid);
    img.data.set(quantize(img.data, grid, grid, palette, dither));
    ctx.putImageData(img, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    scope.postMessage({ id, blob } satisfies RetroizeResponse);
  } catch (err) {
    scope.postMessage({ id, error: String(err) } satisfies RetroizeResponse);
  }
};
