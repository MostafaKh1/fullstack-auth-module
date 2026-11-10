import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { CheckHealthHandler } from "./handlers/check-health.handler";
import { HealthController } from "./health.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [CheckHealthHandler],
})
export class HealthModule {}
