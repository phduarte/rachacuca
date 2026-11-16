/** Pergunta SIM/NÃO na arte do jogo (sem confirm nativo). */
export function confirmDialog(title: string, text: string, yes = 'SIM', no = 'NÃO'): Promise<boolean> {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'menu confirm';
    const head = document.createElement('header');
    head.className = 'menu-head';
    const h = document.createElement('h2');
    h.textContent = title;
    head.append(h);
    const body = document.createElement('div');
    body.className = 'menu-body';
    const p = document.createElement('p');
    p.className = 'confirm-text';
    p.textContent = text;
    const actions = document.createElement('div');
    actions.className = 'confirm-actions';
    const yesBtn = document.createElement('button');
    yesBtn.className = 'menu-primary';
    yesBtn.textContent = yes;
    const noBtn = document.createElement('button');
    noBtn.className = 'pause-option';
    noBtn.textContent = no;
    actions.append(yesBtn, noBtn);
    body.append(p, actions);
    dlg.append(head, body);
    let answer = false;
    yesBtn.addEventListener('click', () => {
      answer = true;
      dlg.close();
    });
    noBtn.addEventListener('click', () => dlg.close());
    // Fechar por Esc ou pelo voltar do Android conta como NÃO.
    dlg.addEventListener('close', () => {
      dlg.remove();
      resolve(answer);
    });
    document.body.append(dlg);
    dlg.showModal();
    yesBtn.focus();
  });
}
