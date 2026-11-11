import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";

const PING_TIMEOUT_MS = 1_500;

/** Not a repository: it reads no collection. */
@Injectable()
export class DatabaseHealth {
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
