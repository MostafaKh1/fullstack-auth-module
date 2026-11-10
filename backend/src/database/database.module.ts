import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AppConfigService } from "../config/app-config.service";
import { DatabaseHealthRepository } from "./database-health.repository";
import { SESSION_MODEL, sessionSchema } from "./session.model";
import { SessionRepository } from "./session.repository";
import { USER_MODEL, userSchema } from "./user.model";
import { UserRepository } from "./user.repository";

/** The database tier: the connection, the models, and the repositories that are the only door to them. */
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
  providers: [DatabaseHealthRepository, UserRepository, SessionRepository],
  exports: [DatabaseHealthRepository, UserRepository, SessionRepository],
})
export class DatabaseModule {}
