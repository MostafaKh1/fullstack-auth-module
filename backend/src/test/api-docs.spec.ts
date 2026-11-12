import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { startTestApp, type TestApp } from "./boot.js";

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
    const contract = JSON.parse(
      readFileSync(fileURLToPath(new URL("../../../contract/openapi.json", import.meta.url)), "utf8"),
    );

    expect(contract).toEqual(document);
  });
});

describe("the documented response schemas", () => {
  let app: TestApp;
  let document: Document;
  const ada = { email: "ada@example.com", name: "Ada Lovelace", password: "Passw0rd!" };
  const exchanges: { route: string; status: number; body: unknown }[] = [];

  beforeAll(async () => {
    app = await startTestApp({ PASSWORD_HASH_COST: "10" });
    document = (await app.http().get("/api/docs-json")).body;
    const record = <R extends { status: number; body: unknown }>(route: string, response: R): R => {
      exchanges.push({ route, status: response.status, body: response.body });
      return response;
    };

    const signedUp = record("POST /api/auth/sign-up", await app.http().post("/api/auth/sign-up").send(ada));
    const cookie = signedUp.headers["set-cookie"] as unknown as string[];
    record("POST /api/auth/sign-in", await app.http().post("/api/auth/sign-in").send(ada));
    record("POST /api/auth/refresh", await app.http().post("/api/auth/refresh").set("Cookie", cookie));
    const token = (signedUp.body as { accessToken: string }).accessToken;
    record(
      "GET /api/users/me",
      await app.http().get("/api/users/me").set("Authorization", `Bearer ${token}`),
    );
    record("GET /api/health", await app.http().get("/api/health"));
    record("POST /api/auth/sign-up", await app.http().post("/api/auth/sign-up").send({}));
    record("POST /api/auth/sign-up", await app.http().post("/api/auth/sign-up").send(ada));
    record(
      "POST /api/auth/sign-in",
      await app
        .http()
        .post("/api/auth/sign-in")
        .send({ ...ada, password: "x" }),
    );
    record(
      "POST /api/auth/sign-in",
      await app.http().post("/api/auth/sign-in").set("Content-Type", "application/json").send('{"email": '),
    );
    record("POST /api/auth/refresh", await app.http().post("/api/auth/refresh"));
    record(
      "POST /api/auth/sign-out",
      await app.http().post("/api/auth/sign-out").set("Origin", "https://evil.example"),
    );
    record("GET /api/users/me", await app.http().get("/api/users/me"));
  });

  afterAll(async () => {
    await app.close();
  });

  // JSON Schema's `allOf`: each part must accept the body on its own (Zod's intersection of them is laxer).
  function problems(route: string, status: number, body: unknown): string[] {
    const [method, path] = route.split(" ");
    const response = document.paths[path][method.toLowerCase()].responses[String(status)] as
      { content?: Record<string, { schema: unknown }> } | undefined;
    if (!response?.content) return [`no ${status} body is documented`];
    const schema = inlineRefs(response.content["application/json"].schema, document) as { allOf?: unknown[] };
    return (schema.allOf ?? [schema]).flatMap((part) => {
      const result = z.fromJSONSchema(part as never, { defaultTarget: "openapi-3.0" }).safeParse(body);
      return result.error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) ?? [];
    });
  }

  it("records a success of every route with a body and each refusal a caller can cause", () => {
    expect(exchanges.map(({ route, status }) => `${route} ${status}`)).toEqual([
      "POST /api/auth/sign-up 201",
      "POST /api/auth/sign-in 200",
      "POST /api/auth/refresh 200",
      "GET /api/users/me 200",
      "GET /api/health 200",
      "POST /api/auth/sign-up 400",
      "POST /api/auth/sign-up 409",
      "POST /api/auth/sign-in 401",
      "POST /api/auth/sign-in 400",
      "POST /api/auth/refresh 401",
      "POST /api/auth/sign-out 403",
      "GET /api/users/me 401",
    ]);
  });

  it("describes every body the routes really send", () => {
    for (const { route, status, body } of exchanges) {
      expect({ route, status, problems: problems(route, status, body) }).toEqual({
        route,
        status,
        problems: [],
      });
    }
  });

  it("describes no field the routes do not send", () => {
    for (const { route, status, body } of exchanges) {
      const padded = { ...(body as object), undocumented: true };
      expect({ route, status, rejected: problems(route, status, padded).length > 0 }).toEqual({
        route,
        status,
        rejected: true,
      });
    }
  });

  it("lists, for each error status, only the codes the route answers with", () => {
    for (const { route, status, body } of exchanges.filter((exchange) => exchange.status >= 400)) {
      const otherCode = { ...(body as object), code: "server.internal" };
      expect({ route, status, rejected: problems(route, status, otherCode).length > 0 }).toEqual({
        route,
        status,
        rejected: true,
      });
    }
  });
});

function inlineRefs(schema: unknown, document: Document): unknown {
  if (Array.isArray(schema)) return schema.map((entry) => inlineRefs(entry, document));
  if (typeof schema !== "object" || schema === null) return schema;
  const { $ref } = schema as { $ref?: string };
  if ($ref)
    return inlineRefs(document.components.schemas[$ref.replace("#/components/schemas/", "")], document);
  return Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, inlineRefs(value, document)]));
}
