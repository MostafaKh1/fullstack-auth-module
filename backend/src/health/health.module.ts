import { Module } from "@nestjs/common";
import { PersistenceModule } from "../database/persistence.module";
import { CheckHealthHandler } from "./handlers/check-health.handler";
import { HealthController } from "./health.controller";

@Module({
  imports: [PersistenceModule],
  controllers: [HealthController],
  providers: [CheckHealthHandler],
})
export class HealthModule {}
