import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenGuard } from "@/common/guards/access-token.guard";
import { AccessTokenService } from "@/common/services/access-token.service";
import { AppConfigService } from "@/config/app-config.service";
import { PersistenceModule } from "@/database/persistence.module";

@Module({
  imports: [
    PersistenceModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.get("jwtAccessSecret"),
        signOptions: { algorithm: "HS256" },
      }),
    }),
  ],
  providers: [AccessTokenService, { provide: APP_GUARD, useClass: AccessTokenGuard }],
  exports: [AccessTokenService],
})
export class CommonModule {}
