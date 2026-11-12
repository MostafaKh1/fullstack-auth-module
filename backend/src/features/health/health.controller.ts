import { Controller, Get } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiErrors } from "@/common/decorators/api-errors.decorator";
import { Public } from "@/common/decorators/auth.decorator";
import { type Health, HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @ApiResponse({
    status: 200,
    description: "The database answers.",
    schema: { $ref: "#/components/schemas/Health" },
  })
  @ApiErrors("server.unavailable")
  @Get()
  check(): Promise<Health> {
    return this.healthService.check();
  }
}
