import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import _ from "lodash";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import FormHelperText from "@mui/material/FormHelperText";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import { useSnackbar } from "notistack";
import { useRouter } from "next/navigation";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";
import { useEffect } from "react";
import { registerAccount, RegistrationApiError } from "../registrationApi";
import { executeRecaptcha } from "../recaptchaV3";

/**
 * Form Validation Schema
 */
const schema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(200),
    email: z
      .string()
      .email("You must enter a valid email")
      .nonempty("You must enter an email"),
    phone: z.string().refine((value) => {
      const normalized = value.replace(/[\s()-]/g, "");
      return /^(09\d{9}|\+63\d{10}|\+?\d{8,15})$/.test(normalized);
    }, "You must enter a valid phone number"),
    password: z
      .string()
      .nonempty("Please enter your password.")
      .min(12, "Password must be at least 12 characters.")
      .max(128, "Password must not exceed 128 characters.")
      .regex(/[A-Z]/, "Password must contain an uppercase letter.")
      .regex(/[a-z]/, "Password must contain a lowercase letter.")
      .regex(/[0-9]/, "Password must contain a number.")
      .regex(/[^A-Za-z0-9]/, "Password must contain a special character."),
    passwordConfirm: z.string().nonempty("Password confirmation is required"),
    acceptTermsConditions: z
      .boolean()
      .refine(
        (val) => val === true,
        "The terms and conditions must be accepted.",
      ),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords must match",
    path: ["passwordConfirm"],
  });

const defaultValues = {
  displayName: "",
  email: "",
  phone: "",
  password: "",
  passwordConfirm: "",
  acceptTermsConditions: false,
};

const registrationFieldStyles = {
  "& .MuiInputBase-input": { fontSize: "0.95rem" },
  "& .MuiInputLabel-root": { fontSize: "0.9rem" },
  "& .MuiFormHelperText-root": { fontSize: "0.82rem" },
};

export type FormType = {
  displayName: string;
  password: string;
  email: string;
  phone: string;
  passwordConfirm: string;
  acceptTermsConditions: boolean;
};

function AuthJsCredentialsSignUpForm({
  accountType = "user",
}: {
  accountType?: "user" | "facility-owner";
}) {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const { control, formState, handleSubmit, watch, reset } = useForm({
    mode: "onChange",
    defaultValues,
    resolver: zodResolver(schema),
  });

  const { isValid, dirtyFields, errors, isSubmitting } = formState;
  const password = watch("password");

  useEffect(() => {
    void executeRecaptcha("registration_page").catch(() => {
      // Submission displays a user-facing error if reCAPTCHA remains unavailable.
    });
  }, []);

  const passwordCriteria = [
    ["12–128 characters", password.length >= 12 && password.length <= 128],
    ["One uppercase letter", /[A-Z]/.test(password)],
    ["One lowercase letter", /[a-z]/.test(password)],
    ["One number", /[0-9]/.test(password)],
    ["One special character", /[^A-Za-z0-9]/.test(password)],
  ] as const;

  async function onSubmit(formData: FormType) {
    try {
      const captchaToken = await executeRecaptcha("register");
      await registerAccount({
        ...formData,
        captchaToken,
        acceptedTerms: formData.acceptTermsConditions,
        accountType,
      });
      enqueueSnackbar("Account created successfully. You can now sign in.", {
        variant: "success",
      });
      reset();
      router.push("/sign-in");
      return true;
    } catch (error) {
      const apiError = error as RegistrationApiError;
      const validationMessages = Object.values(apiError.details || {}).flat();
      enqueueSnackbar(validationMessages.join(" ") || apiError.message, {
        variant: "error",
      });
      return false;
    }
  }

  return (
    <form
      name="registerForm"
      noValidate
      className="flex w-full flex-col justify-center"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Controller
        name="displayName"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            className="mb-6"
            label="Display name"
            autoFocus
            type="name"
            error={!!errors.displayName}
            helperText={errors?.displayName?.message}
            variant="outlined"
            required
            fullWidth
            sx={registrationFieldStyles}
          />
        )}
      />
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            className="mb-6"
            label="Email"
            type="email"
            error={!!errors.email}
            helperText={errors?.email?.message}
            variant="outlined"
            required
            fullWidth
            sx={registrationFieldStyles}
          />
        )}
      />
      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            className="mb-6"
            label="Phone number"
            type="tel"
            error={!!errors.phone}
            helperText={errors?.phone?.message}
            variant="outlined"
            required
            fullWidth
            sx={registrationFieldStyles}
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
            sx={registrationFieldStyles}
          />
        )}
      />
      <div className="-mt-2 mb-6 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {passwordCriteria.map(([label, isMet]) => (
          <div
            key={label}
            className={`flex items-center gap-2 text-[0.9rem] ${isMet ? "text-green-700" : "text-slate-500"}`}
          >
            {isMet ? (
              <CheckCircleOutline sx={{ fontSize: 18 }} />
            ) : (
              <RadioButtonUnchecked sx={{ fontSize: 18 }} />
            )}
            <Typography component="span" className="text-[0.9rem]">
              {label}
            </Typography>
          </div>
        ))}
      </div>
      <Controller
        name="passwordConfirm"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            className="mb-6"
            label="Password (Confirm)"
            type="password"
            error={!!errors.passwordConfirm}
            helperText={errors?.passwordConfirm?.message}
            variant="outlined"
            required
            fullWidth
            sx={registrationFieldStyles}
          />
        )}
      />
      <Controller
        name="acceptTermsConditions"
        control={control}
        render={({ field }) => (
          <FormControl error={!!errors.acceptTermsConditions}>
            <FormControlLabel
              label={
                <span className="text-[0.95rem] leading-6">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="bg-transparent font-medium text-[#1264F7] selection:bg-transparent hover:bg-transparent hover:underline focus:bg-transparent active:bg-transparent"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="bg-transparent font-medium text-[#1264F7] selection:bg-transparent hover:bg-transparent hover:underline focus:bg-transparent active:bg-transparent"
                  >
                    Privacy Policy
                  </Link>
                </span>
              }
              control={<Checkbox size="small" {...field} />}
            />
            <FormHelperText>
              {errors?.acceptTermsConditions?.message}
            </FormHelperText>
          </FormControl>
        )}
      />
      <Typography className="mt-3 text-sm leading-6 text-slate-500">
        This site is protected by reCAPTCHA and the Google Privacy Policy and
        Terms of Service apply.
      </Typography>
      <Button
        variant="contained"
        color="secondary"
        className="mt-6 w-full"
        aria-label="Register"
        disabled={_.isEmpty(dirtyFields) || !isValid || isSubmitting}
        type="submit"
        size="large"
      >
        {isSubmitting ? "Creating account..." : "Create your free account"}
      </Button>
    </form>
  );
}

export default AuthJsCredentialsSignUpForm;
