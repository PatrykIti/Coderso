import { hashPassword } from "../services/auth/password";

export async function hashSeedAdminPassword(password: string) {
  return hashPassword(password);
}
