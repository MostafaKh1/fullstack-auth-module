import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AppConfigService } from "../config/app-config.service";
import { SESSION_MODEL, sessionSchema } from "./collections/session.collection";
import { USER_MODEL, userSchema } from "./collections/user.collection";
import { DatabaseHealth } from "./database-health";
import { SessionRepository } from "./repositories/session.repository";
import { UserRepository } from "./repositories/user.repository";

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
