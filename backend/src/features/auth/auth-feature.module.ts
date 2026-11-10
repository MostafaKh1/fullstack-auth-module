import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseModule } from "../../database/database.module";
import { AuthController } from "./auth.controller";
import { RefreshHandler } from "./handlers/refresh.handler";
import { SignInHandler } from "./handlers/sign-in.handler";
import { SignUpHandler } from "./handlers/sign-up.handler";

/** The auth routes: Sign up, Sign in and refresh. Named apart from the infrastructure tier's `AuthModule`. */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AuthController],
  providers: [SignUpHandler, SignInHandler, RefreshHandler],
})
export class AuthFeatureModule {}
