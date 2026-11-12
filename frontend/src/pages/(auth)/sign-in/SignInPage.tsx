import { AuthScreen } from "@/features/auth/components/composite/screens/AuthScreen/AuthScreen";
import { AuthScreenSignInForm } from "@/features/auth/components/composite/screens/AuthScreen/AuthScreenSignInForm";
import { AuthScreenSwitchLink } from "@/features/auth/components/composite/screens/AuthScreen/AuthScreenSwitchLink";

export function SignInPage() {
  return (
    <AuthScreen
      title="Sign in"
      subtitle="Welcome back. Enter the email and password you signed up with."
      footer={
        <>
          New here? <AuthScreenSwitchLink to="sign-up">Sign up</AuthScreenSwitchLink>
        </>
      }
    >
      <AuthScreenSignInForm />
    </AuthScreen>
  );
}
