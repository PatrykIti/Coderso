import {
  ALLOWED_ENV_KEYS,
  FIXED_ENV,
  REQUIRED_INHERITED_ENV,
  REQUIRED_REPO_ENV,
} from "./environment.mjs";
import { exactDataObject, invariant } from "./validation.mjs";

export function validateEnvironmentProjection(environment) {
  exactDataObject(environment, Reflect.ownKeys(environment), "host environment", {
    nullPrototype: true,
  });
  const keys = Object.keys(environment);
  invariant(new Set(keys).size === keys.length, "host environment repeats a key");
  invariant(
    keys.every((key) => ALLOWED_ENV_KEYS.includes(key)),
    "host environment contains an unknown key"
  );
  for (const key of [...REQUIRED_INHERITED_ENV, ...REQUIRED_REPO_ENV]) {
    invariant(
      typeof environment[key] === "string" && environment[key].length > 0,
      "missing required host env " + key
    );
  }
  for (const [key, value] of Object.entries(FIXED_ENV)) {
    invariant(environment[key] === value, "fixed host env conflict " + key);
  }
  for (const [key, value] of Object.entries(environment)) {
    invariant(typeof value === "string", "host env value must be a string: " + key);
  }
  invariant(
    !["ADMIN_EMAIL", "ADMIN_PASSWORD", "MEDIA_STORAGE", "MEDIA_DIR"].some((key) =>
      Object.hasOwn(environment, key)
    ),
    "forbidden host secret/storage key"
  );
}

export function parseNulEnvironment(bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  invariant(text.endsWith("\0"), "raw environment must end with NUL");
  const result = Object.create(null);
  for (const entry of text.slice(0, -1).split("\0")) {
    const equals = entry.indexOf("=");
    invariant(equals > 0, "raw environment entry is malformed");
    const key = entry.slice(0, equals);
    invariant(/^[A-Z_][A-Z0-9_]*$/u.test(key), "raw environment key is non-canonical");
    invariant(!Object.hasOwn(result, key), "raw environment contains duplicate key");
    result[key] = entry.slice(equals + 1);
  }
  return result;
}

export async function crossCheckRawEnvironment(deps) {
  const raw = parseNulEnvironment(await deps.readFile("/proc/self/environ"));
  const projected = Object.create(null);
  for (const key of Reflect.ownKeys(deps.environment)) {
    invariant(typeof key === "string", "process environment symbol drift");
    invariant(
      !["__proto__", "prototype", "constructor"].includes(key),
      "process environment prototype-pollution key"
    );
    const descriptor = Object.getOwnPropertyDescriptor(deps.environment, key);
    invariant(
      descriptor &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set"),
      "process environment accessor drift"
    );
    projected[key] = descriptor.value;
  }
  validateEnvironmentProjection(projected);
  invariant(
    JSON.stringify(Object.keys(raw).sort()) === JSON.stringify(Object.keys(projected).sort()) &&
      Object.keys(raw).every((key) => raw[key] === projected[key]),
    "raw/process environment mismatch"
  );
  return projected;
}
