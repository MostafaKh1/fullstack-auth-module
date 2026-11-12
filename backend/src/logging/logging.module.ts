import { type DynamicModule, Global, Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import type { DestinationStream } from "pino";
import { AppConfigService } from "@/config/app-config.service.js";
import { assignRequestId } from "./request-id.js";

/**
 * Every path whose value is a secret. New secret-bearing fields are added here, never hand-masked.
 * `*.x` covers `x` one level deep in any logged object; request and response headers are listed explicitly.
 */
const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "*.password",
  "*.passwordHash",
  "*.accessToken",
  "*.refreshCredential",
  "*.secret",
  "*.secretHash",
  "*.previousSecretHash",
  "*.jwtAccessSecret",
];

export type LoggingOptions = {
  logDestination?: DestinationStream;
};

@Global()
@Module({})
export class LoggingModule {
  static forRoot(options: LoggingOptions = {}): DynamicModule {
    return {
      module: LoggingModule,
      imports: [
        LoggerModule.forRootAsync({
          inject: [AppConfigService],
          useFactory: (config: AppConfigService) => {
            const pinoOptions = {
              level: config.get("logLevel"),
              genReqId: assignRequestId,
              redact: { paths: REDACTED_PATHS, censor: "[Redacted]" },
            };
            return {
              pinoHttp: options.logDestination ? [pinoOptions, options.logDestination] : pinoOptions,
            };
          },
        }),
      ],
    };
  }
}
