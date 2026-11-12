import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AppConfigService } from "@/config/app-config.service.js";
import { SESSION_MODEL, sessionSchema } from "@/database/collections/session.collection.js";
import { USER_MODEL, userSchema } from "@/database/collections/user.collection.js";
import { SessionRepository } from "@/database/repositories/session.repository.js";
import { UserRepository } from "@/database/repositories/user.repository.js";
import { DatabaseHealth } from "./database-health.js";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.get("mongodbUri"),
        // Fail fast instead of the driver's 30 s default, so boot and queries answer promptly when the database is down.
        serverSelectionTimeoutMS: 2_000,
      }),
    }),
    MongooseModule.forFeature([
      { name: USER_MODEL, schema: userSchema },
      { name: SESSION_MODEL, schema: sessionSchema },
    ]),
  ],
  providers: [DatabaseHealth, UserRepository, SessionRepository],
  exports: [DatabaseHealth, UserRepository, SessionRepository],
})
export class PersistenceModule {}
