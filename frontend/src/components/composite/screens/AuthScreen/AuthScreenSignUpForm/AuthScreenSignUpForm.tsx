import { type SignUpFields, signUpSchema } from "@app/contract/auth/auth.field-rules";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { FormControl } from "@/components/base/forms/Form/FormControl";
import { FormField } from "@/components/base/forms/Form/FormField";
import { FormItem } from "@/components/base/forms/Form/FormItem";
import { FormLabel } from "@/components/base/forms/Form/FormLabel";
import { FormMessage } from "@/components/base/forms/Form/FormMessage";
import { Input } from "@/components/base/inputs/Input";
import { PasswordInput } from "@/components/base/inputs/PasswordInput";
import { AuthScreenEmailField } from "@/components/composite/screens/AuthScreen/AuthScreenEmailField";
import { AuthScreenForm } from "@/components/composite/screens/AuthScreen/AuthScreenForm/AuthScreenForm";
import { orpc } from "@/utils/api/orpc-client";
import { AuthScreenSignUpFormPasswordChecklist } from "./AuthScreenSignUpFormPasswordChecklist";

const fields = ["email", "name", "password"] as const;

export function AuthScreenSignUpForm() {
  const form = useForm<SignUpFields, unknown, z.output<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    defaultValues: { email: "", name: "", password: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });

  return (
    <AuthScreenForm
      form={form}
      fields={fields}
      mutation={orpc.auth.signUp.mutationOptions()}
      submitLabel="Sign up"
      pendingLabel="Signing up…"
    >
      <AuthScreenEmailField />
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input autoComplete="name" placeholder="Ada Lovelace" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <PasswordInput autoComplete="new-password" {...field} />
            </FormControl>
            <FormMessage />
            <AuthScreenSignUpFormPasswordChecklist password={password} className="mt-1" />
          </FormItem>
        )}
      />
    </AuthScreenForm>
  );
}
