import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { DataRouter } from "react-router";
import { RouterProvider } from "react-router";
import { SessionProvider } from "@/providers/SessionProvider";

type Props = {
  router: DataRouter;
  queryClient: QueryClient;
};

/** The browser and the test harness pass their own router. */
export function App({ router, queryClient }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
