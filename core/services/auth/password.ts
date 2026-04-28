import { Algorithm, hash, verify } from "@node-rs/argon2";

const defaultOptions = {
  algorithm: Algorithm.Argon2id,
};

const resolvePepper = () => {
  const raw = process.env.AUTH_PASSWORD_PEPPER;
  if (!raw) return "";
  const trimmed = raw.trim();
  return trimmed ? trimmed : "";
};

const applyPepper = (password: string) => {
  const pepper = resolvePepper();
  return pepper ? `${password}${pepper}` : password;
};

export function isPasswordPepperConfigured() {
  return Boolean(resolvePepper());
}

export async function hashPassword(password: string) {
  return hash(applyPepper(password), defaultOptions);
}

export async function verifyPassword(hashValue: string, password: string) {
  return verify(hashValue, applyPepper(password), defaultOptions);
}
