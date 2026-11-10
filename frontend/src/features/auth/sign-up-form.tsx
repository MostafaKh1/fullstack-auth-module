import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { signUp } from "../../api/auth";
import { Alert } from "../../components/alert";
import { Button } from "../../components/button";
import { TextField } from "../../components/text-field";
import { errorCopy } from "../../lib/error-copy";
import { applyApiFailure } from "./apply-api-failure";
import { PasswordChecklist } from "./password-checklist";
import { PasswordField } from "./password-field";
import { type SignUpFields, signUpSchema } from "./schemas";
import { useSession } from "./use-session";

const fields = ["email", "name", "password"] as const;

/** Sign up: validates on blur and on submit, then starts the new User's Session. */
export function SignUpForm() {
  const { startSession } = useSession();
  const mutation = useMutation({ mutationFn: signUp, onSuccess: startSession });
  const form = useForm<SignUpFields, unknown, z.output<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    defaultValues: { email: "", name: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

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
      <TextField
        label="Name"
        autoComplete="name"
        placeholder="Ada Lovelace"
        error={errors.name?.message && errorCopy(errors.name.message)}
        {...form.register("name")}
      />
      <PasswordField
        label="Password"
        autoComplete="new-password"
        error={errors.password?.message && errorCopy(errors.password.message)}
        {...form.register("password")}
      >
        <PasswordChecklist password={password} className="mt-1" />
      </PasswordField>
      <Button type="submit" pending={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Signing up…" : "Sign up"}
      </Button>
    </form>
  );
}
