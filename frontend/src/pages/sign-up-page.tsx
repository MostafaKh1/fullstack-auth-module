import { AuthLayout } from "../features/auth/auth-layout";
import { AuthLink } from "../features/auth/auth-link";
import { SignUpForm } from "../features/auth/sign-up-form";

export function SignUpPage() {
  return (
    <AuthLayout
      title="Sign up"
      subtitle="Choose an email, a name and a password. You are signed in as soon as you sign up."
      footer={
        <>
          Already signed up? <AuthLink to="/sign-in">Sign in</AuthLink>
        </>
      }
    >
      <SignUpForm />
    </AuthLayout>
  );
}
