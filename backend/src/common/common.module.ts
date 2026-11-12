import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ORPCError, ORPCModule } from "@orpc/nest";
import { experimental_RethrowHandlerPlugin as RethrowHandlerPlugin } from "@orpc/server/plugins";
import { AccessTokenGuard } from "@/common/guards/access-token.guard.js";
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
    // oRPC answers every error a procedure throws itself, as a 500 unless it is an ORPCError; rethrowing the rest
    // hands an ApiError to the global filter, which writes the envelope of ADR 0002.
    ORPCModule.forRoot({
      plugins: [new RethrowHandlerPlugin({ filter: (error) => !(error instanceof ORPCError) })],
    }),
  ],
  providers: [AccessTokenService, { provide: APP_GUARD, useClass: AccessTokenGuard }],
  exports: [AccessTokenService],
})
export class CommonModule {}
