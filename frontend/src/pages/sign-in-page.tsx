import { AuthLayout } from "../features/auth/auth-layout";
import { AuthLink } from "../features/auth/auth-link";
import { SignInForm } from "../features/auth/sign-in-form";

export function SignInPage() {
  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Enter the email and password you signed up with."
      footer={
        <>
          New here? <AuthLink to="/sign-up">Sign up</AuthLink>
        </>
      }
    >
      <SignInForm />
    </AuthLayout>
  );
}
