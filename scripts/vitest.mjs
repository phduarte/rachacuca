// Vitest no Windows carrega duas cópias de si mesmo quando o diretório atual
// usa a letra do drive em minúscula (ex.: "d:\Repos" aberto pelo VS Code),
// e os testes falham com "Cannot read properties of undefined (reading 'config')".
// Este wrapper normaliza a letra do drive antes de iniciar o Vitest.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase());
const cli = join(cwd, 'node_modules', 'vitest', 'vitest.mjs');
const { status } = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { cwd, stdio: 'inherit' });
process.exit(status ?? 1);
