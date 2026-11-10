import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, type Model, Types } from "mongoose";
import { type RevokedReason, SESSION_MODEL, type SessionDocument } from "./session.model";

/** A Session as the rest of the application sees it: never with its secret hashes. */
export type Session = {
  id: string;
  userId: string;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokedReason | null;
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
    if (!found) return null;
    return {
      id: found._id.toString(),
      userId: found.userId.toString(),
      idleExpiresAt: found.idleExpiresAt,
      absoluteExpiresAt: found.absoluteExpiresAt,
      revokedAt: found.revokedAt ?? null,
      revokedReason: found.revokedReason ?? null,
    };
  }
}
