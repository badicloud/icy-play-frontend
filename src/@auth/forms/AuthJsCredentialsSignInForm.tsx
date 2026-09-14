import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import _ from "lodash";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Link from "@fuse/core/Link";
import Button from "@mui/material/Button";
import { Alert } from "@mui/material";
import { useSnackbar } from "notistack";
import { useRouter } from "next/navigation";
import { ApiError } from "@/services/api";
import { executeRecaptcha, preloadRecaptcha } from "../recaptchaV3";
import { useIcyPlayAuth } from "../contexts/IcyPlayAuthContext/useIcyPlayAuth";
import { intendedDestination } from "../intendedDestination";

/**
 * Form Validation Schema
 */
const schema = z.object({
  email: z
    .string()
    .email("You must enter a valid email")
    .nonempty("You must enter an email"),
  password: z
    .string()
    .min(4, "Password is too short - must be at least 4 chars.")
    .nonempty("Please enter your password."),
  remember: z.boolean().optional(),
});

type FormType = z.infer<typeof schema>;

const defaultValues = {
  email: "",
  password: "",
  remember: true,
};

function AuthJsCredentialsSignInForm() {
  const { enqueueSnackbar } = useSnackbar();
  const { signIn } = useIcyPlayAuth();
  const router = useRouter();
  const { control, formState, handleSubmit, setError } = useForm<FormType>({
    mode: "onChange",
    defaultValues,
    resolver: zodResolver(schema),
  });

  const { isValid, dirtyFields, errors, isSubmitting } = formState;

  useEffect(() => {
    // Warm the reCAPTCHA script so the first sign-in is not held up by it.
    void preloadRecaptcha().catch(() => {
      // A failed preload is retried when the form is actually submitted.
    });
  }, []);

  async function onSubmit(formData: FormType) {
    const { email, password, remember } = formData;

    try {
      const captchaToken = await executeRecaptcha("login");
      await signIn(email, password, captchaToken, remember ?? false);
      enqueueSnackbar("Signed in successfully.", { variant: "success" });
      // Somebody sent here mid-booking goes back to the hours they chose, not
      // to the front page to start again.
      router.push(intendedDestination());
      return true;
    } catch (error) {
      const apiError = error as ApiError;
      setError("root", { type: "manual", message: apiError.message });
      return false;
    }
  }

  return (
    <form
      name="loginForm"
      noValidate
      className="flex w-full flex-col justify-center"
      onSubmit={handleSubmit(onSubmit)}
    >
      {errors?.root?.message && (
        <Alert
          className="mb-8"
          severity="error"
          variant="outlined"
          sx={{
            borderRadius: "12px",
            borderColor: "#fecaca",
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            fontWeight: 600,
            "& .MuiAlert-icon": { color: "#dc2626" },
          }}
        >
          {errors?.root?.message}
        </Alert>
      )}
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            className="mb-6"
            label="Email"
            autoFocus
            type="email"
            error={!!errors.email}
            helperText={errors?.email?.message}
            variant="outlined"
            required
            fullWidth
          />
        )}
      />
      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            className="mb-6"
            label="Password"
            type="password"
            error={!!errors.password}
            helperText={errors?.password?.message}
            variant="outlined"
            required
            fullWidth
          />
        )}
      />
      <div className="flex flex-col items-center justify-center sm:flex-row sm:justify-between">
        <Controller
          name="remember"
          control={control}
          render={({ field }) => (
            <FormControl>
              <FormControlLabel
                label="Remember me"
                control={
                  <Checkbox
                    size="small"
                    {...field}
                    checked={field.value ?? false}
                  />
                }
              />
            </FormControl>
          )}
        />

        <Link className="text-md font-medium" to="/forgot-password">
          Forgot password?
        </Link>
      </div>
      <Button
        variant="contained"
        color="secondary"
        className="mt-4 w-full"
        aria-label="Sign in"
        disabled={_.isEmpty(dirtyFields) || !isValid || isSubmitting}
        type="submit"
        size="large"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

export default AuthJsCredentialsSignInForm;
