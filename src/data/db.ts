/**
 * Banco IndexedDB `racha-cuca` (seções 11.1 e 11.3), via `idb`.
 *
 * Stores: images, games (índices finishedAt e size), session, aggregates e
 * meta. As migrações são versionadas: cada versão do banco tem um passo em
 * MIGRATIONS, e `schemaVersion` fica gravado em meta.
 *
 * Em navegação privada ou com armazenamento bloqueado, `db()` resolve null e
 * quem chama segue sem persistir: o jogo nunca quebra por falta de banco.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type BoardSize = 3 | 4 | 5 | 6;

export interface ImageEntry {
  id: string;
  source: 'original' | 'user';
  title: string;
  /** Só para 'user'; as originais vêm de public/images/originals. */
  blob?: Blob;
  thumb?: Blob;
  width: number;
  height: number;
  /** Participa do sorteio. */
  enabled: boolean;
  createdAt: number;
  license?: string;
}

export interface GameRecord {
  id: string;
  size: BoardSize;
  seed: number;
  imageId: string;
  paletteId: string;
  /** Posição inicial (0 = casa vazia). */
  initialTiles: number[];
  status: 'won' | 'abandoned';
  moves: number;
  timeMs: number;
  peeks: number;
  startedAt: number;
  finishedAt: number;
}

export interface SavedSession {
  game: Omit<GameRecord, 'status' | 'finishedAt'>;
  /** Posição atual. */
  tiles: number[];
  elapsedMs: number;
  /** Cópia da imagem do jogador, para a partida seguir mesmo se ela for apagada (seção 4.2). */
  imageCopy?: Blob;
}

export interface Aggregates {
  key: string;
  played: number;
  won: number;
  bestTimeMs?: number;
  bestTimeGameId?: string;
  bestMoves?: number;
  bestMovesGameId?: string;
  totalTimeMs: number;
  currentStreak: number;
  bestStreak: number;
}

interface RachaCucaDB extends DBSchema {
  images: { key: string; value: ImageEntry };
  games: { key: string; value: GameRecord; indexes: { finishedAt: number; size: number } };
  session: { key: string; value: SavedSession };
  aggregates: { key: string; value: Aggregates };
  meta: { key: string; value: unknown };
}

export type DB = IDBPDatabase<RachaCucaDB>;

export const DB_NAME = 'racha-cuca';
export const DB_VERSION = 1;

/** Passo de migração para cada versão (índice = versão de destino). */
const MIGRATIONS: Array<(db: DB) => void> = [
  () => {},
  // v1: esquema inicial (seção 11.3)
  (db) => {
    db.createObjectStore('images', { keyPath: 'id' });
    const games = db.createObjectStore('games', { keyPath: 'id' });
    games.createIndex('finishedAt', 'finishedAt');
    games.createIndex('size', 'size');
    db.createObjectStore('session');
    db.createObjectStore('aggregates', { keyPath: 'key' });
    db.createObjectStore('meta');
  },
];

let opening: Promise<DB | null> | null = null;

export function db(): Promise<DB | null> {
  opening ??= (async () => {
    try {
      if (typeof indexedDB === 'undefined') return null;
      const conn = await openDB<RachaCucaDB>(DB_NAME, DB_VERSION, {
        upgrade(conn, oldVersion, newVersion, tx) {
          for (let v = oldVersion + 1; v <= (newVersion ?? DB_VERSION); v++) MIGRATIONS[v]!(conn);
          void tx.objectStore('meta').put(newVersion ?? DB_VERSION, 'schemaVersion');
        },
        blocked() {
          /* outra aba com versão antiga aberta: espera */
        },
      });
      return conn;
    } catch {
      return null; // navegação privada, cota zerada, armazenamento bloqueado
    }
  })();
  return opening;
}

/** Só para testes: esquece a conexão aberta. */
export function resetDbForTests(): void {
  opening = null;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const d = await db();
  try {
    return (await d?.get('meta', key)) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const d = await db();
  try {
    await d?.put('meta', value, key);
  } catch {
    /* sem armazenamento */
  }
}
