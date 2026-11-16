import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, DB_NAME, DB_VERSION, getMeta, resetDbForTests, setMeta } from './db';

beforeEach(async () => {
  const d = await db();
  d?.close();
  resetDbForTests();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});

describe('banco IndexedDB (seção 11.3)', () => {
  it('cria as stores e índices do esquema v1', async () => {
    const d = (await db())!;
    expect([...d.objectStoreNames].sort()).toEqual(['aggregates', 'games', 'images', 'meta', 'session']);
    const idx = d.transaction('games').store.indexNames;
    expect([...idx].sort()).toEqual(['finishedAt', 'size']);
  });

  it('grava schemaVersion em meta', async () => {
    expect(await getMeta('schemaVersion')).toBe(DB_VERSION);
  });

  it('lê e grava meta', async () => {
    await setMeta('recentPalettes', ['nes', 'dmg']);
    expect(await getMeta('recentPalettes')).toEqual(['nes', 'dmg']);
  });
});
