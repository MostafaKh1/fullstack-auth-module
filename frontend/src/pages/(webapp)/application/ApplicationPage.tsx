import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/base/alerts/Alert";
import { Button } from "@/components/base/buttons/Button";
import { Card } from "@/components/base/cards/Card/Card";
import { CardContent } from "@/components/base/cards/Card/CardContent";
import { CardDescription } from "@/components/base/cards/Card/CardDescription";
import { CardHeader } from "@/components/base/cards/Card/CardHeader";
import { CardTitle } from "@/components/base/cards/Card/CardTitle";
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
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-2 px-4 font-semibold tracking-tight sm:px-6">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
          >
            ◆
          </span>
          The application
          <Button variant="ghost" size="sm" className="ml-auto" pending={signingOut} onClick={signOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <Card className="relative overflow-hidden p-2 shadow-lg sm:p-6">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/20 blur-3xl"
          />
          <CardHeader className="relative">
            <CardDescription className="font-medium text-primary">You are in</CardDescription>
            <CardTitle asChild>
              <h1 className="text-3xl tracking-tight sm:text-4xl">Welcome to the application.</h1>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative min-h-7">
            {currentUser.isPending && (
              <p role="status" className="flex items-center gap-3 text-muted-foreground">
                <span aria-hidden="true" className="h-4 w-40 animate-pulse rounded bg-muted" />
                <span className="sr-only">Loading your details…</span>
              </p>
            )}
            {currentUser.isSuccess && (
              <p className="text-lg text-muted-foreground">{`Signed in as ${currentUser.data.name}`}</p>
            )}
            {currentUser.isError && <Alert>{describeFailure(currentUser.error)}</Alert>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function describeFailure(error: unknown) {
  const envelope = apiErrorEnvelope(error);
  return envelope ? errorCopy(envelope.code) : unreachableCopy;
}
