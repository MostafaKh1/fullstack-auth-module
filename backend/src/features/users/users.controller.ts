import { Controller, Get } from "@nestjs/common";
import type { AccessClaims } from "../../auth/access-token.service";
import { CurrentSession } from "../../auth/current-session.decorator";
import type { User } from "../../database/user.repository";
import { GetCurrentUserHandler } from "./handlers/get-current-user.handler";

@Controller("users")
export class UsersController {
  constructor(private readonly getCurrentUserHandler: GetCurrentUserHandler) {}

  /** The protected endpoint: the signed-in User. */
  @Get("me")
  me(@CurrentSession() session: AccessClaims): Promise<User> {
    return this.getCurrentUserHandler.execute(session.userId);
  }
}
