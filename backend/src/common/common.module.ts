import { Module } from "@nestjs/common";
import { APP_GUARD, REQUEST } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ORPCModule } from "@orpc/nest";
import type { Request } from "express";
import { AccessTokenGuard } from "@/common/guards/access-token.guard.js";
import { orpcOptions } from "@/common/orpc/orpc-options.js";
import { AccessTokenService } from "@/common/services/access-token.service.js";
import { AppConfigService } from "@/config/app-config.service.js";
import { PersistenceModule } from "@/database/persistence.module.js";

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
    ORPCModule.forRootAsync({
      inject: [REQUEST, AppConfigService],
      useFactory: (request: Request, config: AppConfigService) => orpcOptions(request, config.isProduction),
    }),
  ],
  providers: [AccessTokenService, { provide: APP_GUARD, useClass: AccessTokenGuard }],
  exports: [AccessTokenService],
})
export class CommonModule {}
