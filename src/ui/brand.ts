/**
 * Marca do jogo. A imagem vem de public/brand/logo.webp, gerada por
 * scripts/make-logo.py a partir de assets/brand/racha-cuca-original.jpg.
 */
export function createBrand(): HTMLHeadingElement {
  const brand = document.createElement('h1');
  brand.className = 'brand';
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}brand/logo.webp`;
  img.alt = 'Racha Cuca';
  img.width = 320;
  img.height = 425;
  img.draggable = false;
  img.decoding = 'async';
  brand.append(img);
  return brand;
}
