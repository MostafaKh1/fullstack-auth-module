import { contract } from "@app/contract";
import { Controller } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import { Public } from "@/common/decorators/auth.decorator.js";
import { HealthService } from "./health.service.js";

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Implement(contract.health.check)
  check() {
    return implement(contract.health.check).handler(() => this.healthService.check());
  }
}
