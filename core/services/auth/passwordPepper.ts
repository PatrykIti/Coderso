export const resolvePasswordPepper = () => {
  const raw = process.env.AUTH_PASSWORD_PEPPER;
  if (!raw) return "";
  const trimmed = raw.trim();
  return trimmed ? trimmed : "";
};

export const applyPasswordPepper = (password: string) => {
  const pepper = resolvePasswordPepper();
  return pepper ? `${password}${pepper}` : password;
};

export function isPasswordPepperConfigured() {
  return Boolean(resolvePasswordPepper());
}
