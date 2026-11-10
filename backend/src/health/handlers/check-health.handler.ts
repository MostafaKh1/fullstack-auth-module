import { Injectable } from "@nestjs/common";
import { ApiError } from "../../common/errors/api-error";
import { DatabaseHealthRepository } from "../../database/repositories/database-health.repository";

export type Health = { status: "ok"; database: "up" };

/** Check health: the API is ready only while its database answers. */
@Injectable()
export class CheckHealthHandler {
  constructor(private readonly databaseHealth: DatabaseHealthRepository) {}

  async execute(): Promise<Health> {
    if (!(await this.databaseHealth.isReachable())) {
      throw new ApiError("server.unavailable", { message: "The database is unreachable." });
    }
    return { status: "ok", database: "up" };
  }
}
