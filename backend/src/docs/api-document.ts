import { contract } from "@app/contract";
import { signInSchema } from "@app/contract/field-rules";
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import helmet from "helmet";
import { z } from "zod";
import { ERROR_CODES, errorEnvelopeSchema } from "@/common/errors/error-codes.js";

type SchemaObject = NonNullable<NonNullable<OpenAPIObject["components"]>["schemas"]>[string];
type PathItem = OpenAPIObject["paths"][string];

const requestSchema = (schema: z.ZodType): SchemaObject => {
  const { $schema: _draft, ...rest } = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
  return rest as SchemaObject;
};

const USER = {
  type: "object",
  additionalProperties: false,
  required: ["id", "email", "name", "createdAt"],
  properties: {
    id: { type: "string" },
    email: { type: "string" },
    name: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
  },
};

// Request schemas come from the Zod schemas. Response objects are closed, so `api-docs.spec.ts` fails when a route
// sends a field the document does not describe.
const SCHEMAS = {
  SignInRequest: requestSchema(signInSchema),
  User: USER,
  SignedIn: {
    type: "object",
    additionalProperties: false,
    required: ["accessToken", "expiresIn", "user"],
    properties: {
      accessToken: { type: "string" },
      expiresIn: { type: "integer", description: "Seconds until the access token expires." },
      user: { $ref: "#/components/schemas/User" },
    },
  },
  ErrorEnvelope: {
    type: "object",
    additionalProperties: false,
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
          additionalProperties: false,
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

/** The routes declared in the contract, at their paths under the `api` prefix. */
async function contractPaths(): Promise<OpenAPIObject["paths"]> {
  const generator = new OpenAPIGenerator({ schemaConverters: [new ZodToJsonSchemaConverter()] });
  const document = await generator.generate(contract, {
    customErrorResponseBodySchema: (definedErrors) =>
      errorEnvelopeSchema(definedErrors.map(([code]) => code)),
  });
  return Object.fromEntries(
    Object.entries(document.paths ?? {}).map(([path, item]) => [`/api${path}`, item as PathItem]),
  );
}

// Until every route is declared in the contract, the document is the Nest one with the contract's routes laid over
// it; oRPC writes OpenAPI 3.1 schemas (`const`), so the merged document says 3.1.
export async function buildOpenApiDocument(app: INestApplication): Promise<OpenAPIObject> {
  const options = new DocumentBuilder()
    .setTitle("Auth API")
    .setDescription("Sign up, Sign in, refresh, Sign out and the signed-in User.")
    .setVersion("1.0.0")
    .addBearerAuth(undefined, "bearer")
    .addCookieAuth("refresh_credential")
    .build();
  const document = SwaggerModule.createDocument(app, options);
  document.openapi = "3.1.1";
  document.paths = { ...document.paths, ...(await contractPaths()) };
  document.components = { ...document.components, schemas: { ...document.components?.schemas, ...SCHEMAS } };
  return document;
}

/** Swagger UI needs inline scripts and styles, so only its path relaxes the Content-Security-Policy. */
export async function setupApiDocs(app: INestApplication): Promise<void> {
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
  SwaggerModule.setup("api/docs", app, await buildOpenApiDocument(app), { jsonDocumentUrl: "api/docs-json" });
}
