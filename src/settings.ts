/**
 * Preferências do jogador (opções pequenas), guardadas no localStorage.
 * Dados maiores (fotos, histórico, partida salva) ficam no IndexedDB (src/data).
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
  /** Versão das preferências salvas, para migrar padrões que mudaram. */
  v: number;
}

/**
 * v2: modo retrô e efeito CRT passam a vir desligados (as imagens pixeladas
 * não agradaram); quem tinha as preferências salvas antes também os desliga.
 */
const SETTINGS_VERSION = 2;

const KEY = 'rachacuca:settings';
const DEFAULTS: Settings = { palette: 'random', image: 'random', volume: 2, vibration: true, music: false, size: 4, unlocked6: false, numbers: 'auto', retro: false, crt: false, v: SETTINGS_VERSION };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
      if (!(s.v >= SETTINGS_VERSION)) {
        s.retro = false;
        s.crt = false;
        s.v = SETTINGS_VERSION;
      }
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
