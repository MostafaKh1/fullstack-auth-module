import { Injectable } from "@nestjs/common";

/**
 * The application's only source of the current time, so expiry and grace windows are testable.
 * Inject `ClockService`; never call `Date.now()` or `new Date()` for the current time elsewhere.
 */
@Injectable()
export class ClockService {
  now(): Date {
    return new Date();
  }
}
