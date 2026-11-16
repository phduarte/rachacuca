import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, DB_NAME, resetDbForTests, type GameRecord } from './db';
import { ALL, applyRecord, emptyAggregates, HISTORY_MAX, listGames, loadAggregates, recentAverages, recordGame } from './stats';

let n = 0;
function game(over: Partial<GameRecord> = {}): GameRecord {
  n++;
  return {
    id: `g${n}`,
    size: 4,
    seed: n,
    imageId: 'orig-01',
    paletteId: 'nes',
    initialTiles: [],
    status: 'won',
    moves: 100,
    timeMs: 60_000,
    peeks: 0,
    startedAt: n * 1000,
    finishedAt: n * 1000 + 500,
    ...over,
  };
}

describe('agregados (lógica pura)', () => {
  it('conta jogadas, vitórias, tempo total e recordes', () => {
    let a = emptyAggregates('4');
    a = applyRecord(a, game({ timeMs: 50_000, moves: 120 }));
    a = applyRecord(a, game({ timeMs: 70_000, moves: 90 }));
    a = applyRecord(a, game({ status: 'abandoned', timeMs: 10_000, moves: 5 }));
    expect(a).toMatchObject({ played: 3, won: 2, totalTimeMs: 130_000, bestTimeMs: 50_000, bestMoves: 90 });
  });

  it('abandonar quebra a sequência, e a maior fica guardada', () => {
    let a = emptyAggregates('4');
    for (const s of ['won', 'won', 'won', 'abandoned', 'won'] as const) a = applyRecord(a, game({ status: s }));
    expect(a.currentStreak).toBe(1);
    expect(a.bestStreak).toBe(3);
  });

  it('partida abandonada não vira recorde', () => {
    const a = applyRecord(emptyAggregates('4'), game({ status: 'abandoned', timeMs: 1, moves: 1 }));
    expect(a.bestTimeMs).toBeUndefined();
    expect(a.bestMoves).toBeUndefined();
  });

  it('médias das últimas 10 vencidas', () => {
    const games = [game({ timeMs: 10, moves: 1 }), game({ status: 'abandoned', timeMs: 999 }), game({ timeMs: 30, moves: 3 })];
    expect(recentAverages(games)).toEqual({ timeMs: 20, moves: 2 });
    expect(recentAverages([game({ status: 'abandoned' })])).toBeNull();
  });
});

describe('histórico no banco (seção 8.1)', () => {
  beforeEach(async () => {
    (await db())?.close();
    resetDbForTests();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  });

  it('guarda só as últimas 100, e os recordes continuam', async () => {
    // A 1ª partida é o recorde de tempo e será apagada do histórico.
    const first = game({ timeMs: 1_000 });
    await recordGame(first);
    for (let i = 0; i < HISTORY_MAX + 4; i++) await recordGame(game({ timeMs: 60_000 + i }));
    const games = await listGames();
    expect(games).toHaveLength(HISTORY_MAX);
    expect(games.find((g) => g.id === first.id)).toBeUndefined();
    // Mais recentes primeiro.
    expect(games[0]!.finishedAt).toBeGreaterThan(games[1]!.finishedAt);
    const all = await loadAggregates(ALL);
    expect(all.played).toBe(HISTORY_MAX + 5);
    expect(all.bestTimeMs).toBe(1_000);
    expect(all.bestTimeGameId).toBe(first.id);
  });

  it('separa os agregados por tamanho e informa recorde novo', async () => {
    await recordGame(game({ size: 3, timeMs: 9_000 }));
    const r = await recordGame(game({ size: 3, timeMs: 5_000 }));
    expect(r.newBestTime).toBe(true);
    expect(r.previousBestTimeMs).toBe(9_000);
    await recordGame(game({ size: 5 }));
    expect((await loadAggregates('3')).played).toBe(2);
    expect((await loadAggregates('5')).played).toBe(1);
    expect((await loadAggregates(ALL)).played).toBe(3);
  });

  it('a primeira vitória não conta como recorde "novo"', async () => {
    const r = await recordGame(game({ size: 6 }));
    expect(r.newBestTime).toBe(false);
    expect(r.size.bestTimeMs).toBe(60_000);
  });
});
