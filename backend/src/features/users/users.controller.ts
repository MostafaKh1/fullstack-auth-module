import { contract } from "@app/contract";
import { Controller } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import type { AuthContext } from "@/common/services/access-token.service.js";
import { CurrentAuth } from "./current-auth.decorator.js";
import { UsersService } from "./users.service.js";

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Implement(contract.users.me)
  me(@CurrentAuth() auth: AuthContext) {
    return implement(contract.users.me).handler(() => this.usersService.getCurrentUser(auth.userId));
  }
}
