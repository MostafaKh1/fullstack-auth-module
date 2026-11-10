import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";

const PING_TIMEOUT_MS = 1_500;

/** Answers whether the database is reachable, within a bound, for the health check. */
@Injectable()
export class DatabaseHealthRepository {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async isReachable(): Promise<boolean> {
    const db = this.connection.db;
    if (!db) return false;
    let timer: NodeJS.Timeout | undefined;
    // The driver would wait for server selection before failing; a health check must answer promptly instead.
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), PING_TIMEOUT_MS);
    });
    const ping = db
      .admin()
      .ping()
      .then(() => true)
      .catch(() => false);
    try {
      return await Promise.race([ping, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
