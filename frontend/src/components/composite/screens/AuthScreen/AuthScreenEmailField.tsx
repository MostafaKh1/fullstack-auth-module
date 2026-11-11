import { useFormContext } from "react-hook-form";
import { FormControl } from "@/components/base/forms/Form/FormControl";
import { FormField } from "@/components/base/forms/Form/FormField";
import { FormItem } from "@/components/base/forms/Form/FormItem";
import { FormLabel } from "@/components/base/forms/Form/FormLabel";
import { FormMessage } from "@/components/base/forms/Form/FormMessage";
import { Input } from "@/components/base/inputs/Input";

/** Inside an `AuthScreenForm` whose fields include `email`. */
export function AuthScreenEmailField() {
  const { control } = useFormContext<{ email: string }>();
  return (
    <FormField
      control={control}
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
  );
}
