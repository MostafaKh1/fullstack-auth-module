import { contract } from "@app/contract";
import { createORPCClient, ORPCError } from "@orpc/client";
import { type ContractRouterClient, isContractProcedure, validateORPCError } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { currentAccessToken } from "@/utils/api/access-token";
import { isErrorEnvelope } from "@/utils/api/api-error";
import { refreshSessionOnce, shouldRefreshAndRetry } from "@/utils/api/session-refresh";

type ContractClient = JsonifiedClient<ContractRouterClient<typeof contract>>;

/** What Sign up, Sign in and refresh answer: the access token and the User. */
export type SignedIn = Awaited<ReturnType<ContractClient["auth"]["refresh"]>>;

/** A User as the client sees it: its date is an ISO string. */
export type User = SignedIn["user"];

const procedureAt = (path: readonly string[]) => {
  const found = path.reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], contract);
  if (!isContractProcedure(found)) throw new Error(`No procedure at ${path.join(".")} in the contract.`);
  return found;
};

const link = new OpenAPILink(contract, {
  // The link needs an absolute URL; in development Vite proxies `/api` to the back end, so the browser sees one origin.
  url: () => new URL("/api", window.location.origin).href,
  // Read for every request, a retried one included, so it carries the token the refresh just issued.
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
  interceptors: [
    // A refused access token: refresh once, shared by every request refused meanwhile, then send the request again,
    // once. No caller handles an expired token itself.
    async ({ next, path }) => {
      try {
        return await next();
      } catch (error) {
        if (!(error instanceof ORPCError) || !shouldRefreshAndRetry(error.code, path[0] === "auth"))
          throw error;
        if (!(await refreshSessionOnce())) throw error;
        return next();
      }
    },
    // oRPC's own check marks the error `defined`, the contract's typed error, only when the procedure called declares
    // its code, status and data.
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

const orpcClient: ContractClient = createORPCClient(link);

/** TanStack Query options for every procedure of the contract: `orpc.auth.signUp.mutationOptions()`. */
export const orpc = createTanstackQueryUtils(orpcClient);
