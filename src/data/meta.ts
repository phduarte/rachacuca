/**
 * Pequenos dados do jogo no store `meta` (seção 11.3): paletas e imagens
 * recentes (sorteio sem repetir) e o guia de instalação do iOS já mostrado.
 * Migra do localStorage da versão anterior.
 */
import { getMeta, setMeta } from './db';

export interface Recent {
  palettes: string[];
  images: string[];
}

const LEGACY_RECENT_KEY = 'rachacuca:recent';
const LEGACY_HINT_KEY = 'rachacuca:installHintShown';

function legacy(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) localStorage.removeItem(key);
    return v;
  } catch {
    return null;
  }
}

export async function loadRecent(): Promise<Recent> {
  const old = legacy(LEGACY_RECENT_KEY);
  if (old) {
    try {
      const r = JSON.parse(old) as Partial<Recent>;
      const recent = { palettes: r.palettes ?? [], images: r.images ?? [] };
      await saveRecent(recent);
      return recent;
    } catch {
      /* ignora o antigo */
    }
  }
  return {
    palettes: (await getMeta<string[]>('recentPalettes')) ?? [],
    images: (await getMeta<string[]>('recentImages')) ?? [],
  };
}

export async function saveRecent(r: Recent): Promise<void> {
  await setMeta('recentPalettes', r.palettes);
  await setMeta('recentImages', r.images);
}

export async function installHintShown(): Promise<boolean> {
  if (legacy(LEGACY_HINT_KEY)) {
    await setMeta('installHintShown', true);
    return true;
  }
  return (await getMeta<boolean>('installHintShown')) === true;
}

export async function markInstallHintShown(): Promise<void> {
  await setMeta('installHintShown', true);
}
