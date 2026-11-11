import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { PersistenceModule } from "../../database/persistence.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./services/auth.service";
import { SessionService } from "./services/session.service";

/** Authentication: the routes (Sign up, Sign in, refresh, Sign out), `AuthService` behind them, and the Session lifecycle. */
@Module({
  imports: [PersistenceModule, CommonModule],
  controllers: [AuthController],
  providers: [AuthService, SessionService],
})
export class AuthModule {}
