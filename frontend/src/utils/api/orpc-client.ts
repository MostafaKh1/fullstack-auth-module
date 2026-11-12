import { contract } from "@app/contract";
import { createORPCClient, ORPCError } from "@orpc/client";
import { type ContractRouterClient, isContractProcedure, validateORPCError } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { currentAccessToken } from "@/utils/api/api-client";
import { isErrorEnvelope } from "@/utils/api/api-error";

const procedureAt = (path: readonly string[]) => {
  const found = path.reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], contract);
  if (!isContractProcedure(found)) throw new Error(`No procedure at ${path.join(".")} in the contract.`);
  return found;
};

const link = new OpenAPILink(contract, {
  // The link needs an absolute URL; in development Vite proxies `/api` to the back end, so the browser sees one origin.
  url: () => new URL("/api", window.location.origin).href,
  headers: (): Record<string, string> => {
    const token = currentAccessToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  },
  fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
  // The envelope of ADR 0002 becomes an error with its code, kept whole as the cause. A body that is not an envelope (a
  // proxy's error page) is left to oRPC, so it never passes for one.
  customErrorResponseBodyDecoder: (body) =>
    isErrorEnvelope(body)
      ? new ORPCError(body.code, {
          status: body.status,
          message: body.message,
          data: body.issues === undefined ? undefined : { issues: body.issues },
          cause: body,
        })
      : null,
  // oRPC's own check marks the error `defined`, the contract's typed error, only when the procedure called declares
  // its code, status and data.
  interceptors: [
    async ({ next, path }) => {
      try {
        return await next();
      } catch (error) {
        if (!(error instanceof ORPCError)) throw error;
        throw await validateORPCError(procedureAt(path)["~orpc"].errorMap, error);
      }
    },
  ],
});

const orpcClient: JsonifiedClient<ContractRouterClient<typeof contract>> = createORPCClient(link);

/** TanStack Query options for every procedure of the contract: `orpc.auth.signUp.mutationOptions()`. */
export const orpc = createTanstackQueryUtils(orpcClient);
