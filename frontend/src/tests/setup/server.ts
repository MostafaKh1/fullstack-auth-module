import { setupServer } from "msw/node";

export const server = setupServer();

const undeclaredRequests: string[] = [];

/** Started once per test file by `setup.ts`. A request no handler matches is recorded and errors instead of reaching the network. */
export function listenForDeclaredRequestsOnly() {
  server.listen({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url);
      undeclaredRequests.push(`${request.method} ${url.pathname}${url.search}`);
      print.error();
    },
  });
}

/** MSW's own "error" strategy only rejects the request, which a component can swallow; this fails the test. */
export function failOnUndeclaredRequests() {
  const requests = undeclaredRequests.splice(0);
  if (requests.length > 0) {
    throw new Error(requests.map((request) => `Undeclared request: ${request}`).join("\n"));
  }
}
