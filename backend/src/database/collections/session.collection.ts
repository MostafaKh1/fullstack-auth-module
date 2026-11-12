import { Schema, type Types } from "mongoose";
import type { RevokedReason } from "@/common/types/session.types";

export type SessionDocument = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  secretHash: string;
  previousSecretHash: string | null;
  previousReplacedAt: Date | null;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokedReason | null;
  userAgent: string | null;
  createdAt: Date;
};

export const SESSION_MODEL = "Session";

export const sessionSchema = new Schema<SessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    secretHash: { type: String, required: true, select: false },
    previousSecretHash: { type: String, default: null, select: false },
    previousReplacedAt: { type: Date, default: null },
    // Mongo removes a Session once its idle expiry has passed (ADR 0001).
    idleExpiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    absoluteExpiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: ["sign-out", "reuse-detected", null], default: null },
    userAgent: { type: String, default: null },
    createdAt: { type: Date, required: true },
  },
  { collection: "sessions", versionKey: false },
);
