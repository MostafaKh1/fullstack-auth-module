import { z } from "zod";

const positiveInt = z.coerce.number().int().positive();

const origin = z.url().refine((value) => new URL(value).origin === value, {
  message: "must be an origin: scheme, host and optional port, with no path or trailing slash",
});

/** `backend/.env.example` documents each variable. */
const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    PORT: z.coerce.number().int().min(0).max(65_535).default(3000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\/\S+$/, "must be a mongodb:// or mongodb+srv:// URI"),
    JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
    CORS_ORIGINS: z
      .string()
      .transform((value) => value.split(",").map((entry) => entry.trim()))
      .pipe(z.array(origin).min(1)),
    ACCESS_TOKEN_TTL_SECONDS: positiveInt.default(900),
    SESSION_IDLE_TTL_DAYS: positiveInt.default(7),
    SESSION_ABSOLUTE_TTL_DAYS: positiveInt.default(30),
    REFRESH_GRACE_SECONDS: z.coerce.number().int().min(0).default(10),
    PASSWORD_HASH_COST: z.coerce.number().int().min(10).max(20).default(17),
    THROTTLE_LIMIT: positiveInt.default(20),
    THROTTLE_TTL_SECONDS: positiveInt.default(60),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    REQUEST_BODY_LIMIT: z
      .string()
      .regex(/^[0-9]+(kb|mb)$/, "must be a size such as 16kb")
      .default("16kb"),
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine((env, context) => {
    if (env.SESSION_ABSOLUTE_TTL_DAYS < env.SESSION_IDLE_TTL_DAYS) {
      context.addIssue({
        code: "custom",
        path: ["SESSION_ABSOLUTE_TTL_DAYS"],
        message: "must not be shorter than SESSION_IDLE_TTL_DAYS",
      });
    }
    if (env.NODE_ENV === "production" && !env.COOKIE_SECURE) {
      context.addIssue({ code: "custom", path: ["COOKIE_SECURE"], message: "must be true in production" });
    }
    if (env.NODE_ENV === "production" && env.PASSWORD_HASH_COST < 17) {
      context.addIssue({
        code: "custom",
        path: ["PASSWORD_HASH_COST"],
        message: "must be at least 17 in production",
      });
    }
  });

export type AppConfig = {
  env: "development" | "test" | "production";
  port: number;
  logLevel: string;
  mongodbUri: string;
  jwtAccessSecret: string;
  corsOrigins: string[];
  accessTokenTtlSeconds: number;
  sessionIdleTtlDays: number;
  sessionAbsoluteTtlDays: number;
  refreshGraceSeconds: number;
  passwordHashCost: number;
  cookieSecure: boolean;
  throttleLimit: number;
  throttleTtlSeconds: number;
  trustProxy: number;
  requestBodyLimit: string;
};

/** The value is never included: it may be a secret. */
export type ConfigProblem = { variable: string; problem: string };

export class InvalidConfigError extends Error {
  constructor(readonly problems: ConfigProblem[]) {
    super(`Invalid configuration: ${problems.map((p) => `${p.variable} ${p.problem}`).join("; ")}`);
    this.name = "InvalidConfigError";
  }
}

export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  const result = environmentSchema.safeParse(env);
  if (!result.success) {
    throw new InvalidConfigError(
      result.error.issues.map((issue) => ({
        variable: String(issue.path[0] ?? "(environment)"),
        problem: issue.message,
      })),
    );
  }
  const e = result.data;
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    mongodbUri: e.MONGODB_URI,
    jwtAccessSecret: e.JWT_ACCESS_SECRET,
    corsOrigins: e.CORS_ORIGINS,
    accessTokenTtlSeconds: e.ACCESS_TOKEN_TTL_SECONDS,
    sessionIdleTtlDays: e.SESSION_IDLE_TTL_DAYS,
    sessionAbsoluteTtlDays: e.SESSION_ABSOLUTE_TTL_DAYS,
    refreshGraceSeconds: e.REFRESH_GRACE_SECONDS,
    passwordHashCost: e.PASSWORD_HASH_COST,
    cookieSecure: e.COOKIE_SECURE,
    throttleLimit: e.THROTTLE_LIMIT,
    throttleTtlSeconds: e.THROTTLE_TTL_SECONDS,
    trustProxy: e.TRUST_PROXY,
    requestBodyLimit: e.REQUEST_BODY_LIMIT,
  };
}

/** Reads the process environment; the only place outside tests that touches `process.env`. */
export function loadConfig(): AppConfig {
  return parseConfig(process.env);
}
