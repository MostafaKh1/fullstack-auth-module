import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { startTestApp, type TestApp } from "./boot";

type Operation = {
  security?: Record<string, string[]>[];
  requestBody?: { content: Record<string, { schema: Record<string, unknown> }> };
  responses: Record<string, unknown>;
};
type Document = {
  paths: Record<string, Record<string, Operation>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, { type: string; scheme?: string }>;
  };
};

describe("the API documentation", () => {
  let app: TestApp;
  let document: Document;

  beforeAll(async () => {
    app = await startTestApp();
    document = (await app.http().get("/api/docs-json")).body;
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves Swagger UI at /api/docs", async () => {
    const response = await app.http().get("/api/docs");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
  });

  it("documents every route", () => {
    const routes = Object.entries(document.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    );

    expect(routes.sort()).toEqual([
      "GET /api/health",
      "GET /api/users/me",
      "POST /api/auth/refresh",
      "POST /api/auth/sign-in",
      "POST /api/auth/sign-out",
      "POST /api/auth/sign-up",
    ]);
  });

  it("documents each request body from the Zod schema, with the field rules", () => {
    const body = document.paths["/api/auth/sign-up"].post.requestBody?.content["application/json"].schema;
    const schema = document.components.schemas.SignUpRequest;

    expect(body).toEqual({ $ref: "#/components/schemas/SignUpRequest" });
    expect(schema).toMatchObject({ type: "object", required: ["email", "name", "password"] });
  });

  it("documents the success statuses and the error codes", () => {
    const signUp = document.paths["/api/auth/sign-up"].post.responses;
    expect(Object.keys(signUp)).toEqual(expect.arrayContaining(["201", "400", "409", "413", "429"]));
    const signIn = document.paths["/api/auth/sign-in"].post.responses;
    expect(Object.keys(signIn)).toEqual(expect.arrayContaining(["200", "400", "401", "413", "429"]));
    expect(Object.keys(document.paths["/api/auth/sign-out"].post.responses)).toEqual(
      expect.arrayContaining(["204", "403"]),
    );
    expect(Object.keys(document.paths["/api/health"].get.responses)).toEqual(
      expect.arrayContaining(["200", "503"]),
    );
    expect(JSON.stringify(signIn["401"])).toContain("auth.invalid_credentials");
  });

  it("marks the protected endpoint as needing a Bearer token", () => {
    expect(document.components.securitySchemes).toMatchObject({ bearer: { type: "http", scheme: "bearer" } });
    expect(document.paths["/api/users/me"].get.security).toEqual([{ bearer: [] }]);
    expect(document.paths["/api/auth/sign-in"].post.security).toBeUndefined();
  });

  it("is the document checked in as contract/openapi.json", () => {
    const contract = JSON.parse(readFileSync(resolve(__dirname, "../../../contract/openapi.json"), "utf8"));

    expect(contract).toEqual(document);
  });
});
