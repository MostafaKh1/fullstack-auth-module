import type { ClockService } from "../../core/clock.service";

/** A clock that stands still until a test moves it. */
export class FakeClock implements ClockService {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(at: Date): void {
    this.current = new Date(at.getTime());
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
