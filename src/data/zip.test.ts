import { describe, expect, it } from 'vitest';
import { crc32, createZip, readZip } from './zip';

const enc = new TextEncoder();

describe('zip do backup (seção 4.2)', () => {
  it('calcula o CRC-32 padrão', () => {
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
  });

  it('grava e lê de volta as mesmas entradas', async () => {
    const entries = [
      { name: 'manifest.json', data: enc.encode('{"ok":true}') },
      { name: 'imagens/ação.webp', data: new Uint8Array([1, 2, 3, 250, 0, 7]) },
      { name: 'vazio.bin', data: new Uint8Array() },
    ];
    const back = await readZip(createZip(entries));
    expect(back.map((e) => e.name)).toEqual(entries.map((e) => e.name));
    back.forEach((e, i) => expect([...e.data]).toEqual([...entries[i]!.data]));
  });

  it('lê entradas compactadas com deflate', async () => {
    // Monta um zip "store" e troca a entrada por uma versão deflate.
    const text = enc.encode('racha cuca '.repeat(50));
    const zip = createZip([{ name: 'a.txt', data: text }]);
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const comp = new Uint8Array(await new Response(stream).arrayBuffer());
    const view = new DataView(zip.buffer);
    const nameLen = view.getUint16(26, true);
    const head = zip.slice(0, 30 + nameLen);
    const central = zip.slice(30 + nameLen + text.length);
    const hv = new DataView(head.buffer);
    hv.setUint16(8, 8, true);
    hv.setUint32(18, comp.length, true);
    const cv = new DataView(central.buffer);
    cv.setUint16(10, 8, true);
    cv.setUint32(20, comp.length, true);
    // O fim do diretório aponta para o novo início do diretório central.
    const eocd = central.length - 22;
    cv.setUint32(eocd + 16, head.length + comp.length, true);
    const rebuilt = new Uint8Array(head.length + comp.length + central.length);
    rebuilt.set(head);
    rebuilt.set(comp, head.length);
    rebuilt.set(central, head.length + comp.length);
    const [e] = await readZip(rebuilt);
    expect(new TextDecoder().decode(e!.data)).toBe('racha cuca '.repeat(50));
  });

  it('recusa o que não é zip', async () => {
    await expect(readZip(enc.encode('não sou um zip, sou um texto qualquer'))).rejects.toThrow();
  });
});
