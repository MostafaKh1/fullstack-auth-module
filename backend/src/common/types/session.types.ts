export type RevokedReason = "sign-out" | "reuse-detected";

/** A Session as the application sees it: never with its secret hashes (ADR 0001). */
export type Session = {
  id: string;
  userId: string;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokedReason | null;
};
