export function invariant(condition, message) {
  if (!condition) throw new Error("TASK-540 smoke contract: " + message);
}

export function deepFreezeExact(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreezeExact(value[key], seen);
  return Object.freeze(value);
}

export function assertClosedDataTree(value, label, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    invariant(Number.isFinite(value), label + " contains a non-finite number");
    return;
  }
  invariant(typeof value === "object", label + " contains a non-data value");
  invariant(!ancestors.has(value), label + " contains a cycle");
  const prototype = Object.getPrototypeOf(value);
  invariant(
    Array.isArray(value)
      ? prototype === Array.prototype
      : prototype === Object.prototype || prototype === null,
    label + " contains a custom or inherited prototype"
  );
  const keys = Reflect.ownKeys(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Array.isArray(value)) {
    invariant(
      keys.length === value.length + 1 &&
        keys.at(-1) === "length" &&
        keys.slice(0, -1).every((key, index) => key === String(index)),
      label + " contains a sparse array or custom array key"
    );
  } else {
    invariant(
      keys.every((key) => typeof key === "string"),
      label + " contains a symbol key"
    );
  }
  ancestors.add(value);
  for (const key of keys) {
    if (Array.isArray(value) && key === "length") continue;
    const descriptor = descriptors[key];
    invariant(
      descriptor !== undefined &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set") &&
        descriptor.enumerable === true &&
        descriptor.value !== undefined,
      label + "." + String(key) + " must be an enumerable defined data property"
    );
    assertClosedDataTree(descriptor.value, label + "." + String(key), ancestors);
  }
  ancestors.delete(value);
}

export function exactKeys(value, expected, label) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    label + " must be an object"
  );
  const actual = Reflect.ownKeys(value);
  invariant(
    actual.length === expected.length && expected.every((key, index) => actual[index] === key),
    label + " has non-canonical keys"
  );
}

export function sameSet(left, right) {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((item) => right.includes(item))
  );
}

export function valueAtPath(value, path, label) {
  let current = value;
  for (const segment of path) {
    invariant(
      current !== null && typeof current === "object" && Object.hasOwn(current, segment),
      label + " references a missing value"
    );
    current = current[segment];
  }
  return current;
}
