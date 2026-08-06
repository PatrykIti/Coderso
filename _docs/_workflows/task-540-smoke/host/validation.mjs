export function invariant(condition, message) {
  if (!condition) throw new Error("TASK-540 smoke host: " + message);
}

export function deepFreezeExact(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreezeExact(value[key], seen);
  return Object.freeze(value);
}

export function exactDataObject(
  value,
  expectedKeys,
  label,
  { nullPrototype = false } = {}
) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    label + " must be an object"
  );
  invariant(
    nullPrototype
      ? Object.getPrototypeOf(value) === null
      : Object.getPrototypeOf(value) === Object.prototype,
    label + " prototype drift"
  );
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  invariant(
    keys.length === expectedKeys.length && expectedKeys.every((key) => keys.includes(key)),
    label + " key drift"
  );
  for (const key of keys) {
    const descriptor = descriptors[key];
    invariant(
      typeof key === "string" &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set") &&
        descriptor.enumerable,
      label + " must contain enumerable data properties only"
    );
  }
}

export function exactOrderedDataObject(value, expectedKeys, label) {
  exactDataObject(value, expectedKeys, label);
  invariant(
    Reflect.ownKeys(value).every((key, index) => key === expectedKeys[index]),
    label + " key order drift"
  );
}

export function exactDenseArray(value, label) {
  invariant(
    Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype,
    label + " must be a plain array"
  );
  const expectedKeys = [...value.keys()].map(String).concat("length");
  const keys = Reflect.ownKeys(value);
  invariant(
    keys.length === expectedKeys.length && keys.every((key, index) => key === expectedKeys[index]),
    label + " key drift"
  );
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    invariant(
      descriptor &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set") &&
        descriptor.enumerable,
      label + " element descriptor drift"
    );
  }
  invariant(
    Object.hasOwn(descriptors.length, "value") && !descriptors.length.enumerable,
    label + " length descriptor drift"
  );
}
