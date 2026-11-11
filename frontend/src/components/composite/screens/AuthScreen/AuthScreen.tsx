import type { ReactNode } from "react";
import { Card } from "@/components/base/cards/Card/Card";
import { CardContent } from "@/components/base/cards/Card/CardContent";
import { CardDescription } from "@/components/base/cards/Card/CardDescription";
import { CardHeader } from "@/components/base/cards/Card/CardHeader";
import { CardTitle } from "@/components/base/cards/Card/CardTitle";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

/** `title` is also the page title. */
export function AuthScreen({ title, subtitle, children, footer }: Props) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <title>{title}</title>
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-brand-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-primary/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 -bottom-40 size-[30rem] rounded-full bg-brand-accent/25 blur-3xl"
        />
        <p className="relative flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20"
          >
            ◆
          </span>
          The application
        </p>
        <div className="relative max-w-sm">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            One Session per device, ended the moment you sign out.
          </p>
          <p className="mt-4 text-brand-muted-foreground">
            Your password is hashed, your refresh credential is out of reach of scripts, and your access token
            never touches storage.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle asChild>
                <h1 className="text-2xl tracking-tight">{title}</h1>
              </CardTitle>
              <CardDescription>{subtitle}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}
