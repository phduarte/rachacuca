/**
 * Recorte quadrado (seção 4.2): arrastar move a imagem, pinça (dois dedos) ou
 * a roda do mouse dá zoom. Ao lado, prévia ao vivo no modo retrô com a paleta
 * atual. Confirmar devolve o recorte em pixels da imagem; cancelar, null.
 */
import type { Crop } from '../data/images';
import type { Palette } from '../theme/palettes';
import { quantize } from '../theme/quantize';
import { paletteColors } from '../theme/retroize';

const PREVIEW_GRID = 64;
const MAX_ZOOM = 6;

export async function cropImage(file: File, palette: Palette): Promise<Crop | null> {
  const bitmap = await createImageBitmap(file);
  const W = bitmap.width;
  const H = bitmap.height;

  const dlg = document.createElement('dialog');
  dlg.className = 'crop';
  dlg.setAttribute('aria-label', 'Recortar a imagem');

  const title = document.createElement('h2');
  title.textContent = 'RECORTAR';
  const hint = document.createElement('p');
  hint.className = 'crop-hint';
  hint.textContent = 'ARRASTE PARA MOVER · PINÇA OU RODA PARA ZOOM';

  const stage = document.createElement('div');
  stage.className = 'crop-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'crop-canvas';
  stage.append(canvas);

  const previewBox = document.createElement('div');
  previewBox.className = 'crop-preview';
  const preview = document.createElement('canvas');
  preview.width = preview.height = PREVIEW_GRID;
  const previewLabel = document.createElement('span');
  previewLabel.textContent = 'MODO RETRÔ';
  previewBox.append(preview, previewLabel);

  const actions = document.createElement('div');
  actions.className = 'crop-actions';
  const cancel = document.createElement('button');
  cancel.className = 'icon-btn close-btn crop-cancel';
  cancel.setAttribute('aria-label', 'Cancelar');
  cancel.innerHTML = '<span></span><span></span>';
  const ok = document.createElement('button');
  ok.className = 'menu-primary crop-ok';
  ok.textContent = '✓ USAR';
  ok.setAttribute('aria-label', 'Confirmar o recorte');
  actions.append(cancel, previewBox, ok);

  dlg.append(title, hint, stage, actions);
  document.body.append(dlg);

  // Estado: lado do recorte em pixels da imagem e o canto superior esquerdo.
  const minSide = Math.min(W, H) / MAX_ZOOM;
  let side = Math.min(W, H);
  let x = (W - side) / 2;
  let y = (H - side) / 2;

  const clamp = () => {
    side = Math.max(minSide, Math.min(Math.min(W, H), side));
    x = Math.max(0, Math.min(W - side, x));
    y = Math.max(0, Math.min(H - side, y));
  };

  const ctx = canvas.getContext('2d')!;
  const pctx = preview.getContext('2d', { willReadFrequently: true })!;
  const colors = paletteColors(palette);
  let frame = 0;
  let previewTimer = 0;

  function view(): number {
    return canvas.getBoundingClientRect().width || 1;
  }

  function draw(): void {
    frame = 0;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const px = Math.round(view() * dpr);
    if (canvas.width !== px) canvas.width = canvas.height = px;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, x, y, side, side, 0, 0, px, px);
    clearTimeout(previewTimer);
    previewTimer = window.setTimeout(drawPreview, 120);
  }

  function drawPreview(): void {
    pctx.imageSmoothingQuality = 'high';
    pctx.drawImage(bitmap, x, y, side, side, 0, 0, PREVIEW_GRID, PREVIEW_GRID);
    const img = pctx.getImageData(0, 0, PREVIEW_GRID, PREVIEW_GRID);
    img.data.set(quantize(img.data, PREVIEW_GRID, PREVIEW_GRID, colors, 'bayer'));
    pctx.putImageData(img, 0, 0);
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };

  /** Zoom em torno de um ponto da tela (fração 0..1 do quadro). */
  function zoom(factor: number, fx = 0.5, fy = 0.5): void {
    const old = side;
    side = side / factor;
    clamp();
    x += (old - side) * fx;
    y += (old - side) * fy;
    clamp();
    schedule();
  }

  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { dist: number } | null = null;

  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  });
  stage.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, now);
    const scale = side / view();
    if (pointers.size === 1) {
      x -= (now.x - prev.x) * scale;
      y -= (now.y - prev.y) * scale;
      clamp();
      schedule();
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = stage.getBoundingClientRect();
      zoom(dist / pinch.dist, ((a.x + b.x) / 2 - r.left) / r.width, ((a.y + b.y) / 2 - r.top) / r.height);
      pinch.dist = dist;
    }
  });
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    },
    { passive: false },
  );
  // Teclado: setas movem, +/− dão zoom.
  dlg.addEventListener('keydown', (e) => {
    const step = side * 0.05;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => (x -= step),
      ArrowRight: () => (x += step),
      ArrowUp: () => (y -= step),
      ArrowDown: () => (y += step),
      '+': () => zoom(1.1),
      '=': () => zoom(1.1),
      '-': () => zoom(1 / 1.1),
    };
    const fn = keys[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
    clamp();
    schedule();
  });

  return new Promise((resolve) => {
    let result: Crop | null = null;
    ok.addEventListener('click', () => {
      result = { x, y, side };
      dlg.close();
    });
    cancel.addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => {
      clearTimeout(previewTimer);
      cancelAnimationFrame(frame);
      bitmap.close();
      dlg.remove();
      resolve(result);
    });
    dlg.showModal();
    requestAnimationFrame(draw);
    ok.focus();
  });
}
