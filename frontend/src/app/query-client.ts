import { QueryClient } from "@tanstack/react-query";

type Options = {
  /** Tests pass `false` so a failing request settles at once instead of after retries. */
  retry?: boolean | number;
};

export function createQueryClient({ retry = 1 }: Options = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: { retry, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
