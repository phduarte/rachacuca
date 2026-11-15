import { describe, expect, it } from 'vitest';
import { formatTime, Timer } from './timer';

describe('Timer', () => {
  it('conta só enquanto está rodando', () => {
    let now = 0;
    const t = new Timer(0, () => now);
    t.start();
    now = 1000;
    t.pause();
    now = 5000;
    expect(t.elapsedMs()).toBe(1000);
    t.start();
    now = 5500;
    expect(t.elapsedMs()).toBe(1500);
  });

  it('retoma de um tempo salvo', () => {
    let now = 0;
    const t = new Timer(60_000, () => now);
    t.start();
    now = 2000;
    expect(t.elapsedMs()).toBe(62_000);
  });

  it('formata tempo', () => {
    expect(formatTime(83_456)).toBe('01:23');
    expect(formatTime(3_723_000)).toBe('1:02:03');
  });
});
