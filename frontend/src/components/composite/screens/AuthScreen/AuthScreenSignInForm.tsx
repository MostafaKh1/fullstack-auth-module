import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { useSession } from "@/hooks/useSession";
import { signIn } from "@/utils/api/auth-api";
import { errorCopy } from "@/utils/error-copy";
import { applyApiFailure } from "./AuthScreenApiFailure";
import { type SignInFields, signInSchema } from "./AuthScreenFieldRules";

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
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {errors.root?.server?.message && <Alert>{errors.root.server.message}</Alert>}
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
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
              <FormMessage>{fieldState.error?.message && errorCopy(fieldState.error.message)}</FormMessage>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage>{fieldState.error?.message && errorCopy(fieldState.error.message)}</FormMessage>
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" pending={isSubmitting} className="mt-1 w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}
