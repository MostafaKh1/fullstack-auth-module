import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  /** The form. */
  children: ReactNode;
  /** The link to the other form. */
  footer: ReactNode;
};

/** The frame shared by Sign up and Sign in: a brand panel beside a card holding the form. */
export function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-indigo-950 p-12 text-indigo-50 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-indigo-500/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 -bottom-40 size-[30rem] rounded-full bg-fuchsia-500/25 blur-3xl"
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
          <p className="mt-4 text-indigo-200">
            Your password is hashed, your refresh credential is out of reach of scripts, and your access token
            never touches storage.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">{footer}</p>
        </div>
      </main>
    </div>
  );
}
