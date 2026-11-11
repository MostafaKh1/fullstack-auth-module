import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiErrors } from "../../common/decorators/api-errors.decorator";
import { CurrentAuth } from "../../common/decorators/current-auth.decorator";
import type { AuthContext } from "../../common/services/access-token.service";
import type { User } from "../auth/auth.types";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth("bearer")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiResponse({
    status: 200,
    description: "The signed-in User.",
    schema: { $ref: "#/components/schemas/User" },
  })
  @ApiErrors("auth.unauthenticated")
  @Get("me")
  me(@CurrentAuth() auth: AuthContext): Promise<User> {
    return this.usersService.getCurrentUser(auth.userId);
  }
}
