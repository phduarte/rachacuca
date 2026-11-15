/** Registro do service worker com atualização sob confirmação (seção 9.4). */
import { registerSW } from 'virtual:pwa-register';

export function setupServiceWorker(onNeedRefresh: (apply: () => void) => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh: () => onNeedRefresh(() => void update(true)),
  });
}
