import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/base/buttons/Button";
import { TextField } from "@/components/base/inputs/TextField";
import { Alert } from "@/components/composite/banners-and-notifications/Alert";
import { useSession } from "@/hooks/useSession";
import { signIn } from "@/utils/api/auth-api";
import { errorCopy } from "@/utils/error-copy";
import { applyApiFailure } from "./AuthScreenApiFailure";
import { type SignInFields, signInSchema } from "./AuthScreenFieldRules";
import { AuthScreenPasswordField } from "./AuthScreenPasswordField";

const fields = ["email", "password"] as const;

export function AuthScreenSignInForm() {
  const { startSession } = useSession();
  const mutation = useMutation({ mutationFn: signIn, onSuccess: startSession });
  const form = useForm<SignInFields, unknown, z.output<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      applyApiFailure(error, fields, form.setError);
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {errors.root?.server?.message && <Alert>{errors.root.server.message}</Alert>}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        error={errors.email?.message && errorCopy(errors.email.message)}
        {...form.register("email")}
      />
      <AuthScreenPasswordField
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message && errorCopy(errors.password.message)}
        {...form.register("password")}
      />
      <Button type="submit" pending={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
