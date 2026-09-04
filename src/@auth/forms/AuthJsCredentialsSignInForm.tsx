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
import { useIcyPlayAuth } from "../contexts/IcyPlayAuthContext/useIcyPlayAuth";

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

  async function onSubmit(formData: FormType) {
    const { email, password } = formData;

    try {
      await signIn(email, password);
      enqueueSnackbar("Signed in successfully.", { variant: "success" });
      router.push("/");
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
          sx={(theme) => ({
            backgroundColor: theme.palette.error.light,
            color: theme.palette.error.dark,
          })}
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
                control={<Checkbox size="small" {...field} />}
              />
            </FormControl>
          )}
        />

        <Link className="text-md font-medium" to="/#">
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
