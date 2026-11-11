import { Controller, Get } from "@nestjs/common";
import type { AccessClaims, User } from "../../auth/auth.types";
import { CurrentUser } from "../../common/current-user.decorator";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** The protected endpoint: the signed-in User. */
  @Get("me")
  me(@CurrentUser() currentUser: AccessClaims): Promise<User> {
    return this.usersService.getCurrentUser(currentUser.userId);
  }
}
