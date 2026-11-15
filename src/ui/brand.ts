/**
 * Marca do jogo. A imagem vem de public/brand/logo.webp, gerada por
 * scripts/make-logo.py a partir de assets/brand/racha-cuca-original.jpg.
 * Logo abaixo, a versão do package.json (injetada pelo Vite).
 */
export function createBrand(): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'brand-wrap';
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
  const version = document.createElement('small');
  version.className = 'version';
  version.textContent = `v${__APP_VERSION__}`;
  wrap.append(brand, version);
  return wrap;
}
