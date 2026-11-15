/**
 * Preferências do jogador (paleta, imagem, som, música e vibração), guardadas no aparelho.
 * Tudo em try/catch: em aba anônima ou com armazenamento bloqueado o jogo
 * segue com os padrões.
 */
export interface Settings {
  /** 'random' (sorteada a cada partida, seção 3.1) ou o id de uma paleta fixa. */
  palette: string;
  /** 'random' (sorteada a cada partida), 'none' (só números), id de imagem ou 'user' (foto). */
  image: string;
  /** Volume dos efeitos, de 0 (desligado) a 3 (alto). */
  volume: number;
  /** Vibração no impacto das peças (Android). */
  vibration: boolean;
  /** Música chiptune de fundo (padrão desligada). */
  music: boolean;
  /** Lado do tabuleiro (seção 2.1): 3 a 6. */
  size: 3 | 4 | 5 | 6;
  /** O 6 × 6 "Insano" é liberado ao vencer um 5 × 5 (seção 2.1). */
  unlocked6: boolean;
  /** Número nas peças com imagem (seção 3.2): 'auto' liga só no 5 × 5 e 6 × 6. */
  numbers: 'auto' | 'on' | 'off';
  /** Modo retrô (seção 3.2): imagem em grade de pixels nas cores da paleta. */
  retro: boolean;
  /** Efeito CRT: linhas de varredura, vinheta e aberração (seção 10.1). */
  crt: boolean;
}

const KEY = 'rachacuca:settings';
const PHOTO_KEY = 'rachacuca:photo';
const DEFAULTS: Settings = { palette: 'random', image: 'random', volume: 2, vibration: true, music: false, size: 4, unlocked6: false, numbers: 'auto', retro: true, crt: true };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
      if (![3, 4, 5, 6].includes(s.size) || (s.size === 6 && !s.unlocked6)) s.size = DEFAULTS.size;
      return s;
    }
  } catch {
    /* sem armazenamento */
  }
  return { ...DEFAULTS };
}

/** O número aparece na peça com imagem? (Sem imagem, sempre aparece.) */
export function showNumbers(s: Pick<Settings, 'numbers'>, size: number): boolean {
  return s.numbers === 'auto' ? size >= 5 : s.numbers === 'on';
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sem armazenamento */
  }
}

/** Paletas e imagens das últimas partidas, para o sorteio não repetir (seção 3). */
export interface Recent {
  palettes: string[];
  images: string[];
}

const RECENT_KEY = 'rachacuca:recent';

export function loadRecent(): Recent {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) {
      const r = JSON.parse(raw) as Partial<Recent>;
      return { palettes: r.palettes ?? [], images: r.images ?? [] };
    }
  } catch {
    /* sem armazenamento */
  }
  return { palettes: [], images: [] };
}

export function saveRecent(r: Recent): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(r));
  } catch {
    /* sem armazenamento */
  }
}

export function loadPhoto(): string | null {
  try {
    return localStorage.getItem(PHOTO_KEY);
  } catch {
    return null;
  }
}

/** Devolve false se não couber no armazenamento (a foto vale só nesta sessão). */
export function savePhoto(dataUrl: string): boolean {
  try {
    localStorage.setItem(PHOTO_KEY, dataUrl);
    return true;
  } catch {
    return false;
  }
}
