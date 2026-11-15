/**
 * Botão de menu (sanduíche) e tela de opções: novo jogo, cor do mini-game,
 * imagem das peças, volume, música e vibração. As escolhas valem na hora; fechar volta ao jogo.
 */
import { PALETTES, type Palette } from '../theme/palettes';
import { BUILTIN_IMAGES, FILE_IMAGES, builtinImageUrl } from '../theme/images';

export interface MenuState {
  palette: string;
  image: string;
  photo: string | null;
  volume: number;
  music: boolean;
  vibration: boolean;
  /** 'prompt': convite do navegador; 'ios': guia do Safari; null: nada a oferecer. */
  install: 'prompt' | 'ios' | null;
  /** Há versão nova esperando (seção 9.4). */
  update: boolean;
}

export interface MenuHandlers {
  open(): void;
  newGame(): void;
  palette(id: string): void;
  image(id: string): void;
  /** Recebe o arquivo escolhido; resolve quando a foto já está em uso. */
  photo(file: File): Promise<void>;
  /** Nível de 0 (mudo) a 3 (alto). */
  volume(level: number): void;
  music(on: boolean): void;
  vibration(on: boolean): void;
  install(): void;
  /** Recarrega na versão nova. */
  update(): void;
}

const VOLUME_NAMES = ['MUDO', 'BAIXO', 'MÉDIO', 'ALTO'];

export function createMenuButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'icon-btn menu-btn';
  btn.setAttribute('aria-label', 'Abrir opções');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = '<span></span><span></span><span></span>';
  return btn;
}

export function createMenu(
  state: () => MenuState,
  h: MenuHandlers,
): { el: HTMLDialogElement; open(): void; refresh(): void } {
  const dlg = document.createElement('dialog');
  dlg.className = 'menu';
  dlg.setAttribute('aria-labelledby', 'menu-title');

  const header = document.createElement('header');
  header.className = 'menu-head';
  const title = document.createElement('h2');
  title.id = 'menu-title';
  title.textContent = 'OPÇÕES';
  const close = document.createElement('button');
  close.className = 'icon-btn close-btn';
  close.setAttribute('aria-label', 'Fechar opções');
  close.innerHTML = '<span></span><span></span>';
  header.append(title, close);

  // Versão nova: aparece só aqui no menu, nunca no meio da partida (seção 9.4).
  const updateBtn = document.createElement('button');
  updateBtn.className = 'menu-primary update-btn';
  updateBtn.textContent = 'NOVA VERSÃO! REINICIAR?';

  const newGameBtn = document.createElement('button');
  newGameBtn.className = 'menu-primary';
  newGameBtn.textContent = 'NOVO JOGO';

  const colors = section('COR DO MINI-GAME');
  const colorGrid = grid('swatches');
  colors.append(colorGrid);

  const images = section('IMAGEM');
  const imageGrid = grid('pictures');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'menu-secondary';
  uploadBtn.textContent = 'ENVIAR FOTO';
  images.append(imageGrid, uploadBtn, fileInput);

  const sound = section('SOM');
  const volumeGrid = grid('levels');
  sound.append(volumeGrid);

  const music = section('MÚSICA');
  const musicGrid = grid('toggle');
  music.append(musicGrid);

  // A API de vibração não existe no iOS: a opção só aparece onde funciona.
  const vibration = section('VIBRAÇÃO');
  const vibrationGrid = grid('toggle');
  vibration.append(vibrationGrid);
  vibration.hidden = !('vibrate' in navigator);

  const installBtn = document.createElement('button');
  installBtn.className = 'menu-secondary install-btn';
  installBtn.textContent = 'INSTALAR';

  const body = document.createElement('div');
  body.className = 'menu-body';
  body.append(updateBtn, newGameBtn, colors, images, sound, music, vibration, installBtn);
  dlg.append(header, body);

  function render(): void {
    const s = state();
    installBtn.hidden = !s.install;
    updateBtn.hidden = !s.update;
    colorGrid.replaceChildren(...PALETTES.map((p) => swatch(p, p.id === s.palette)));
    const opts: Array<{ id: string; name: string; url: string | null }> = [
      { id: 'none', name: 'NÚMEROS', url: null },
      ...BUILTIN_IMAGES.map((i) => ({ id: i.id, name: i.name, url: builtinImageUrl(i.id) })),
      ...FILE_IMAGES,
    ];
    if (s.photo) opts.push({ id: 'user', name: 'SUA FOTO', url: s.photo });
    imageGrid.replaceChildren(...opts.map((o) => picture(o.id, o.name, o.url, o.id === s.image)));
    uploadBtn.textContent = s.photo ? 'TROCAR FOTO' : 'ENVIAR FOTO';
    volumeGrid.replaceChildren(
      ...VOLUME_NAMES.map((name, level) => {
        const b = option(name, level === s.volume);
        b.dataset.volume = String(level);
        return b;
      }),
    );
    musicGrid.replaceChildren(
      ...[true, false].map((on) => {
        const b = option(on ? 'LIGADA' : 'DESLIGADA', on === s.music);
        b.dataset.music = String(on);
        return b;
      }),
    );
    vibrationGrid.replaceChildren(
      ...[true, false].map((on) => {
        const b = option(on ? 'LIGADA' : 'DESLIGADA', on === s.vibration);
        b.dataset.vibration = String(on);
        return b;
      }),
    );
  }

  function swatch(p: Palette, selected: boolean): HTMLButtonElement {
    const b = option(p.name, selected);
    b.dataset.palette = p.id;
    const chip = document.createElement('span');
    chip.className = 'swatch-chip';
    chip.style.setProperty('--sw-bezel', p.bezel);
    chip.style.setProperty('--sw-frame', p.frame);
    chip.style.setProperty('--sw-face', p.face);
    chip.style.setProperty('--sw-text', p.text);
    chip.innerHTML = '<i>1</i><i>2</i><i>3</i><i></i>';
    b.prepend(chip);
    return b;
  }

  function picture(id: string, name: string, url: string | null, selected: boolean): HTMLButtonElement {
    const b = option(name, selected);
    b.dataset.image = id;
    const thumb = document.createElement('span');
    thumb.className = url ? 'picture-thumb' : 'picture-thumb picture-thumb--numbers';
    if (url) {
      thumb.style.backgroundImage = `url("${url}")`;
      if (id !== 'user' && !id.startsWith('file:')) thumb.classList.add('pixelated');
    } else {
      thumb.textContent = '123';
    }
    b.prepend(thumb);
    return b;
  }

  colorGrid.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-palette]');
    if (!b) return;
    h.palette(b.dataset.palette!);
    render();
  });
  imageGrid.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-image]');
    if (!b) return;
    h.image(b.dataset.image!);
    render();
  });
  volumeGrid.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-volume]');
    if (!b) return;
    h.volume(Number(b.dataset.volume));
    render();
  });
  musicGrid.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-music]');
    if (!b) return;
    h.music(b.dataset.music === 'true');
    render();
  });
  vibrationGrid.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-vibration]');
    if (!b) return;
    h.vibration(b.dataset.vibration === 'true');
    render();
  });
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    uploadBtn.disabled = true;
    try {
      await h.photo(file);
    } catch {
      alert('NÃO DEU PARA ABRIR ESSA IMAGEM.');
    } finally {
      uploadBtn.disabled = false;
      render();
    }
  });
  newGameBtn.addEventListener('click', () => {
    dlg.close();
    h.newGame();
  });
  updateBtn.addEventListener('click', () => h.update());
  installBtn.addEventListener('click', () => {
    dlg.close();
    h.install();
  });
  close.addEventListener('click', () => dlg.close());
  // Toque fora do painel (no fundo escurecido) fecha.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });

  return {
    el: dlg,
    open() {
      render();
      h.open();
      dlg.showModal();
    },
    refresh() {
      if (dlg.open) render();
    },
  };
}

function section(label: string): HTMLElement {
  const s = document.createElement('section');
  s.className = 'menu-section';
  const h = document.createElement('h3');
  h.textContent = label;
  s.append(h);
  return s;
}

function grid(modifier: string): HTMLDivElement {
  const g = document.createElement('div');
  g.className = `option-grid option-grid--${modifier}`;
  return g;
}

function option(name: string, selected: boolean): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'option';
  b.setAttribute('aria-pressed', String(selected));
  const label = document.createElement('span');
  label.className = 'option-label';
  label.textContent = name;
  b.append(label);
  return b;
}
