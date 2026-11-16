/**
 * Imagens do jogador no IndexedDB (store `images`, seção 4.2). Por enquanto
 * há uma foto (id 'user'); o banco de imagens completo vem na fase 6.
 */
import { db, type ImageEntry } from './db';

export const USER_PHOTO_ID = 'user';
const LEGACY_PHOTO_KEY = 'rachacuca:photo';

export async function loadUserPhoto(): Promise<Blob | null> {
  const d = await db();
  try {
    return (await d?.get('images', USER_PHOTO_ID))?.blob ?? null;
  } catch {
    return null;
  }
}

/** Grava a foto; devolve false se não houver banco ou faltar espaço. */
export async function saveUserPhoto(blob: Blob, side: number): Promise<boolean> {
  const d = await db();
  if (!d) return false;
  const entry: ImageEntry = {
    id: USER_PHOTO_ID,
    source: 'user',
    title: 'SUA FOTO',
    blob,
    width: side,
    height: side,
    enabled: true,
    createdAt: Date.now(),
  };
  try {
    await d.put('images', entry);
    return true;
  } catch {
    return false;
  }
}

/**
 * Migração da versão 0.x: a foto ficava no localStorage como data URL.
 * Passa para o store `images` e libera o localStorage (que fica só para
 * opções pequenas). Sem banco, a foto continua onde está.
 */
export async function migrateLegacyPhoto(): Promise<void> {
  let dataUrl: string | null = null;
  try {
    dataUrl = localStorage.getItem(LEGACY_PHOTO_KEY);
  } catch {
    return;
  }
  if (!dataUrl) return;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const side = bitmap.width;
    bitmap.close();
    if (await saveUserPhoto(blob, side)) localStorage.removeItem(LEGACY_PHOTO_KEY);
  } catch {
    /* fica para a próxima abertura */
  }
}

/** Foto antiga ainda no localStorage (sem banco disponível). */
export function legacyPhoto(): string | null {
  try {
    return localStorage.getItem(LEGACY_PHOTO_KEY);
  } catch {
    return null;
  }
}
