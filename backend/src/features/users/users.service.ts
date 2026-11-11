import { Injectable } from "@nestjs/common";
import type { User } from "../../auth/auth.types";
import { ApiError } from "../../common/errors/api-error";
import { UserRepository } from "../../database/repositories/user.repository";

/** The signed-in User's own record. */
@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  /** The User the signed-in Session belongs to. */
  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user)
      throw new ApiError("auth.unauthenticated", { message: "The signed-in User no longer exists." });
    return user;
  }
}
