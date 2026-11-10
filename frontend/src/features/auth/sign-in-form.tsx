import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { signIn } from "../../api/auth";
import { Alert } from "../../components/alert";
import { Button } from "../../components/button";
import { TextField } from "../../components/text-field";
import { errorCopy } from "../../lib/error-copy";
import { applyApiFailure } from "./apply-api-failure";
import { PasswordField } from "./password-field";
import { type SignInFields, signInSchema } from "./schemas";
import { useSession } from "./use-session";

const fields = ["email", "password"] as const;

/** Sign in: validates on blur and on submit, then starts the User's Session. */
export function SignInForm() {
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
      <PasswordField
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
