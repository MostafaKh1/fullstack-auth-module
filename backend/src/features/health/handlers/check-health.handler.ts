import { Injectable } from "@nestjs/common";
import { DatabaseHealthRepository } from "../../../database/database-health.repository";
import { ApiError } from "../../../errors/api-error";

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
