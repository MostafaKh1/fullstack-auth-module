import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Alert } from "@/components/base/alerts/Alert";
import { Button } from "@/components/base/buttons/Button";
import { Form } from "@/components/base/forms/Form/Form";
import { useSession } from "@/hooks/useSession";
import type { SignedIn } from "@/utils/api/auth-api";
import { errorCopy } from "@/utils/error-copy";
import { applyApiFailure } from "./AuthScreenFormApiFailure";

type Props<Fields extends FieldValues, Values extends FieldValues, Failure> = {
  form: UseFormReturn<Fields, unknown, Values>;
  /** The fields a server error may be set on; any other failure becomes the form-level alert. */
  fields: readonly Path<Fields>[];
  /** The request the form sends; its success starts the Session. */
  mutation: UseMutationOptions<SignedIn, Failure, Values>;
  submitLabel: string;
  pendingLabel: string;
  children: ReactNode;
};

/** The form, its submit, its failure alert and its submit button; `children` are the fields. */
export function AuthScreenForm<Fields extends FieldValues, Values extends FieldValues, Failure>({
  form,
  fields,
  mutation,
  submitLabel,
  pendingLabel,
  children,
}: Props<Fields, Values, Failure>) {
  const { startSession } = useSession();
  const submission = useMutation({ ...mutation, onSuccess: startSession });
  const { errors, isSubmitting } = form.formState;
  const failure = errors.root?.server?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submission.mutateAsync(values);
    } catch (error) {
      applyApiFailure(error, fields, form.setError);
    }
  });

  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {failure && <Alert>{errorCopy(failure)}</Alert>}
        {children}
        <Button type="submit" size="lg" pending={isSubmitting} className="mt-1 w-full">
          {isSubmitting ? pendingLabel : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
