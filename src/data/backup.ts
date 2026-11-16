/**
 * Backup do banco de imagens do jogador (seção 4.2): exporta um .zip com as
 * imagens, as miniaturas e um manifest.json (título, ativa, data); importa de
 * volta sem duplicar as que já existem. Carregado sob demanda pela galeria.
 */
import { addImage, ImageRuleError, isOriginal, userEntries, userEntry } from './images';
import { createZip, readZip, type ZipEntry } from './zip';

interface ManifestImage {
  id: string;
  title: string;
  enabled: boolean;
  createdAt: number;
  width: number;
  height: number;
  file: string;
  thumb?: string;
}

interface Manifest {
  app: 'racha-cuca';
  version: 1;
  exportedAt: string;
  images: ManifestImage[];
}

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const MIME: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

async function bytes(b: Blob): Promise<Uint8Array> {
  return new Uint8Array(await b.arrayBuffer());
}

export async function exportBackup(): Promise<Blob> {
  const entries: ZipEntry[] = [];
  const images: ManifestImage[] = [];
  for (const e of userEntries()) {
    if (!e.blob) continue;
    const file = `imagens/${e.id}.${EXT[e.blob.type] ?? 'bin'}`;
    entries.push({ name: file, data: await bytes(e.blob) });
    let thumb: string | undefined;
    if (e.thumb) {
      thumb = `miniaturas/${e.id}.${EXT[e.thumb.type] ?? 'bin'}`;
      entries.push({ name: thumb, data: await bytes(e.thumb) });
    }
    images.push({ id: e.id, title: e.title, enabled: e.enabled, createdAt: e.createdAt, width: e.width, height: e.height, file, thumb });
  }
  const manifest: Manifest = { app: 'racha-cuca', version: 1, exportedAt: new Date().toISOString(), images };
  entries.unshift({ name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) });
  return new Blob([createZip(entries) as BlobPart], { type: 'application/zip' });
}

function blobOf(entry: ZipEntry | undefined, name: string): Blob | null {
  if (!entry) return null;
  const ext = name.split('.').pop()!.toLowerCase();
  return new Blob([entry.data as BlobPart], { type: MIME[ext] ?? 'application/octet-stream' });
}

/** Importa um backup. Devolve quantas entraram e quantas já existiam. */
export async function importBackup(file: Blob): Promise<{ added: number; skipped: number }> {
  let entries: ZipEntry[];
  try {
    entries = await readZip(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new ImageRuleError('ESSE ARQUIVO NÃO É UM BACKUP .ZIP VÁLIDO.');
  }
  const byName = new Map(entries.map((e) => [e.name, e]));
  const raw = byName.get('manifest.json');
  let manifest: Manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(raw?.data)) as Manifest;
    if (manifest.app !== 'racha-cuca' || !Array.isArray(manifest.images)) throw new Error();
  } catch {
    throw new ImageRuleError('BACKUP SEM MANIFEST.JSON DO RACHA CUCA.');
  }
  let added = 0;
  let skipped = 0;
  for (const m of manifest.images) {
    // Sem duplicar: a mesma imagem (mesmo id) já está no banco.
    if (userEntry(m.id) || isOriginal(m.id)) {
      skipped++;
      continue;
    }
    const blob = blobOf(byName.get(m.file), m.file);
    if (!blob) continue;
    const thumb = (m.thumb && blobOf(byName.get(m.thumb), m.thumb)) || blob;
    await addImage({
      id: m.id,
      blob,
      thumb,
      side: m.width,
      title: String(m.title || 'MINHA IMAGEM').slice(0, 24),
      enabled: m.enabled !== false,
      createdAt: m.createdAt || Date.now(),
    });
    added++;
  }
  return { added, skipped };
}
