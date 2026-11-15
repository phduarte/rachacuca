/**
 * Paletas da seção 3.1. Cada uma vira tokens CSS em :root; as bordas das
 * peças derivam da face para manter o relevo em qualquer cor.
 */
export interface Palette {
  id: string;
  name: string;
  bg: string;
  uiText: string;
  frame: string; // fundo rebaixado da moldura
  bezel: string; // aro de plástico
  face: string; // face da peça
  text: string; // número da peça
  accent: string;
  glow: string;
}

export const PALETTES: Palette[] = [
  { id: 'brinquedo', name: 'BRINQUEDO', bg: '#1b1b24', uiText: '#f4f1ea', frame: '#b51d14', bezel: '#d9271c', face: '#f7f5f0', text: '#141414', accent: '#d9271c', glow: '#29adff' },
  { id: 'dmg', name: 'TELA VERDE', bg: '#0f380f', uiText: '#9bbc0f', frame: '#1e4a1e', bezel: '#306230', face: '#9bbc0f', text: '#0f380f', accent: '#8bac0f', glow: '#9bbc0f' },
  { id: 'nes', name: '8 BITS', bg: '#000000', uiText: '#fcfcfc', frame: '#881400', bezel: '#f83800', face: '#fcfcfc', text: '#0058f8', accent: '#f8b800', glow: '#f8b800' },
  { id: 'c64', name: 'MICRO 64', bg: '#40318d', uiText: '#ffffff', frame: '#2b2070', bezel: '#7869c4', face: '#e4e0ff', text: '#40318d', accent: '#a1a0ff', glow: '#ffffff' },
  { id: 'vga-sunset', name: 'SYNTHWAVE', bg: '#1a0533', uiText: '#ffffff', frame: '#5c0d45', bezel: '#ff2a6d', face: '#05d9e8', text: '#1a0533', accent: '#ffd319', glow: '#05d9e8' },
  { id: 'arcade-neon', name: 'FLIPERAMA', bg: '#000000', uiText: '#ffff00', frame: '#0b0b5e', bezel: '#2121de', face: '#111111', text: '#ffff00', accent: '#ffb8ff', glow: '#00ffff' },
  { id: 'beige-pc', name: 'PC BEGE', bg: '#1b1200', uiText: '#ffb000', frame: '#6b5b3e', bezel: '#d9c8a9', face: '#ffb000', text: '#1b1200', accent: '#ffb000', glow: '#ffb000' },
  { id: '16bit-blue', name: '16 BITS', bg: '#1d2b53', uiText: '#fff1e8', frame: '#134a8a', bezel: '#29adff', face: '#fff1e8', text: '#1d2b53', accent: '#ff004d', glow: '#ff004d' },
  { id: 'cga-1', name: 'CGA MODO 1', bg: '#000000', uiText: '#55ffff', frame: '#ff55ff', bezel: '#55ffff', face: '#ffffff', text: '#000000', accent: '#ff55ff', glow: '#55ffff' },
  { id: 'cga-2', name: 'CGA MODO 2', bg: '#000000', uiText: '#ffff55', frame: '#ff5555', bezel: '#55ff55', face: '#ffff55', text: '#000000', accent: '#ff5555', glow: '#55ff55' },
  { id: 'zx', name: 'MICRO BRITÂNICO', bg: '#000000', uiText: '#d7d700', frame: '#0000d7', bezel: '#d70000', face: '#d7d700', text: '#0000d7', accent: '#00d700', glow: '#00d700' },
  { id: 'msx', name: 'MICRO NIPÔNICO', bg: '#000000', uiText: '#ccc35e', frame: '#5455ed', bezel: '#3eb849', face: '#ccc35e', text: '#000000', accent: '#d4524d', glow: '#3eb849' },
  { id: 'amiga', name: 'ÁREA DE TRABALHO', bg: '#0055aa', uiText: '#ffffff', frame: '#000020', bezel: '#ff8800', face: '#ffffff', text: '#0055aa', accent: '#ff8800', glow: '#ff8800' },
];

/** Contraste mínimo entre o número e a face da peça (seção 3.1, WCAG AA). */
export const MIN_CONTRAST = 4.5;

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/** Razão de contraste WCAG entre duas cores #rrggbb (1 a 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Paletas abaixo do contraste mínimo ganham contorno no número da peça. */
export function needsOutline(p: Palette): boolean {
  return contrast(p.text, p.face) < MIN_CONTRAST;
}

export function paletteById(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}

export function applyPalette(p: Palette): void {
  const s = document.documentElement.style;
  s.setProperty('--bg', p.bg);
  s.setProperty('--ui-text', p.uiText);
  s.setProperty('--frame', p.frame);
  s.setProperty('--bezel', p.bezel);
  s.setProperty('--tile-face', p.face);
  s.setProperty('--tile-edge-light', `color-mix(in srgb, ${p.face}, #fff 55%)`);
  s.setProperty('--tile-edge-dark', `color-mix(in srgb, ${p.face}, #000 22%)`);
  s.setProperty('--text', p.text);
  s.setProperty('--accent', p.accent);
  s.setProperty('--glow', p.glow);
  // Contorno de 1 px na cor da face, por fora do número, quando falta contraste.
  s.setProperty(
    '--text-outline',
    needsOutline(p)
      ? `-1px -1px 0 ${p.face}, 1px -1px 0 ${p.face}, -1px 1px 0 ${p.face}, 1px 1px 0 ${p.face}`
      : 'none',
  );
  // Seção 3.1: a barra de status do Android acompanha o fundo.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg);
}
