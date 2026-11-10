import type { Session } from "../database/session.repository";

/** A Session is live while it is not revoked and has passed neither its idle nor its absolute expiry. */
export function isSessionLive(session: Session, now: Date): boolean {
  return (
    session.revokedAt === null &&
    session.idleExpiresAt.getTime() > now.getTime() &&
    session.absoluteExpiresAt.getTime() > now.getTime()
  );
}
