import { Injectable } from "@nestjs/common";
import { ApiError } from "@/common/errors/api-error";
import type { User } from "@/common/types/user.types";
import { UserRepository } from "@/database/repositories/user.repository";

@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user)
      throw new ApiError("auth.unauthenticated", { message: "The signed-in User no longer exists." });
    return user;
  }
}
