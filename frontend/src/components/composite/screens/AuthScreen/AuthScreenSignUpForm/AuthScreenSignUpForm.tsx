import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { HandRolledButton } from "@/components/base/buttons/HandRolledButton";
import { TextField } from "@/components/base/inputs/TextField";
import { Alert } from "@/components/composite/banners-and-notifications/Alert";
import { applyApiFailure } from "@/components/composite/screens/AuthScreen/AuthScreenApiFailure";
import {
  type SignUpFields,
  signUpSchema,
} from "@/components/composite/screens/AuthScreen/AuthScreenFieldRules";
import { useSession } from "@/hooks/useSession";
import { signUp } from "@/utils/api/auth-api";
import { errorCopy } from "@/utils/error-copy";
import { AuthScreenSignUpFormPasswordChecklist } from "./AuthScreenSignUpFormPasswordChecklist";
import { AuthScreenSignUpFormPasswordField } from "./AuthScreenSignUpFormPasswordField";

const fields = ["email", "name", "password"] as const;

export function AuthScreenSignUpForm() {
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
      <AuthScreenSignUpFormPasswordField
        label="Password"
        autoComplete="new-password"
        error={errors.password?.message && errorCopy(errors.password.message)}
        {...form.register("password")}
      >
        <AuthScreenSignUpFormPasswordChecklist password={password} className="mt-1" />
      </AuthScreenSignUpFormPasswordField>
      <HandRolledButton type="submit" pending={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Signing up…" : "Sign up"}
      </HandRolledButton>
    </form>
  );
}
