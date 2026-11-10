import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AppConfigService } from "../config/app-config.service";
import { DatabaseHealthRepository } from "./database-health.repository";

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
  ],
  providers: [DatabaseHealthRepository],
  exports: [DatabaseHealthRepository],
})
export class DatabaseModule {}
