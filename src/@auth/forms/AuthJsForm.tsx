import { Alert } from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthJsProviderSelect from "./AuthJsProviderSelect";
import AuthJsCredentialsSignInForm from "./AuthJsCredentialsSignInForm";
import AuthJsCredentialsSignUpForm from "./AuthJsCredentialsSignUpForm";
import signinErrors from "./signinErrors";

type AuthJsFormProps = {
  formType: "signin" | "signup";
  accountType?: "user" | "facility-owner";
};

function AuthJsForm(props: AuthJsFormProps) {
  const { formType = "signin", accountType } = props;

  const searchParams = useSearchParams();

  const errorType = searchParams.get("error");

  const error = errorType && (signinErrors[errorType] ?? signinErrors.default);

  return (
    <div className="flex flex-col space-y-8">
      {error && (
        <Alert
          className="mt-4"
          severity="error"
          sx={(theme) => ({
            backgroundColor: theme.palette.error.light,
            color: theme.palette.error.dark,
          })}
        >
          {error}
        </Alert>
      )}
      {formType === "signin" && (
        <div className="flex flex-col gap-3">
          <AuthJsCredentialsSignInForm />
          <p className="text-center text-[0.95rem] text-slate-500">
            New here?{" "}
            <Link
              href="/sign-up"
              className="font-bold text-[#1257d5] hover:text-[#071955]"
            >
              Create an account
            </Link>
          </p>
        </div>
      )}
      {formType === "signup" && (
        <div className="flex flex-col gap-3">
          <AuthJsCredentialsSignUpForm accountType={accountType} />
          <p className="text-center text-[0.95rem] text-slate-500">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-bold text-[#1257d5] hover:text-[#071955]"
            >
              Sign in
            </Link>
          </p>
        </div>
      )}
      <AuthJsProviderSelect />
    </div>
  );
}

export default AuthJsForm;
