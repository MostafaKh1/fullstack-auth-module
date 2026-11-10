import { useQuery } from "@tanstack/react-query";
import { getHealth } from "../api/health";
import { StatusBadge } from "../components/status-badge";

/** Stands at `/` until the Sign up, Sign in and Application pages replace it. */
export function PlaceholderPage() {
  const health = useQuery({ queryKey: ["health"], queryFn: getHealth });
  const status = health.isPending ? "checking" : health.isSuccess ? "up" : "down";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Sign up / Sign in</h1>
      <StatusBadge status={status}>{statusCopy[status]}</StatusBadge>
    </main>
  );
}

const statusCopy = {
  checking: "Checking the API…",
  up: "The API is up.",
  down: "The API is unreachable.",
} as const;
