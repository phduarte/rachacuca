/**
 * As 12 imagens originais do jogo (seção 4.1): pixel art 512 × 512 em
 * public/images/originals, geradas por scripts/make-originals.py.
 * Licenças em assets/images/LICENSES.md.
 */
export interface OriginalImage {
  id: string;
  name: string;
  file: string;
}

export const ORIGINAL_IMAGES: OriginalImage[] = [
  { id: 'orig-01', name: 'INVASÃO ORBITAL', file: '01-invasao-orbital.png' },
  { id: 'orig-02', name: 'LABIRINTO NEON', file: '02-labirinto-neon.png' },
  { id: 'orig-03', name: 'CASTELO DO DRAGÃO', file: '03-castelo-do-dragao.png' },
  { id: 'orig-04', name: 'RODOVIA AO PÔR DO SOL', file: '04-rodovia-ao-por-do-sol.png' },
  { id: 'orig-05', name: 'MASMORRA 8 BITS', file: '05-masmorra-8-bits.png' },
  { id: 'orig-06', name: 'BLOCOS EM QUEDA', file: '06-blocos-em-queda.png' },
  { id: 'orig-07', name: 'RUA DOS LUTADORES', file: '07-rua-dos-lutadores.png' },
  { id: 'orig-08', name: 'FLORESTA ENCANTADA', file: '08-floresta-encantada.png' },
  { id: 'orig-09', name: 'NINJA DO TELHADO', file: '09-ninja-do-telhado.png' },
  { id: 'orig-10', name: 'KART NA PISTA', file: '10-kart-na-pista.png' },
  { id: 'orig-11', name: 'FLIPERAMA', file: '11-fliperama.png' },
  { id: 'orig-12', name: 'QUARTO DOS ANOS 90', file: '12-quarto-dos-anos-90.png' },
];

export function originalImageUrl(id: string): string | null {
  const img = ORIGINAL_IMAGES.find((i) => i.id === id);
  return img ? `${import.meta.env.BASE_URL}images/originals/${img.file}` : null;
}
