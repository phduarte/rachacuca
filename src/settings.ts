/**
 * Preferências do jogador (paleta e imagem), guardadas no aparelho.
 * Tudo em try/catch: em aba anônima ou com armazenamento bloqueado o jogo
 * segue com os padrões.
 */
export interface Settings {
  palette: string;
  /** 'none' (só números), id de imagem embarcada ou 'user' (foto do jogador). */
  image: string;
}

const KEY = 'rachacuca:settings';
const PHOTO_KEY = 'rachacuca:photo';
const DEFAULTS: Settings = { palette: 'brinquedo', image: 'none' };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
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
