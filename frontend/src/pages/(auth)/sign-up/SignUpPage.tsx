import { AuthScreen } from "../../../components/composite/auth/AuthScreen/AuthScreen";
import { AuthScreenSignUpForm } from "../../../components/composite/auth/AuthScreen/AuthScreenSignUpForm";
import { AuthScreenSwitchLink } from "../../../components/composite/auth/AuthScreen/AuthScreenSwitchLink";

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
