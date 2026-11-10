import { Schema, type Types } from "mongoose";

export type UserDocument = {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
};

export const USER_MODEL = "User";

export const userSchema = new Schema<UserDocument>(
  {
    // Stored already trimmed and lowercased, so the unique index compares emails case-insensitively.
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    createdAt: { type: Date, required: true },
  },
  { collection: "users", versionKey: false },
);
