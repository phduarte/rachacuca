/**
 * Efeitos de tubo de TV (seções 10.1, 10.2 e 3.1): camada CRT (linhas de
 * varredura, vinheta e aberração cromática nos textos), glitch de troca de
 * canal e a transição de "desligar o tubo" entre telas.
 * Tudo em camadas fixas, transform e opacity, para não derrubar os 60 fps do
 * deslize. Respeita prefers-reduced-motion.
 */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let layer: HTMLDivElement | null = null;

/** Liga ou desliga a camada CRT (opção EFEITO CRT, padrão ligado). */
export function setCrt(on: boolean): void {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'crt';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
  }
  layer.hidden = !on;
  document.documentElement.classList.toggle('crt-on', on);
}

/** "Glitch" de 80 ms: faixas da tela pulam para o lado, como trocar de canal. */
export function glitch(): void {
  if (reduced.matches) return;
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) return;
  app.classList.remove('glitch');
  void app.offsetWidth;
  app.classList.add('glitch');
  // Faixas sorteadas: 2 a 4 linhas grossas deslocadas.
  const bands = 2 + Math.floor(Math.random() * 3);
  const stops: string[] = [];
  for (let i = 0; i < bands; i++) {
    const y = Math.round(Math.random() * 90);
    const h = 2 + Math.round(Math.random() * 6);
    stops.push(`transparent ${y}%, rgb(255 255 255 / 0.18) ${y}%, rgb(255 255 255 / 0.18) ${y + h}%, transparent ${y + h}%`);
  }
  app.style.setProperty('--glitch-bands', `linear-gradient(${stops.join(', ')})`);
  setTimeout(() => app.classList.remove('glitch'), 80);
}
