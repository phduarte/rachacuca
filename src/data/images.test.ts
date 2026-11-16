import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { deleteImage, ImageRuleError, isOriginal } from './images';
import { ORIGINAL_IMAGES } from '../theme/originals';

describe('banco de imagens (seção 4.2)', () => {
  it('reconhece as imagens que vêm com o jogo', () => {
    expect(isOriginal('orig-01')).toBe(true);
    expect(isOriginal('sunset')).toBe(true);
    expect(isOriginal('u-123')).toBe(false);
  });

  it.each(ORIGINAL_IMAGES.map((i) => i.id))('rejeita apagar a original %s por chamada direta', async (id) => {
    await expect(deleteImage(id)).rejects.toBeInstanceOf(ImageRuleError);
  });
});

describe('limite de imagens do jogador (seção 4.2)', () => {
  it('aceita até 100 e recusa a 101ª', async () => {
    const { addImage, USER_LIMIT, userCount } = await import('./images');
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
    for (let i = userCount(); i < USER_LIMIT; i++) await addImage({ blob, thumb: blob, side: 8, title: `T${i}` });
    expect(userCount()).toBe(USER_LIMIT);
    await expect(addImage({ blob, thumb: blob, side: 8, title: 'DEMAIS' })).rejects.toBeInstanceOf(ImageRuleError);
  });
});
