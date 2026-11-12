import { MongoMemoryServer } from "mongodb-memory-server";

export function startThrowawayMongo(): Promise<MongoMemoryServer> {
  // A cold mongod on Windows can take longer than the 10 s default to start.
  return MongoMemoryServer.create({ instance: { launchTimeout: 30_000 } });
}
