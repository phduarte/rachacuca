/** Créditos e licenças (seção 10.2, tela de opções). */
export interface Credit {
  what: string;
  who: string;
  license: string;
  url?: string;
}

export const CREDITS: Credit[] = [
  {
    what: 'FONTE FREDOKA',
    who: 'The Fredoka Project Authors',
    license: 'SIL Open Font License 1.1',
    url: `${import.meta.env.BASE_URL}fonts/OFL-Fredoka.txt`,
  },
  {
    what: '12 IMAGENS ORIGINAIS',
    who: 'Projeto Racha Cuca (pixel art original)',
    license: 'A mesma do projeto',
  },
  {
    what: 'FONTE PRESS START 2P',
    who: 'The Press Start 2P Project Authors',
    license: 'SIL Open Font License 1.1',
    url: `${import.meta.env.BASE_URL}fonts/OFL.txt`,
  },
];

export function creditsList(): HTMLUListElement {
  const ul = document.createElement('ul');
  ul.className = 'credits';
  for (const c of CREDITS) {
    const li = document.createElement('li');
    const what = document.createElement('strong');
    what.textContent = c.what;
    const who = document.createElement('span');
    who.textContent = c.who;
    const lic = c.url ? document.createElement('a') : document.createElement('span');
    lic.textContent = c.license;
    if (lic instanceof HTMLAnchorElement) {
      lic.href = c.url!;
      lic.target = '_blank';
      lic.rel = 'noopener';
    }
    li.append(what, who, lic);
    ul.append(li);
  }
  return ul;
}
