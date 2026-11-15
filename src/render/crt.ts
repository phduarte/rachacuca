/**
 * Efeitos de tubo de TV (seção 10.1 e 3.1): glitch de troca de canal.
 * Respeita prefers-reduced-motion (sem glitch).
 */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

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
