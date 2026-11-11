import { Controller, Get } from "@nestjs/common";
import { CurrentAuth } from "../../common/decorators/current-auth.decorator";
import type { AuthContext } from "../../common/services/access-token.service";
import type { User } from "../auth/auth.types";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** The protected endpoint: the signed-in User. */
  @Get("me")
  me(@CurrentAuth() auth: AuthContext): Promise<User> {
    return this.usersService.getCurrentUser(auth.userId);
  }
}
