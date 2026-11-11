import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import helmet from "helmet";
import { z } from "zod";
import { ERROR_CODES } from "../common/errors/error-codes";
import { signInSchema, signUpSchema } from "../features/auth/auth.types";

const requestSchema = (schema: z.ZodType): SchemaObject => {
  const { $schema: _draft, ...rest } = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
  return rest as SchemaObject;
};

const USER = {
  type: "object",
  required: ["id", "email", "name", "createdAt"],
  properties: {
    id: { type: "string" },
    email: { type: "string" },
    name: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
  },
};

/** The component schemas the routes reference by name; request schemas come from the Zod schemas. */
const SCHEMAS = {
  SignUpRequest: requestSchema(signUpSchema),
  SignInRequest: requestSchema(signInSchema),
  User: USER,
  SignedIn: {
    type: "object",
    required: ["accessToken", "expiresIn", "user"],
    properties: {
      accessToken: { type: "string" },
      expiresIn: { type: "integer", description: "Seconds until the access token expires." },
      user: { $ref: "#/components/schemas/User" },
    },
  },
  Health: {
    type: "object",
    required: ["status", "database"],
    properties: { status: { type: "string", enum: ["ok"] }, database: { type: "string", enum: ["up"] } },
  },
  ErrorEnvelope: {
    type: "object",
    required: ["code", "status", "traceId", "retryable"],
    properties: {
      code: { type: "string", enum: Object.keys(ERROR_CODES) },
      status: { type: "integer" },
      traceId: { type: "string", description: "The request id, also the X-Request-Id header." },
      retryable: { type: "boolean" },
      issues: {
        type: "array",
        items: {
          type: "object",
          required: ["path", "code"],
          properties: {
            path: { type: "array", items: { oneOf: [{ type: "string" }, { type: "integer" }] } },
            code: { type: "string", description: "A rule id such as password.missing_number." },
          },
        },
      },
      message: { type: "string", description: "A developer hint, omitted in production." },
    },
  },
};

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const options = new DocumentBuilder()
    .setTitle("Auth API")
    .setDescription("Sign up, Sign in, refresh, Sign out and the signed-in User.")
    .setVersion("1.0.0")
    .addBearerAuth(undefined, "bearer")
    .build();
  const document = SwaggerModule.createDocument(app, options);
  document.components = { ...document.components, schemas: { ...document.components?.schemas, ...SCHEMAS } };
  return document;
}

/** Swagger UI needs inline scripts and styles, so only its path relaxes the Content-Security-Policy. */
export function setupApiDocs(app: INestApplication): void {
  app.use(
    "/api/docs",
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
        },
      },
    }),
  );
  SwaggerModule.setup("api/docs", app, buildOpenApiDocument(app), { jsonDocumentUrl: "api/docs-json" });
}
