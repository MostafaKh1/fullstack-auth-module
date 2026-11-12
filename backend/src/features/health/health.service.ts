import type { Health } from "@app/contract/health.contract";
import { Injectable } from "@nestjs/common";
import { ApiError } from "@/common/errors/api-error.js";
import { DatabaseHealth } from "@/database/database-health.js";

@Injectable()
export class HealthService {
  constructor(private readonly databaseHealth: DatabaseHealth) {}

  async check(): Promise<Health> {
    if (!(await this.databaseHealth.isReachable())) {
      throw new ApiError("server.unavailable", { message: "The database is unreachable." });
    }
    return { status: "ok", database: "up" };
  }
}
