/**
 * Partida em andamento (seção 8.1): salva a cada movimento (com debounce de
 * 300 ms) e quando o app perde o foco; ao reabrir, o jogo oferece continuar.
 */
import { db, type SavedSession } from './db';

const KEY = 'current';
export const SAVE_DEBOUNCE_MS = 300;

/**
 * Ao fechar a página, a gravação no IndexedDB (assíncrona) pode não terminar.
 * Então o último estado (tempo, posição, movimentos, espiadas) também vai,
 * de forma síncrona, para o localStorage, e é mesclado ao reabrir.
 */
const LAST_KEY = 'rachacuca:sessionLast';

export type SessionPatch = Pick<SavedSession, 'tiles' | 'elapsedMs'> & { id: string; moves: number; peeks: number };

export function saveSessionPatchSync(p: SessionPatch): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(p));
  } catch {
    /* sem armazenamento */
  }
}

function takePatch(): SessionPatch | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    localStorage.removeItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as SessionPatch) : null;
  } catch {
    return null;
  }
}

export async function loadSession(): Promise<SavedSession | null> {
  const d = await db();
  const patch = takePatch();
  try {
    const s = (await d?.get('session', KEY)) ?? null;
    if (s && patch && patch.id === s.game.id && patch.elapsedMs >= s.elapsedMs) {
      s.tiles = patch.tiles;
      s.elapsedMs = patch.elapsedMs;
      s.game.moves = patch.moves;
      s.game.peeks = patch.peeks;
      await d?.put('session', s, KEY);
    }
    return s;
  } catch {
    return null;
  }
}

export async function saveSession(s: SavedSession): Promise<void> {
  const d = await db();
  try {
    await d?.put('session', s, KEY);
  } catch {
    /* sem espaço: a partida só não fica salva */
  }
}

export async function clearSession(): Promise<void> {
  takePatch();
  const d = await db();
  try {
    await d?.delete('session', KEY);
  } catch {
    /* sem armazenamento */
  }
}
