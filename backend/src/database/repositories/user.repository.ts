import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, type Model } from "mongoose";
import { USER_MODEL, type UserDocument } from "../collections/user.collection";

/** A User as the rest of the application sees it: never with its password hash. */
export type User = { id: string; email: string; name: string; createdAt: Date };

const DUPLICATE_KEY = 11_000;

/** The only door to the users collection. */
@Injectable()
export class UserRepository implements OnModuleInit {
  constructor(@InjectModel(USER_MODEL) private readonly model: Model<UserDocument>) {}

  /** Waits for the unique email index, so concurrent Sign ups are caught by it from the first request. */
  async onModuleInit(): Promise<void> {
    await this.model.init();
  }

  /** Creates the User, or returns `null` when a User already has this email. */
  async create(fields: Omit<UserDocument, "_id">): Promise<User | null> {
    try {
      return toUser(await this.model.create(fields));
    } catch (error) {
      if ((error as { code?: unknown }).code === DUPLICATE_KEY) return null;
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    const found = await this.model.findById(id).lean();
    return found ? toUser(found) : null;
  }

  /** The one query that reads a password hash, for Sign in. */
  async findWithPasswordHashByEmail(email: string): Promise<{ user: User; passwordHash: string } | null> {
    const found = await this.model.findOne({ email }).select("+passwordHash").lean();
    return found ? { user: toUser(found), passwordHash: found.passwordHash } : null;
  }
}

function toUser(document: Pick<UserDocument, "_id" | "email" | "name" | "createdAt">): User {
  return {
    id: document._id.toString(),
    email: document.email,
    name: document.name,
    createdAt: document.createdAt,
  };
}
