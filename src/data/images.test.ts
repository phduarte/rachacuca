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
