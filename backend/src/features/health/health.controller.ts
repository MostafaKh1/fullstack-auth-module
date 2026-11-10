import { Controller, Get } from "@nestjs/common";
import { CheckHealthHandler, type Health } from "./handlers/check-health.handler";

@Controller("health")
export class HealthController {
  constructor(private readonly checkHealthHandler: CheckHealthHandler) {}

  @Get()
  check(): Promise<Health> {
    return this.checkHealthHandler.execute();
  }
}
