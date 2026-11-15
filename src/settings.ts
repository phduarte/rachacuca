/**
 * Preferências do jogador (paleta, imagem, som, música e vibração), guardadas no aparelho.
 * Tudo em try/catch: em aba anônima ou com armazenamento bloqueado o jogo
 * segue com os padrões.
 */
export interface Settings {
  palette: string;
  /** 'none' (só números), id de imagem embarcada ou 'user' (foto do jogador). */
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
}

const KEY = 'rachacuca:settings';
const PHOTO_KEY = 'rachacuca:photo';
const DEFAULTS: Settings = { palette: 'brinquedo', image: 'none', volume: 2, vibration: true, music: false, size: 4, unlocked6: false };

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

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
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
