import { AuthScreen } from "@/features/auth/components/composite/screens/AuthScreen/AuthScreen";
import { AuthScreenSignUpForm } from "@/features/auth/components/composite/screens/AuthScreen/AuthScreenSignUpForm/AuthScreenSignUpForm";
import { AuthScreenSwitchLink } from "@/features/auth/components/composite/screens/AuthScreen/AuthScreenSwitchLink";

export function SignUpPage() {
  return (
    <AuthScreen
      title="Sign up"
      subtitle="Choose an email, a name and a password. You are signed in as soon as you sign up."
      footer={
        <>
          Already signed up? <AuthScreenSwitchLink to="sign-in">Sign in</AuthScreenSwitchLink>
        </>
      }
    >
      <AuthScreenSignUpForm />
    </AuthScreen>
  );
}
