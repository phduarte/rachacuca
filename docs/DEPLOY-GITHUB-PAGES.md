# Publicar o Racha Cuca no GitHub Pages

O jogo é um site estático gerado pelo Vite (`npm run build` → pasta `dist/`), então o GitHub Pages o serve sem servidor. O deploy roda por GitHub Actions a cada push na `main`, e o jogo fica em **<https://phduarte.github.io/rachacuca/>**.

Como o site fica num subcaminho (`/rachacuca/`) e não na raiz do domínio, o único ajuste de código necessário é fazer o Vite, o manifest e o service worker do PWA respeitarem esse caminho.

## Pré-requisitos

- Repositório `phduarte/rachacuca` no GitHub, com a `main` já enviada (`git push origin main`).
- Repositório público — ou plano GitHub Pro/Team, se for privado.
- Permissão de admin no repositório, para alterar **Settings → Pages**.
- Build funcionando localmente: `npm ci && npm run build` deve terminar sem erros (inclui o `tsc --noEmit`).

## 1. Ajustar o caminho base

Sem este passo, o site abre em branco: o HTML pede `/assets/...` na raiz do domínio, e os arquivos estão em `/rachacuca/assets/...`.

**vite.config.ts** — adicione `base` (o resto do arquivo fica igual):

```ts
export default defineConfig({
  base: '/rachacuca/',
  plugins: [ /* VitePWA como está */ ],
  build: { target: 'es2022' },
});
```

Com isso, o Vite reescreve os links do `index.html` (manifest, script, CSS) e o `vite-plugin-pwa` registra o service worker e o precache já dentro de `/rachacuca/`.

**index.html** — o Vite só reescreve links para arquivos que existem. Enquanto os ícones não existirem, o `apple-touch-icon` usa o placeholder `%BASE_URL%`:

```html
<link rel="apple-touch-icon" href="%BASE_URL%icons/apple-touch-icon-180.png" />
```

**public/manifest.webmanifest** — este arquivo é copiado sem processamento, então troque os caminhos absolutos por relativos (resolvidos a partir da pasta do próprio manifest):

```json
"start_url": "./?source=pwa",
"scope": "./",
"icons": [
  { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
  { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
  { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
]
```

> **Pendência:** a pasta `public/icons/` ainda não existe no repositório. Sem os PNGs o site funciona, mas o navegador não oferece "Instalar app".

Se algum código futuro montar URLs à mão (ex.: `fetch('/dados.json')`), use `import.meta.env.BASE_URL + 'dados.json'`.

## 2. Criar o workflow de deploy

Crie o arquivo `.github/workflows/deploy.yml`. Ele roda os testes, gera o build e publica a pasta `dist/` a cada push na `main` (ou manualmente, pela aba **Actions**).

```yaml
name: Deploy no GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Node 22 atende ao Vite 8. Se o GitHub marcar alguma versão de action como obsoleta, suba para a mais nova.

Faça commit das três mudanças e envie:

```bash
git add vite.config.ts index.html public/manifest.webmanifest .github/workflows/deploy.yml
git commit -m "Publica o jogo no GitHub Pages"
git push origin main
```

## 3. Ativar o GitHub Pages

1. No GitHub, abra o repositório → **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **GitHub Actions** (não "Deploy from a branch").
3. Abra a aba **Actions** e acompanhe o workflow "Deploy no GitHub Pages". Se ele rodou antes de você trocar a Source e falhou, clique em **Re-run all jobs** (ou use **Run workflow**).
4. Quando o job `deploy` ficar verde, o link aparece no resumo do job e em **Settings → Pages**: <https://phduarte.github.io/rachacuca/>

Daqui em diante, todo push na `main` publica uma nova versão em 1–2 minutos.

## Verificação e solução de problemas

Antes de enviar, teste o build com o caminho base localmente:

```bash
npm run build
npm run preview   # abra http://localhost:4173/rachacuca/
```

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| Página em branco; console com 404 em `/assets/*.js` | `base` ausente ou com nome errado | `base: '/rachacuca/'` — com barras nas duas pontas e o nome exato do repositório |
| 404 do GitHub na URL do site | Source de Pages não é "GitHub Actions", ou deploy ainda não terminou | Passo 3; confira a aba Actions |
| Workflow falha em `deploy` com erro de permissão/ambiente | Bloco `permissions` ausente ou Source errada | Copie o YAML inteiro; Source = GitHub Actions |
| Workflow falha em `npm ci` | `package-lock.json` desatualizado | Rode `npm install` localmente e faça commit do lock |
| "Instalar app" não aparece | Ícones ausentes em `public/icons/` ou caminhos absolutos no manifest | Adicione os PNGs; use caminhos relativos (passo 1) |
| Versão antiga continua aparecendo | Service worker serve o cache anterior | O jogo pergunta antes de atualizar (`registerType: 'prompt'`); aceite o aviso ou feche e reabra a aba |

Para usar um domínio próprio depois, configure-o em **Settings → Pages → Custom domain** e troque `base` para `'/'`, voltando o manifest a caminhos com `/`.
