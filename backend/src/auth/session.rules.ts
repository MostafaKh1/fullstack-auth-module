import type { Session } from "../database/repositories/session.repository";

/** A Session is live while it is not revoked and has passed neither its idle nor its absolute expiry. */
export function isSessionLive(session: Session, now: Date): boolean {
  return (
    session.revokedAt === null &&
    session.idleExpiresAt.getTime() > now.getTime() &&
    session.absoluteExpiresAt.getTime() > now.getTime()
  );
}

/** The idle expiry a refresh at `now` gives: `idleTtlMs` ahead, but never past the absolute expiry. */
export function slidIdleExpiry(now: Date, idleTtlMs: number, absoluteExpiresAt: Date): Date {
  return new Date(Math.min(now.getTime() + idleTtlMs, absoluteExpiresAt.getTime()));
}

/** Whether a secret replaced at `replacedAt` is still accepted at `now`, so two tabs refreshing together are not replay. */
export function isWithinGrace(replacedAt: Date | null, now: Date, graceMs: number): boolean {
  return replacedAt !== null && now.getTime() - replacedAt.getTime() <= graceMs;
}
