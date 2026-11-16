/**
 * Convite para instalar (seção 9.3). No Android/Chrome o navegador avisa que
 * o app pode ser instalado (`beforeinstallprompt`) e o menu mostra INSTALAR.
 * No iOS não há esse evento: o jogo mostra, uma única vez, como adicionar à
 * Tela de Início pelo Safari (e o menu mantém o guia à mão).
 */
import { isInstalled } from './fullscreen';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'prompt' | 'ios' | null;

let deferred: BeforeInstallPromptEvent | null = null;
let installed = isInstalled();

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Como oferecer a instalação agora (ou null se não há o que oferecer). */
export function installMode(): InstallMode {
  if (installed) return null;
  if (deferred) return 'prompt';
  return isIOS() ? 'ios' : null;
}

/** `onChange` avisa quando o modo muda (convite chegou, app instalado). */
export function setupInstall(onChange: () => void): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // o convite fica no menu, não na barra do navegador
    deferred = e as BeforeInstallPromptEvent;
    onChange();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    onChange();
  });
}

/** Abre o convite do navegador; o evento só vale uma vez. */
export async function promptInstall(): Promise<void> {
  const e = deferred;
  if (!e) return;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === 'accepted') installed = true;
}
