import { Algorithm, hash, verify } from "@node-rs/argon2";
import { applyPasswordPepper } from "./passwordPepper";

const defaultOptions = {
  algorithm: Algorithm.Argon2id,
};

export async function hashPassword(password: string) {
  return hash(applyPasswordPepper(password), defaultOptions);
}

export async function verifyPassword(hashValue: string, password: string) {
  return verify(hashValue, applyPasswordPepper(password), defaultOptions);
}
