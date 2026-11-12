import { contract } from "@app/contract";
import { createORPCClient, ORPCError } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { currentAccessToken } from "@/utils/api/api-client";

type Envelope = { code: string; status: number; message?: string; issues?: unknown };

const isEnvelope = (body: unknown): body is Envelope =>
  typeof body === "object" &&
  body !== null &&
  typeof (body as Envelope).code === "string" &&
  typeof (body as Envelope).status === "number";

const link = new OpenAPILink(contract, {
  // The link needs an absolute URL; in development Vite proxies `/api` to the back end, so the browser sees one origin.
  url: () => new URL("/api", window.location.origin).href,
  headers: (): Record<string, string> => {
    const token = currentAccessToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  },
  fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
  // The envelope of ADR 0002 becomes the typed error the contract declares for its code. A body that is not an
  // envelope (a proxy's error page) is left to oRPC, so it never passes for one.
  customErrorResponseBodyDecoder: (body) =>
    isEnvelope(body)
      ? new ORPCError(body.code, {
          defined: true,
          status: body.status,
          message: body.message,
          data: body.issues === undefined ? undefined : { issues: body.issues },
        })
      : null,
});

/** The one client of the API, typed by the contract. */
export const orpcClient: JsonifiedClient<ContractRouterClient<typeof contract>> = createORPCClient(link);

/** TanStack Query options for every procedure: `orpc.auth.signUp.mutationOptions()`. */
export const orpc = createTanstackQueryUtils(orpcClient);
