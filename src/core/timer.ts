/** Relógio com pausa baseado em um relógio monotônico (performance.now por padrão). */
export class Timer {
  private accumulated = 0;
  private startedAt: number | null = null;

  constructor(
    initialMs = 0,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.accumulated = initialMs;
  }

  get running(): boolean {
    return this.startedAt !== null;
  }

  start(): void {
    if (this.startedAt === null) this.startedAt = this.now();
  }

  pause(): void {
    if (this.startedAt === null) return;
    this.accumulated += this.now() - this.startedAt;
    this.startedAt = null;
  }

  reset(ms = 0): void {
    this.accumulated = ms;
    this.startedAt = null;
  }

  elapsedMs(): number {
    return this.accumulated + (this.startedAt === null ? 0 : this.now() - this.startedAt);
  }
}

/** 83_456 → "01:23" ; 3_723_000 → "1:02:03" */
export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
