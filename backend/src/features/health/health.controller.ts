import { Controller, Get } from "@nestjs/common";
import { Public } from "../../auth/public.decorator";
import { CheckHealthHandler, type Health } from "./handlers/check-health.handler";

@Controller("health")
export class HealthController {
  constructor(private readonly checkHealthHandler: CheckHealthHandler) {}

  @Public()
  @Get()
  check(): Promise<Health> {
    return this.checkHealthHandler.execute();
  }
}
