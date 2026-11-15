# AGENTS.md

Regras para agentes (Claude Code, Codex etc.) que trabalham neste repositório.

## Versões e releases

O deploy no GitHub Pages roda a cada release publicada (veja [docs/DEPLOY-GITHUB-PAGES.md](docs/DEPLOY-GITHUB-PAGES.md)). As versões seguem `MAJOR.MINOR.PATCH`, com tag `vMAJOR.MINOR.PATCH`.

- **Toda release incrementa o PATCH.** Exemplo: `v0.2.3` → `v0.2.4`.
- **Quando a release entrega um milestone, incrementa o MINOR e zera o PATCH.** Exemplo: `v0.2.4` → `v0.3.0`. Os milestones são as fases do plano de entrega em [docs/SPECS.md](docs/SPECS.md), seção 14 (Núcleo, Sensação, Visual retrô...). A fase N concluída corresponde à versão `0.N.0`.
- **O MAJOR só muda quando o usuário pedir.**
- Nunca reutilize nem pule números. Antes de escolher a versão, confira a última tag com `git tag --sort=-v:refname | head -1` e, se ela não existir, parta do `version` do [package.json](package.json).
- Se não estiver claro se a release fecha um milestone, pergunte antes de criar a tag.

Para publicar uma release:

1. Atualize `version` no [package.json](package.json) (e no `package-lock.json`) com `npm version <x.y.z> --no-git-tag-version` e faça commit.
2. Crie a tag e envie: `git tag vX.Y.Z && git push origin main vX.Y.Z`.
3. Publique a release: `gh release create vX.Y.Z --generate-notes`. No milestone, cite a fase entregue no título (ex.: `v0.3.0 — Visual retrô`).

Criar tag, enviar e publicar release são ações públicas: só faça quando o usuário pedir.
