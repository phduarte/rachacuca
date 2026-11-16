/**
 * Galeria de imagens (seção 4.2): grade de miniaturas com as imagens do jogo
 * e as do jogador, e importação da galeria do aparelho ou da câmera.
 */
import { catalog, importFile, ImageRuleError, onCatalogChange, userCount, type CatalogImage } from '../data/images';
import type { Palette } from '../theme/palettes';
import { cropImage } from './crop';

export interface GalleryHandlers {
  back(): void;
  /** Paleta atual, para a prévia retrô do recorte. */
  palette(): Palette;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function createGalleryScreen(h: GalleryHandlers): { el: HTMLDivElement; show(): void } {
  const root = el('div', 'screen gallery-screen');
  root.hidden = true;
  root.setAttribute('role', 'region');
  root.setAttribute('aria-labelledby', 'gallery-title');

  const head = el('header', 'stats-head');
  const back = el('button', 'stats-back', '◀ VOLTAR');
  const title = el('h2', undefined, 'IMAGENS');
  title.id = 'gallery-title';
  head.append(back, title);

  const counter = el('p', 'gallery-counter');
  counter.setAttribute('aria-live', 'polite');
  const message = el('p', 'gallery-message');
  message.setAttribute('role', 'status');

  // Galeria do aparelho (vários arquivos) ou câmera (seção 4.2).
  const pick = el('input');
  pick.type = 'file';
  pick.accept = 'image/*';
  pick.multiple = true;
  pick.hidden = true;
  const camera = el('input');
  camera.type = 'file';
  camera.accept = 'image/*';
  camera.setAttribute('capture', 'environment');
  camera.hidden = true;
  const addRow = el('div', 'gallery-add');
  const pickBtn = el('button', 'menu-primary', '+ DA GALERIA');
  const cameraBtn = el('button', 'pause-option', 'TIRAR FOTO');
  addRow.append(pickBtn, cameraBtn, pick, camera);

  const grid = el('ul', 'gallery-grid');
  root.append(head, counter, addRow, message, grid);

  function card(img: CatalogImage): HTMLLIElement {
    const li = el('li', img.enabled ? 'gallery-card' : 'gallery-card gallery-card--off');
    li.dataset.id = img.id;
    const thumb = el('span', img.pixelated ? 'gallery-thumb pixelated' : 'gallery-thumb');
    thumb.style.backgroundImage = `url("${img.thumb}")`;
    const name = el('span', 'gallery-name', img.title);
    li.append(thumb, name);
    if (img.source === 'original') li.append(el('span', 'gallery-badge', 'ORIGINAL'));
    return li;
  }

  function render(): void {
    const all = catalog();
    const active = all.filter((i) => i.enabled).length;
    counter.textContent = `${all.length - userCount()} + ${userCount()} IMAGENS · ${active} ATIVAS`;
    grid.replaceChildren(...all.map(card));
  }

  async function importAll(files: FileList | null): Promise<void> {
    if (!files?.length) return;
    let ok = 0;
    message.textContent = 'IMPORTANDO...';
    for (const file of [...files]) {
      try {
        // Cada imagem passa pela tela de recorte; cancelar pula a imagem.
        const crop = await cropImage(file, h.palette());
        if (!crop) continue;
        message.textContent = 'IMPORTANDO...';
        await importFile(file, crop);
        ok++;
      } catch (e) {
        message.textContent = e instanceof ImageRuleError ? e.message : `NÃO DEU PARA ABRIR ${file.name.toUpperCase()}.`;
        if (e instanceof ImageRuleError) break;
      }
    }
    if (ok) message.textContent = ok === 1 ? '1 IMAGEM IMPORTADA.' : `${ok} IMAGENS IMPORTADAS.`;
    else if (message.textContent === 'IMPORTANDO...') message.textContent = '';
  }

  pickBtn.addEventListener('click', () => pick.click());
  cameraBtn.addEventListener('click', () => camera.click());
  for (const input of [pick, camera]) {
    input.addEventListener('change', async () => {
      const files = input.files;
      await importAll(files);
      input.value = '';
    });
  }
  back.addEventListener('click', () => h.back());
  onCatalogChange(() => {
    if (!root.hidden) render();
  });

  return {
    el: root,
    show() {
      message.textContent = '';
      render();
      root.scrollTop = 0;
    },
  };
}
