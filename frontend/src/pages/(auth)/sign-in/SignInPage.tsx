import { AuthScreen } from "@/components/composite/AuthScreen/AuthScreen";
import { AuthScreenSignInForm } from "@/components/composite/AuthScreen/AuthScreenSignInForm";
import { AuthScreenSwitchLink } from "@/components/composite/AuthScreen/AuthScreenSwitchLink";

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
