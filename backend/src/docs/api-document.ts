import { contract } from "@app/contract";
import { errorEnvelopeSchema } from "@app/contract/error-envelope";
import type { INestApplication } from "@nestjs/common";
import { SwaggerModule } from "@nestjs/swagger";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import helmet from "helmet";
import { z } from "zod";

type OpenApiDocument = Awaited<ReturnType<OpenAPIGenerator["generate"]>>;
type PathItem = NonNullable<OpenApiDocument["paths"]>[string];

/** A component is a schema of its own, so the `$schema` keyword Zod adds is dropped. */
function errorEnvelopeJsonSchema(): Record<string, unknown> {
  const { $schema: _dialect, ...schema } = z.toJSONSchema(errorEnvelopeSchema);
  return schema;
}

const ERROR_ENVELOPE_REF = { $ref: "#/components/schemas/ErrorEnvelope" };

/** The whole API document, built from the contract alone: no server, no database. */
export async function buildOpenApiDocument(): Promise<OpenApiDocument> {
  const generator = new OpenAPIGenerator({ schemaConverters: [new ZodToJsonSchemaConverter()] });
  const document = await generator.generate(contract, {
    info: {
      title: "Auth API",
      description: "Sign up, Sign in, refresh, Sign out and the signed-in User.",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        cookie: { type: "apiKey", in: "cookie", name: "refresh_credential" },
      },
      schemas: { ErrorEnvelope: errorEnvelopeJsonSchema() as never },
    },
    // A response lists the codes it can carry; the rest of the envelope is the shared component.
    customErrorResponseBodySchema: (definedErrors) => ({
      allOf: [
        ERROR_ENVELOPE_REF,
        {
          type: "object",
          properties: { code: { type: "string", enum: definedErrors.map(([code]) => code) } },
        },
      ],
    }),
  });
  // Paths are written relative to the `api` prefix the back end sets.
  document.paths = Object.fromEntries(
    Object.entries(document.paths ?? {}).map(([path, item]) => [`/api${path}`, item as PathItem]),
  );
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
  SwaggerModule.setup("api/docs", app, (await buildOpenApiDocument()) as never, {
    jsonDocumentUrl: "api/docs-json",
  });
}
