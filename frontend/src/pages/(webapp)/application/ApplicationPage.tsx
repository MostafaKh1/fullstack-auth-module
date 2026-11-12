import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/base/alerts/Alert";
import { Button } from "@/components/base/buttons/Button";
import { Card } from "@/components/base/cards/Card/Card";
import { CardContent } from "@/components/base/cards/Card/CardContent";
import { CardDescription } from "@/components/base/cards/Card/CardDescription";
import { CardHeader } from "@/components/base/cards/Card/CardHeader";
import { CardTitle } from "@/components/base/cards/Card/CardTitle";
import { ThemeToggle } from "@/components/composite/toggles/ThemeToggle/ThemeToggle";
import { useSession } from "@/features/auth/hooks/useSession";
import { apiFailureCode } from "@/utils/api/api-error";
import { orpc } from "@/utils/api/orpc-client";
import { errorCopy } from "@/utils/error-copy";

export function ApplicationPage() {
  const currentUser = useQuery(orpc.users.me.queryOptions());
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
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" pending={signingOut} onClick={signOut}>
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
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
            {currentUser.isError && <Alert>{errorCopy(apiFailureCode(currentUser.error))}</Alert>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
