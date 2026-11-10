import { randomBytes, type ScryptOptions, scrypt, timingSafeEqual } from "node:crypto";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { AppConfigService } from "../config/app-config.service";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;

/**
 * Hashes passwords with scrypt from `node:crypto` (ADR 0007).
 * A hash reads `scrypt$<log2 N>$<r>$<p>$<salt>$<key>` (base64), so a change of cost never invalidates stored hashes.
 */
@Injectable()
export class PasswordHashService implements OnModuleInit {
  private decoyHash = "";

  constructor(private readonly config: AppConfigService) {}

  /** A real hash at the configured cost, so a Sign in with an unknown email costs what a wrong password costs. */
  async onModuleInit(): Promise<void> {
    this.decoyHash = await this.hash(randomBytes(32).toString("base64"));
  }

  async hash(password: string): Promise<string> {
    const cost = this.config.get("passwordHashCost");
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(password, salt, cost, BLOCK_SIZE, PARALLELISM);
    return ["scrypt", cost, BLOCK_SIZE, PARALLELISM, salt.toString("base64"), key.toString("base64")].join(
      "$",
    );
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [cost, blockSize, parallelism] = parts.slice(1, 4).map(Number);
    const expected = Buffer.from(parts[5], "base64");
    const actual = await derive(password, Buffer.from(parts[4], "base64"), cost, blockSize, parallelism);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  /** Spends the time of a real verification and always fails. */
  async verifyAgainstDecoy(password: string): Promise<false> {
    await this.verify(password, this.decoyHash);
    return false;
  }
}

function derive(password: string, salt: Buffer, cost: number, r: number, p: number): Promise<Buffer> {
  const N = 2 ** cost;
  // scrypt needs 128 * N * r bytes; Node's default cap (32 MiB) is below that at cost 17.
  const options: ScryptOptions = { N, r, p, maxmem: 256 * N * r };
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}
