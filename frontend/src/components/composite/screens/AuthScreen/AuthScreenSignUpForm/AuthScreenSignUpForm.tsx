import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/base/buttons/Button";
import { Form } from "@/components/base/forms/Form/Form";
import { FormControl } from "@/components/base/forms/Form/FormControl";
import { FormField } from "@/components/base/forms/Form/FormField";
import { FormItem } from "@/components/base/forms/Form/FormItem";
import { FormLabel } from "@/components/base/forms/Form/FormLabel";
import { FormMessage } from "@/components/base/forms/Form/FormMessage";
import { Input } from "@/components/base/inputs/Input";
import { PasswordInput } from "@/components/base/inputs/PasswordInput";
import { Alert } from "@/components/composite/banners-and-notifications/Alert";
import { applyApiFailure } from "@/components/composite/screens/AuthScreen/AuthScreenApiFailure";
import {
  type SignUpFields,
  signUpSchema,
} from "@/components/composite/screens/AuthScreen/AuthScreenFieldRules";
import { useSession } from "@/hooks/useSession";
import { signUp } from "@/utils/api/auth-api";
import { AuthScreenSignUpFormPasswordChecklist } from "./AuthScreenSignUpFormPasswordChecklist";

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
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {errors.root?.server?.message && <Alert>{errors.root.server.message}</Alert>}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <Button type="submit" size="lg" pending={isSubmitting} className="mt-1 w-full">
          {isSubmitting ? "Signing up…" : "Sign up"}
        </Button>
      </form>
    </Form>
  );
}
