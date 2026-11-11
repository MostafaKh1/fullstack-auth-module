import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { FormControl } from "@/components/base/forms/Form/FormControl";
import { FormField } from "@/components/base/forms/Form/FormField";
import { FormItem } from "@/components/base/forms/Form/FormItem";
import { FormLabel } from "@/components/base/forms/Form/FormLabel";
import { FormMessage } from "@/components/base/forms/Form/FormMessage";
import { PasswordInput } from "@/components/base/inputs/PasswordInput";
import { signIn } from "@/utils/api/auth-api";
import { AuthScreenEmailField } from "./AuthScreenEmailField";
import { type SignInFields, signInSchema } from "./AuthScreenFieldRules";
import { AuthScreenForm } from "./AuthScreenForm/AuthScreenForm";

const fields = ["email", "password"] as const;

export function AuthScreenSignInForm() {
  const form = useForm<SignInFields, unknown, z.output<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  return (
    <AuthScreenForm
      form={form}
      fields={fields}
      submit={signIn}
      submitLabel="Sign in"
      pendingLabel="Signing in…"
    >
      <AuthScreenEmailField />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <PasswordInput autoComplete="current-password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </AuthScreenForm>
  );
}
