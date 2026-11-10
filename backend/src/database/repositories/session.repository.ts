import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, type Model, Types } from "mongoose";
import { type RevokedReason, SESSION_MODEL, type SessionDocument } from "../collections/session.collection";

/** A Session as the rest of the application sees it: never with its secret hashes. */
export type Session = {
  id: string;
  userId: string;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokedReason | null;
};

/** A Session with the hashes refresh compares against; only `findWithSecretHashesById` returns one. */
export type SessionWithSecretHashes = {
  session: Session;
  secretHash: string;
  previousSecretHash: string | null;
  previousReplacedAt: Date | null;
};

/** The only door to the sessions collection. */
@Injectable()
export class SessionRepository implements OnModuleInit {
  constructor(@InjectModel(SESSION_MODEL) private readonly model: Model<SessionDocument>) {}

  async onModuleInit(): Promise<void> {
    await this.model.init();
  }

  /** Mints the id a new Session will have, so its refresh credential can be built before it is stored. */
  newId(): string {
    return new Types.ObjectId().toString();
  }

  async create(fields: {
    id: string;
    userId: string;
    secretHash: string;
    idleExpiresAt: Date;
    absoluteExpiresAt: Date;
    userAgent: string | null;
    createdAt: Date;
  }): Promise<void> {
    const { id, userId, ...rest } = fields;
    await this.model.create({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), ...rest });
  }

  /** One read by primary key, cheap enough for every protected request. */
  async findById(id: string): Promise<Session | null> {
    if (!isValidObjectId(id)) return null;
    const found = await this.model.findById(id).lean();
    return found ? toSession(found) : null;
  }

  /** The one read of a Session's secret hashes, for refresh. */
  async findWithSecretHashesById(id: string): Promise<SessionWithSecretHashes | null> {
    if (!isValidObjectId(id)) return null;
    const found = await this.model.findById(id).select("+secretHash +previousSecretHash").lean();
    if (!found) return null;
    return {
      session: toSession(found),
      secretHash: found.secretHash,
      previousSecretHash: found.previousSecretHash ?? null,
      previousReplacedAt: found.previousReplacedAt ?? null,
    };
  }

  /**
   * Replaces the secret in one conditional update: it applies only while `expectedSecretHash` is still the current
   * secret and the Session is not revoked, so of two concurrent rotations exactly one wins. Returns whether it applied.
   */
  async rotateSecret(
    id: string,
    change: { expectedSecretHash: string; newSecretHash: string; replacedAt: Date; idleExpiresAt: Date },
  ): Promise<boolean> {
    const result = await this.model.updateOne(
      { _id: new Types.ObjectId(id), secretHash: change.expectedSecretHash, revokedAt: null },
      {
        $set: {
          secretHash: change.newSecretHash,
          previousSecretHash: change.expectedSecretHash,
          previousReplacedAt: change.replacedAt,
          idleExpiresAt: change.idleExpiresAt,
        },
      },
    );
    return result.modifiedCount === 1;
  }

  /** Revokes the Session, keeping the first revocation's time and reason. */
  async revoke(id: string, reason: RevokedReason, at: Date): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(id), revokedAt: null },
      { $set: { revokedAt: at, revokedReason: reason } },
    );
  }
}

function toSession(
  document: Pick<
    SessionDocument,
    "_id" | "userId" | "idleExpiresAt" | "absoluteExpiresAt" | "revokedAt" | "revokedReason"
  >,
): Session {
  return {
    id: document._id.toString(),
    userId: document.userId.toString(),
    idleExpiresAt: document.idleExpiresAt,
    absoluteExpiresAt: document.absoluteExpiresAt,
    revokedAt: document.revokedAt ?? null,
    revokedReason: document.revokedReason ?? null,
  };
}
