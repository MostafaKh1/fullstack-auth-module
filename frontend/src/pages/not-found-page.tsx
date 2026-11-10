import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="text-indigo-700 underline">
        Go to the start page
      </Link>
    </main>
  );
}
