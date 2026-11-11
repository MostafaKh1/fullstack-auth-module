import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/auth.decorator";
import { type Health, HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check(): Promise<Health> {
    return this.healthService.check();
  }
}
