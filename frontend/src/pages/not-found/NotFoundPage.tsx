import { Link } from "react-router";
import { Card } from "@/components/base/cards/Card/Card";
import { CardContent } from "@/components/base/cards/Card/CardContent";
import { CardHeader } from "@/components/base/cards/Card/CardHeader";
import { CardTitle } from "@/components/base/cards/Card/CardTitle";

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <title>Page not found</title>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1 className="text-2xl tracking-tight">Page not found</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link to="/" className="text-primary underline underline-offset-4">
            Go to the application
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
