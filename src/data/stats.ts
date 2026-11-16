/**
 * Histórico e recordes (seção 8.1). O histórico guarda as últimas 100
 * partidas (vencidas ou abandonadas); os totais e recordes ficam à parte, em
 * `aggregates` (por tamanho e "all"), e continuam depois que as partidas
 * antigas são apagadas.
 */
import { db, type Aggregates, type GameRecord } from './db';

export const HISTORY_MAX = 100;
export const ALL = 'all';

export function emptyAggregates(key: string): Aggregates {
  return { key, played: 0, won: 0, totalTimeMs: 0, currentStreak: 0, bestStreak: 0 };
}

/** Chaves de agregados que uma partida atualiza: o tamanho dela e "all". */
export function aggregateKeys(rec: Pick<GameRecord, 'size'>): string[] {
  return [String(rec.size), ALL];
}

/** Soma uma partida aos agregados (sem alterar o original). */
export function applyRecord(agg: Aggregates, rec: GameRecord): Aggregates {
  const next: Aggregates = { ...agg, played: agg.played + 1, totalTimeMs: agg.totalTimeMs + rec.timeMs };
  if (rec.status === 'won') {
    next.won++;
    next.currentStreak++;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
    if (next.bestTimeMs === undefined || rec.timeMs < next.bestTimeMs) {
      next.bestTimeMs = rec.timeMs;
      next.bestTimeGameId = rec.id;
    }
    if (next.bestMoves === undefined || rec.moves < next.bestMoves) {
      next.bestMoves = rec.moves;
      next.bestMovesGameId = rec.id;
    }
  } else {
    // Sequência = partidas concluídas em seguida, sem abandonar (seção 8.2).
    next.currentStreak = 0;
  }
  return next;
}

/** Médias de tempo e movimentos das últimas `n` partidas vencidas (mais recentes primeiro). */
export function recentAverages(newestFirst: readonly GameRecord[], n = 10): { timeMs: number; moves: number } | null {
  const won = newestFirst.filter((g) => g.status === 'won').slice(0, n);
  if (!won.length) return null;
  return {
    timeMs: won.reduce((s, g) => s + g.timeMs, 0) / won.length,
    moves: won.reduce((s, g) => s + g.moves, 0) / won.length,
  };
}

/** Recorde de antes desta partida, para o painel de resultado comparar (seção 7.4). */
export interface RecordOutcome {
  /** Agregados do tamanho, já com a partida. */
  size: Aggregates;
  newBestTime: boolean;
  newBestMoves: boolean;
  /** Melhor tempo/movimentos anteriores (undefined se não havia). */
  previousBestTimeMs?: number;
  previousBestMoves?: number;
}

/**
 * Grava a partida no histórico, atualiza os agregados e apaga as partidas
 * além das 100 mais recentes, numa transação só. Sem banco, calcula em
 * memória a partir de agregados vazios.
 */
export async function recordGame(rec: GameRecord): Promise<RecordOutcome> {
  const d = await db();
  const keys = aggregateKeys(rec);
  let before = emptyAggregates(keys[0]!);
  let after = applyRecord(before, rec);
  if (d) {
    try {
      const tx = d.transaction(['games', 'aggregates'], 'readwrite');
      const games = tx.objectStore('games');
      const aggs = tx.objectStore('aggregates');
      await games.put(rec);
      for (const key of keys) {
        const old = (await aggs.get(key)) ?? emptyAggregates(key);
        const updated = applyRecord(old, rec);
        await aggs.put(updated);
        if (key === keys[0]) {
          before = old;
          after = updated;
        }
      }
      // Histórico: só as últimas HISTORY_MAX (as mais antigas por finishedAt saem).
      let extra = (await games.count()) - HISTORY_MAX;
      if (extra > 0) {
        let cursor = await games.index('finishedAt').openCursor();
        while (cursor && extra > 0) {
          await cursor.delete();
          extra--;
          cursor = await cursor.continue();
        }
      }
      await tx.done;
    } catch {
      /* sem espaço: segue com o cálculo em memória */
    }
  }
  return {
    size: after,
    newBestTime: rec.status === 'won' && after.bestTimeGameId === rec.id && before.bestTimeMs !== undefined,
    newBestMoves: rec.status === 'won' && after.bestMovesGameId === rec.id && before.bestMoves !== undefined,
    previousBestTimeMs: before.bestTimeMs,
    previousBestMoves: before.bestMoves,
  };
}

export async function loadAggregates(key: string): Promise<Aggregates> {
  const d = await db();
  try {
    return (await d?.get('aggregates', key)) ?? emptyAggregates(key);
  } catch {
    return emptyAggregates(key);
  }
}

/** Partidas do histórico, mais recentes primeiro (opcionalmente de um tamanho). */
export async function listGames(size?: number): Promise<GameRecord[]> {
  const d = await db();
  try {
    const all = (await d?.getAllFromIndex('games', 'finishedAt')) ?? [];
    return all.reverse().filter((g) => size === undefined || g.size === size);
  } catch {
    return [];
  }
}

export async function getGame(id: string): Promise<GameRecord | undefined> {
  const d = await db();
  try {
    return await d?.get('games', id);
  } catch {
    return undefined;
  }
}

/** Zera histórico e recordes (a tela de estatísticas pede confirmação dupla). */
export async function clearStats(): Promise<void> {
  const d = await db();
  if (!d) return;
  const tx = d.transaction(['games', 'aggregates'], 'readwrite');
  await tx.objectStore('games').clear();
  await tx.objectStore('aggregates').clear();
  await tx.done;
}

/** Tudo o que a tela de estatísticas exporta em JSON. */
export async function exportStats(): Promise<{ exportedAt: string; aggregates: Aggregates[]; games: GameRecord[] }> {
  const d = await db();
  return {
    exportedAt: new Date().toISOString(),
    aggregates: (await d?.getAll('aggregates').catch(() => [])) ?? [],
    games: await listGames(),
  };
}
