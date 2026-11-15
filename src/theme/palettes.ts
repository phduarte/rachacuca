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
];

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
  // Seção 3.1: a barra de status do Android acompanha o fundo.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg);
}
