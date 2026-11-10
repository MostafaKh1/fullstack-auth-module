import { Injectable } from "@nestjs/common";
import { ApiError } from "../../../common/errors/api-error";
import { type User, UserRepository } from "../../../database/repositories/user.repository";

/** Get current User: the User the signed-in Session belongs to. */
@Injectable()
export class GetCurrentUserHandler {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user)
      throw new ApiError("auth.unauthenticated", { message: "The signed-in User no longer exists." });
    return user;
  }
}
