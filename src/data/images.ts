/**
 * Banco de imagens (seção 4): as imagens do jogo (12 originais, as desenhadas
 * em código e as da pasta assets/images) e as do jogador, guardadas no store
 * `images` do IndexedDB. Este módulo mantém o catálogo em memória para o
 * sorteio, a galeria e o backup.
 *
 * Regras (seção 4.2): originais não podem ser apagadas (só desligadas da
 * rotação), pelo menos 1 imagem fica ativa, e o jogador tem até 100 imagens.
 */
import { db, getMeta, setMeta, type ImageEntry } from './db';
import { ORIGINAL_IMAGES, originalImageUrl } from '../theme/originals';
import { BUILTIN_IMAGES, builtinImageUrl, FILE_IMAGES } from '../theme/images';

export const USER_LIMIT = 100;
/** Lado máximo da imagem guardada e da miniatura (seção 4.2). */
export const MAX_SIDE = 1024;
export const THUMB_SIDE = 128;

export interface CatalogImage {
  id: string;
  title: string;
  source: 'original' | 'user';
  /** URL da imagem em cores originais. */
  url: string;
  /** URL da miniatura (para a galeria e as listas). */
  thumb: string;
  /** Pixel art: exibir sem suavização. */
  pixelated: boolean;
  /** Lado da grade do modo retrô. */
  grid: number;
  enabled: boolean;
  createdAt: number;
}

export class ImageRuleError extends Error {}

const DISABLED_KEY = 'disabledOriginals';
const LEGACY_PHOTO_KEY = 'rachacuca:photo';

let shipped: CatalogImage[] = [];
const user = new Map<string, CatalogImage & { entry: ImageEntry }>();
let disabledOriginals = new Set<string>();
const listeners = new Set<() => void>();

/** Avisa quem mostra o catálogo (galeria, menu) quando ele muda. */
export function onCatalogChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function changed(): void {
  for (const fn of listeners) fn();
}

function shippedImages(): CatalogImage[] {
  return [
    ...ORIGINAL_IMAGES.map((i) => {
      const url = originalImageUrl(i.id)!;
      return { id: i.id, title: i.name, source: 'original' as const, url, thumb: url, pixelated: true, grid: 128, enabled: true, createdAt: 0 };
    }),
    ...BUILTIN_IMAGES.map((i) => {
      const url = builtinImageUrl(i.id)!;
      return { id: i.id, title: i.name, source: 'original' as const, url, thumb: url, pixelated: true, grid: 64, enabled: true, createdAt: 0 };
    }),
    ...FILE_IMAGES.map((i) => ({
      id: i.id,
      title: i.name,
      source: 'original' as const,
      url: i.url,
      thumb: i.url,
      pixelated: false,
      grid: 128,
      enabled: true,
      createdAt: 0,
    })),
  ];
}

function toCatalog(entry: ImageEntry): CatalogImage & { entry: ImageEntry } {
  const url = URL.createObjectURL(entry.blob!);
  return {
    id: entry.id,
    title: entry.title,
    source: 'user',
    url,
    thumb: entry.thumb ? URL.createObjectURL(entry.thumb) : url,
    pixelated: false,
    grid: 128,
    enabled: entry.enabled,
    createdAt: entry.createdAt,
    entry,
  };
}

function forget(id: string): void {
  const old = user.get(id);
  if (!old) return;
  URL.revokeObjectURL(old.url);
  if (old.thumb !== old.url) URL.revokeObjectURL(old.thumb);
  user.delete(id);
}

/** Carrega o catálogo (e migra a foto da versão 0.x, que ficava no localStorage). */
export async function loadCatalog(): Promise<void> {
  await migrateLegacyPhoto();
  disabledOriginals = new Set((await getMeta<string[]>(DISABLED_KEY)) ?? []);
  const d = await db();
  let entries: ImageEntry[] = [];
  try {
    entries = (await d?.getAll('images')) ?? [];
  } catch {
    /* sem banco */
  }
  for (const id of [...user.keys()]) forget(id);
  if (!shipped.length) shipped = shippedImages();
  for (const e of entries) if (e.source === 'user' && e.blob) user.set(e.id, toCatalog(e));
  changed();
}

/** Todas as imagens: as do jogo primeiro, depois as do jogador (mais novas no fim). */
export function catalog(): CatalogImage[] {
  // As imagens do jogo existem desde o início, antes de o banco abrir.
  if (!shipped.length) shipped = shippedImages();
  const users = [...user.values()].sort((a, b) => a.createdAt - b.createdAt);
  return [...shipped.map((i) => ({ ...i, enabled: !disabledOriginals.has(i.id) })), ...users.map(({ entry: _e, ...i }) => i)];
}

export function findImage(id: string): CatalogImage | undefined {
  return catalog().find((i) => i.id === id);
}

/** Imagens que entram no sorteio (seção 3.2). */
export function enabledIds(): string[] {
  return catalog()
    .filter((i) => i.enabled)
    .map((i) => i.id);
}

export function userCount(): number {
  return user.size;
}

/** Liga/desliga na rotação. Desligar a última ativa é bloqueado (seção 4.2). */
export async function setEnabled(id: string, on: boolean): Promise<void> {
  const img = findImage(id);
  if (!img || img.enabled === on) return;
  if (!on && enabledIds().length <= 1) throw new ImageRuleError('PELO MENOS 1 IMAGEM PRECISA FICAR ATIVA.');
  if (img.source === 'original') {
    if (on) disabledOriginals.delete(id);
    else disabledOriginals.add(id);
    await setMeta(DISABLED_KEY, [...disabledOriginals]);
  } else {
    const u = user.get(id)!;
    u.entry = { ...u.entry, enabled: on };
    u.enabled = on;
    await (await db())?.put('images', u.entry);
  }
  changed();
}

export async function renameImage(id: string, title: string): Promise<void> {
  const u = user.get(id);
  const clean = title.trim().toUpperCase().slice(0, 24);
  if (!u || !clean) return;
  u.entry = { ...u.entry, title: clean };
  u.title = clean;
  await (await db())?.put('images', u.entry);
  changed();
}

/**
 * Apaga uma imagem do jogador. As originais não podem ser apagadas, nem pela
 * interface nem por chamada direta (seção 13). Apagar a última ativa também
 * é bloqueado.
 */
export async function deleteImage(id: string): Promise<void> {
  const u = user.get(id);
  if (!u) {
    if (findImage(id)?.source === 'original') throw new ImageRuleError('IMAGENS ORIGINAIS NÃO PODEM SER APAGADAS.');
    return;
  }
  if (u.enabled && enabledIds().length <= 1) throw new ImageRuleError('PELO MENOS 1 IMAGEM PRECISA FICAR ATIVA.');
  await (await db())?.delete('images', id);
  forget(id);
  changed();
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** WebP 0,85; se o navegador não gerar WebP, JPEG (seção 4.2). */
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await canvasBlob(canvas, 'image/webp', 0.85);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await canvasBlob(canvas, 'image/jpeg', 0.85);
  if (!jpeg) throw new Error('não deu para codificar a imagem');
  return jpeg;
}

/** Recorte quadrado em pixels da imagem de origem. */
export interface Crop {
  x: number;
  y: number;
  side: number;
}

export function centerCrop(w: number, h: number): Crop {
  const side = Math.min(w, h);
  return { x: (w - side) / 2, y: (h - side) / 2, side };
}

/**
 * Normaliza: recorta o quadrado, reduz a no máximo 1024 × 1024 e gera a
 * miniatura de 128 × 128.
 */
export async function normalize(source: ImageBitmap, crop: Crop): Promise<{ blob: Blob; thumb: Blob; side: number }> {
  const side = Math.min(MAX_SIDE, Math.round(crop.side));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, crop.x, crop.y, crop.side, crop.side, 0, 0, side, side);
  const blob = await encode(canvas);
  const t = document.createElement('canvas');
  t.width = t.height = THUMB_SIDE;
  const tctx = t.getContext('2d')!;
  tctx.imageSmoothingQuality = 'high';
  tctx.drawImage(canvas, 0, 0, THUMB_SIDE, THUMB_SIDE);
  return { blob, thumb: await encode(t), side };
}

function newId(): string {
  return `u-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function titleFrom(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().toUpperCase();
  return (base || 'MINHA IMAGEM').slice(0, 24);
}

/** Grava uma imagem já normalizada no banco e no catálogo. */
export async function addImage(
  img: { blob: Blob; thumb: Blob; side: number; title: string; enabled?: boolean; createdAt?: number; id?: string },
): Promise<CatalogImage> {
  if (user.size >= USER_LIMIT) throw new ImageRuleError(`LIMITE DE ${USER_LIMIT} IMAGENS ATINGIDO.`);
  const entry: ImageEntry = {
    id: img.id ?? newId(),
    source: 'user',
    title: img.title,
    blob: img.blob,
    thumb: img.thumb,
    width: img.side,
    height: img.side,
    enabled: img.enabled ?? true,
    createdAt: img.createdAt ?? Date.now(),
  };
  const d = await db();
  if (!d) throw new ImageRuleError('SEM ARMAZENAMENTO NESTE NAVEGADOR.');
  try {
    await d.put('images', entry);
  } catch {
    throw new ImageRuleError('FALTOU ESPAÇO NO APARELHO.');
  }
  const c = toCatalog(entry);
  user.set(entry.id, c);
  changed();
  return c;
}

/** Importa um arquivo escolhido pelo jogador, com o recorte dado (ou o central). */
export async function importFile(file: File, crop?: Crop): Promise<CatalogImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const n = await normalize(bitmap, crop ?? centerCrop(bitmap.width, bitmap.height));
    return await addImage({ ...n, title: titleFrom(file.name) });
  } finally {
    bitmap.close();
  }
}

/** Dados de uma imagem do jogador (para o backup e a cópia da partida salva). */
export function userEntry(id: string): ImageEntry | undefined {
  return user.get(id)?.entry;
}

export function userEntries(): ImageEntry[] {
  return [...user.values()].map((u) => u.entry);
}

/** Registra no catálogo, sem gravar, uma cópia temporária (partida salva cuja imagem foi apagada). */
export function registerTemporary(id: string, blob: Blob): void {
  if (user.has(id) || shipped.some((i) => i.id === id)) return;
  const entry: ImageEntry = { id, source: 'user', title: 'IMAGEM APAGADA', blob, width: 0, height: 0, enabled: false, createdAt: 0 };
  user.set(id, toCatalog(entry));
}

/**
 * Migração da versão 0.x: a foto ficava no localStorage como data URL (e
 * depois no store com o id 'user', sem miniatura). Gera a miniatura e libera
 * o localStorage.
 */
async function migrateLegacyPhoto(): Promise<void> {
  let dataUrl: string | null = null;
  try {
    dataUrl = localStorage.getItem(LEGACY_PHOTO_KEY);
  } catch {
    return;
  }
  if (!dataUrl) return;
  const d = await db();
  if (!d) return;
  try {
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const n = await normalize(bitmap, centerCrop(bitmap.width, bitmap.height));
    bitmap.close();
    await d.put('images', {
      id: 'user',
      source: 'user',
      title: 'SUA FOTO',
      blob: n.blob,
      thumb: n.thumb,
      width: n.side,
      height: n.side,
      enabled: true,
      createdAt: Date.now(),
    });
    localStorage.removeItem(LEGACY_PHOTO_KEY);
  } catch {
    /* fica para a próxima abertura */
  }
}
