/**
 * Galeria de imagens (seção 4.2): grade de miniaturas com as imagens do jogo
 * e as do jogador, e importação da galeria do aparelho ou da câmera.
 */
import {
  catalog,
  deleteImage,
  findImage,
  importFile,
  ImageRuleError,
  onCatalogChange,
  renameImage,
  requestPersistence,
  setEnabled,
  storageWarning,
  USER_LIMIT,
  userCount,
  type CatalogImage,
} from '../data/images';
import { confirmDialog } from './confirm';
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

  // Filtro: Todas / Originais / Minhas (seção 4.2).
  type Filter = 'all' | 'original' | 'user';
  let filter: Filter = 'all';
  const filters = el('div', 'gallery-filters stats-tabs');
  filters.setAttribute('role', 'tablist');
  for (const [key, label] of [
    ['all', 'TODAS'],
    ['original', 'ORIGINAIS'],
    ['user', 'MINHAS'],
  ] as const) {
    const b = el('button', 'stats-tab', label);
    b.setAttribute('role', 'tab');
    b.dataset.filter = key;
    filters.append(b);
  }

  const grid = el('ul', 'gallery-grid');

  // Backup das imagens do jogador em .zip (seção 4.2).
  const backup = el('section', 'gallery-backup');
  backup.append(el('h3', undefined, 'BACKUP DAS SUAS IMAGENS'));
  const backupRow = el('div', 'gallery-add');
  const exportBtn = el('button', 'pause-option', 'EXPORTAR .ZIP');
  const importBtn = el('button', 'pause-option', 'IMPORTAR .ZIP');
  const zipInput = el('input');
  zipInput.type = 'file';
  zipInput.accept = '.zip,application/zip';
  zipInput.hidden = true;
  backupRow.append(exportBtn, importBtn, zipInput);
  backup.append(backupRow);

  root.append(head, counter, addRow, message, filters, grid, backup);

  function card(img: CatalogImage): HTMLLIElement {
    const li = el('li');
    const b = el('button', img.enabled ? 'gallery-card' : 'gallery-card gallery-card--off');
    b.dataset.id = img.id;
    b.setAttribute('aria-label', `${img.title}${img.source === 'original' ? ', original' : ''}, ${img.enabled ? 'ativa' : 'desligada'}`);
    const thumb = el('span', img.pixelated ? 'gallery-thumb pixelated' : 'gallery-thumb');
    thumb.style.backgroundImage = `url("${img.thumb}")`;
    const name = el('span', 'gallery-name', img.title);
    b.append(thumb, name);
    if (img.source === 'original') b.append(el('span', 'gallery-badge', 'ORIGINAL'));
    if (!img.enabled) b.append(el('span', 'gallery-off', 'DESLIGADA'));
    li.append(b);
    return li;
  }

  function render(): void {
    const all = catalog();
    const active = all.filter((i) => i.enabled).length;
    counter.textContent = `${all.length - userCount()} + ${userCount()} IMAGENS · ${active} ATIVAS · SUAS: ATÉ ${USER_LIMIT}`;
    const full = userCount() >= USER_LIMIT;
    pickBtn.disabled = full;
    cameraBtn.disabled = full;
    for (const f of filters.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
      f.setAttribute('aria-selected', String(f.dataset.filter === filter));
    }
    const shown = all.filter((i) => filter === 'all' || i.source === filter);
    grid.replaceChildren(...shown.map(card));
    if (!shown.length) grid.append(el('li', 'stats-empty', 'NENHUMA IMAGEM SUA AINDA. IMPORTE ACIMA.'));
  }

  /** Painel de uma imagem: renomear (só as suas), ligar/desligar e apagar (só as suas). */
  function details(id: string): void {
    const img = findImage(id);
    if (!img) return;
    const dlg = el('dialog', 'menu gallery-detail');
    const headEl = el('header', 'menu-head');
    headEl.append(el('h2', undefined, img.source === 'original' ? 'ORIGINAL' : 'SUA IMAGEM'));
    const close = el('button', 'icon-btn close-btn');
    close.setAttribute('aria-label', 'Fechar');
    close.innerHTML = '<span></span><span></span>';
    headEl.append(close);
    const body = el('div', 'menu-body');
    const big = el('span', img.pixelated ? 'gallery-detail-img pixelated' : 'gallery-detail-img');
    big.style.backgroundImage = `url("${img.url}")`;
    body.append(big);

    const note = el('p', 'gallery-message');
    note.setAttribute('role', 'status');

    let nameInput: HTMLInputElement | null = null;
    if (img.source === 'user') {
      const label = el('label', 'gallery-rename');
      label.append(el('span', undefined, 'NOME'));
      nameInput = el('input');
      nameInput.value = img.title;
      nameInput.maxLength = 24;
      nameInput.autocomplete = 'off';
      label.append(nameInput);
      body.append(label);
    } else {
      body.append(el('p', 'gallery-counter', `${img.title} · VEM COM O JOGO E NÃO PODE SER APAGADA.`));
    }

    const toggle = el('button', 'pause-option', img.enabled ? 'DESLIGAR DA ROTAÇÃO' : 'LIGAR NA ROTAÇÃO');
    body.append(toggle);
    let del: HTMLButtonElement | null = null;
    if (img.source === 'user') {
      del = el('button', 'pause-option gallery-delete', 'APAGAR');
      body.append(del);
    }
    body.append(note);
    dlg.append(headEl, body);

    toggle.addEventListener('click', async () => {
      try {
        await setEnabled(id, !findImage(id)!.enabled);
        dlg.close();
      } catch (e) {
        note.textContent = e instanceof ImageRuleError ? e.message : 'NÃO DEU CERTO.';
      }
    });
    del?.addEventListener('click', async () => {
      if (!(await confirmDialog('APAGAR ESTA IMAGEM?', img.title))) return;
      try {
        await deleteImage(id);
        dlg.close();
      } catch (e) {
        note.textContent = e instanceof ImageRuleError ? e.message : 'NÃO DEU CERTO.';
      }
    });
    close.addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => {
      if (nameInput && nameInput.value.trim() && nameInput.value.trim().toUpperCase() !== img.title) {
        void renameImage(id, nameInput.value);
      }
      dlg.remove();
    });
    document.body.append(dlg);
    dlg.showModal();
  }

  async function importAll(files: FileList | null): Promise<void> {
    if (!files?.length) return;
    void requestPersistence();
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
    await warnStorage();
  }

  async function warnStorage(): Promise<void> {
    const w = await storageWarning();
    if (w) message.textContent = w;
  }

  filters.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]');
    if (!b) return;
    filter = b.dataset.filter as Filter;
    render();
  });
  grid.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-id]');
    if (b) details(b.dataset.id!);
  });
  exportBtn.addEventListener('click', async () => {
    if (!userCount()) {
      message.textContent = 'VOCÊ AINDA NÃO TEM IMAGENS PARA EXPORTAR.';
      return;
    }
    message.textContent = 'GERANDO O .ZIP...';
    const { exportBackup } = await import('../data/backup');
    const url = URL.createObjectURL(await exportBackup());
    const a = el('a');
    a.href = url;
    a.download = `racha-cuca-imagens-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.textContent = `${userCount()} IMAGENS EXPORTADAS.`;
  });
  importBtn.addEventListener('click', () => zipInput.click());
  zipInput.addEventListener('change', async () => {
    const file = zipInput.files?.[0];
    zipInput.value = '';
    if (!file) return;
    message.textContent = 'LENDO O BACKUP...';
    try {
      const { importBackup } = await import('../data/backup');
      const { added, skipped } = await importBackup(file);
      message.textContent = `${added} IMPORTADAS${skipped ? `, ${skipped} JÁ EXISTIAM` : ''}.`;
    } catch (e) {
      message.textContent = e instanceof ImageRuleError ? e.message : 'NÃO DEU PARA LER O BACKUP.';
    }
  });
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
      void warnStorage();
      root.scrollTop = 0;
    },
  };
}
