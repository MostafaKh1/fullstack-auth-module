import { oc, type Route } from "@orpc/contract";

type Security = "bearer" | "cookie";

// A route's own `spec` (a response it describes by hand) is applied first; the security entry is added on top of it.
const secured = (route: Route, scheme: Security): Route => {
  const own = route.spec;
  return {
    ...route,
    spec: (operation) => ({
      ...(typeof own === "function" ? own(operation) : { ...operation, ...own }),
      security: [{ [scheme]: [] }],
    }),
  };
};

const unauthenticated = { "auth.unauthenticated": { status: 401 } } as const;

/** A route anyone may call: no security entry. */
export const publicRoute = (route: Route) => oc.route(route);

/** A route that needs the access token; it can answer `auth.unauthenticated`. */
export const bearerRoute = (route: Route) => oc.route(secured(route, "bearer")).errors(unauthenticated);

/** A route that needs the refresh cookie; it can answer `auth.unauthenticated`. */
export const cookieRoute = (route: Route) => oc.route(secured(route, "cookie")).errors(unauthenticated);
