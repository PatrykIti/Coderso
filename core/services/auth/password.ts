import { Algorithm, hash, verify } from "@node-rs/argon2";

const defaultOptions = {
  algorithm: Algorithm.Argon2id,
};

export async function hashPassword(password: string) {
  return hash(password, defaultOptions);
}

export async function verifyPassword(hashValue: string, password: string) {
  return verify(hashValue, password, defaultOptions);
}
