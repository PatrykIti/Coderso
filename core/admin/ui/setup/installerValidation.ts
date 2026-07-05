// Client-side field validation for the pre-auth installer (TASK-482-03-L01).
// Mirrors the server `installAdminSchema` (core/server/validation/installSchemas.ts)
// so the create-first-admin rules live in ONE place: name (1..200), email shape,
// password floor of 8, plus the confirm-match the schema cannot express. The
// installer submits exactly { name, email, password } — never a 4th field.

export type InstallerForm = {
  name: string;
  email: string;
  password: string;
  confirm: string;
};

// Same shape as the server schema pattern (`^[^\s@]+@[^\s@]+\.[^\s@]+$`).
export const INSTALLER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const INSTALLER_PASSWORD_MIN_LENGTH = 8;
export const INSTALLER_NAME_MAX_LENGTH = 200;

const hasNumber = (value: string) => /\d/.test(value);
const hasSpecial = (value: string) => /[^a-zA-Z0-9]/.test(value);

export type PasswordRule = { label: string; met: boolean };

// Advisory strength feedback for PasswordStrengthList. The FIRST rule is the
// hard gate mirrored by validateInstaller; number/special are guidance only and
// do NOT block submit (the server floor is length-only, like `login()`'s peers).
export const evaluatePasswordRules = (password: string): PasswordRule[] => [
  {
    label: `At least ${INSTALLER_PASSWORD_MIN_LENGTH} characters`,
    met: password.length >= INSTALLER_PASSWORD_MIN_LENGTH,
  },
  { label: "At least 1 number", met: hasNumber(password) },
  { label: "At least 1 special character", met: hasSpecial(password) },
];

// Returns the first human-readable error message, or `null` when the form is
// submittable. Callers block submit on any non-null result.
export const validateInstaller = (form: InstallerForm): string | null => {
  const name = form.name.trim();
  const email = form.email.trim();

  if (name.length < 1) return "Enter your name.";
  if (name.length > INSTALLER_NAME_MAX_LENGTH) {
    return `Name must be ${INSTALLER_NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (!INSTALLER_EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  if (form.password.length < INSTALLER_PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${INSTALLER_PASSWORD_MIN_LENGTH} characters.`;
  }
  if (form.password !== form.confirm) return "Passwords do not match.";

  return null;
};
