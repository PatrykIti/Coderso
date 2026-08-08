import { createHash } from "node:crypto";

export function invariant(condition, message) {
  if (!condition) throw new Error("TASK-540 smoke executor: " + message);
}

export function deepFreezeExact(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreezeExact(value[key], seen);
  return Object.freeze(value);
}

export function exactOwnKeys(value, keys, label, { plain = false } = {}) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    label + " must be an object"
  );
  if (plain) invariant(Object.getPrototypeOf(value) === Object.prototype, label + " must be plain");
  const actual = Reflect.ownKeys(value);
  invariant(
    actual.length === keys.length && keys.every((key) => actual.includes(key)),
    label + " has non-canonical keys"
  );
}

export function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

export function assertRecursivelyFrozen(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return;
  if (seen.has(value)) return;
  seen.add(value);
  invariant(Object.isFrozen(value), "plan contains mutable state");
  for (const key of Reflect.ownKeys(value)) assertRecursivelyFrozen(value[key], seen);
}
