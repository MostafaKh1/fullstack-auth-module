import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { HandRolledButton } from "@/components/base/buttons/HandRolledButton";
import { Alert } from "@/components/composite/banners-and-notifications/Alert";
import { useSession } from "@/hooks/useSession";
import { apiErrorEnvelope } from "@/utils/api/api-error";
import { getCurrentUser } from "@/utils/api/users-api";
import { errorCopy, unreachableCopy } from "@/utils/error-copy";

export function ApplicationPage() {
  const currentUser = useQuery({ queryKey: ["users", "me"], queryFn: getCurrentUser });
  const { endSession } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await endSession();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <title>The application</title>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-2 px-4 font-semibold tracking-tight sm:px-6">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white dark:bg-indigo-500"
          >
            ◆
          </span>
          The application
          <HandRolledButton
            variant="ghost"
            size="sm"
            className="ml-auto"
            pending={signingOut}
            onClick={signOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </HandRolledButton>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-12 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 size-72 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-500/20"
          />
          <p className="relative text-sm font-medium text-indigo-600 dark:text-indigo-400">You are in</p>
          <h1 className="relative mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Welcome to the application.
          </h1>
          <div className="relative mt-6 min-h-7">
            {currentUser.isPending && (
              <p role="status" className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <span
                  aria-hidden="true"
                  className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700"
                />
                <span className="sr-only">Loading your details…</span>
              </p>
            )}
            {currentUser.isSuccess && (
              <p className="text-lg text-slate-600 dark:text-slate-300">{`Signed in as ${currentUser.data.name}`}</p>
            )}
            {currentUser.isError && <Alert>{describeFailure(currentUser.error)}</Alert>}
          </div>
        </div>
      </main>
    </div>
  );
}

function describeFailure(error: unknown) {
  const envelope = apiErrorEnvelope(error);
  return envelope ? errorCopy(envelope.code) : unreachableCopy;
}
