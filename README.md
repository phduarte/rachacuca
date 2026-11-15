# Racha Cuca

Quebra-cabeça deslizante (Jogo dos 15) em PWA para mobile, em tela cheia, com visual e som dos anos 80/90.

A especificação completa está em [docs/SPECS.md](docs/SPECS.md).

## Desenvolvimento

Requer Node.js 20+. Stack: TypeScript + Vite + `vite-plugin-pwa`, testes com Vitest (seção 11 da especificação).

```sh
npm install
npm run dev        # servidor local (também acessível pela rede, para testar no celular)
npm test           # testes de lógica (src/**/*.test.ts)
npm run build      # checagem de tipos + build de produção em dist/
npm run preview    # serve o build (com service worker)
```

> No Windows, `npm test` passa por `scripts/vitest.mjs`, que corrige a letra do drive em minúscula (`d:\`) antes de chamar o Vitest. Sem isso, os testes falham com `Cannot read properties of undefined (reading 'config')`.
