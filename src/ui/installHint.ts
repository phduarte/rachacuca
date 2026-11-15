/** Guia de instalação no iOS (seção 9.3): Compartilhar → Adicionar à Tela de Início. */
export function createInstallHint(): { el: HTMLDialogElement; open(): void } {
  const dlg = document.createElement('dialog');
  dlg.className = 'menu install-hint';
  dlg.setAttribute('aria-labelledby', 'install-hint-title');

  const header = document.createElement('header');
  header.className = 'menu-head';
  const title = document.createElement('h2');
  title.id = 'install-hint-title';
  title.textContent = 'INSTALAR';
  const close = document.createElement('button');
  close.className = 'icon-btn close-btn';
  close.setAttribute('aria-label', 'Fechar');
  close.innerHTML = '<span></span><span></span>';
  header.append(title, close);

  const body = document.createElement('div');
  body.className = 'menu-body';
  const steps = document.createElement('ol');
  steps.className = 'install-steps';
  // Ícone de compartilhar do Safari em pixel art (caixa com seta para cima).
  const share = `<svg viewBox="0 0 8 8" width="24" height="24" shape-rendering="crispEdges" aria-label="Compartilhar">
    <path fill="currentColor" d="M3 0h2v1h1v1H5v3H3V2H2V1h1zM0 3h2v1H1v3h6V4H6V3h2v5H0z"/></svg>`;
  steps.innerHTML = `
    <li>NO SAFARI, TOQUE EM COMPARTILHAR ${share}</li>
    <li>ESCOLHA <b>ADICIONAR À TELA DE INÍCIO</b></li>
    <li>ABRA O RACHA CUCA PELO ÍCONE: TELA CHEIA E SEM INTERNET</li>`;
  const ok = document.createElement('button');
  ok.className = 'menu-primary';
  ok.textContent = 'OK';
  body.append(steps, ok);
  dlg.append(header, body);

  close.addEventListener('click', () => dlg.close());
  ok.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });

  return { el: dlg, open: () => dlg.showModal() };
}
