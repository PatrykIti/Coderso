export type EntryDataValue =
  string | number | boolean | null | EntryDataValue[] | { [key: string]: EntryDataValue };

export type EntryData = Record<string, EntryDataValue>;

const readArrayChildren = (value: unknown[]): unknown[] | null => {
  if (Object.getPrototypeOf(value) !== Array.prototype) return null;

  const ownKeys = Reflect.ownKeys(value);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (!lengthDescriptor || !("value" in lengthDescriptor) || lengthDescriptor.enumerable)
    return null;
  const length: unknown = lengthDescriptor.value;
  if (
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    ownKeys.length !== length + 1 ||
    ownKeys.some((key) => typeof key !== "string")
  ) {
    return null;
  }

  const children: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) return null;
    children.push(descriptor.value);
  }
  return children;
};

const readObjectChildren = (value: object): unknown[] | null => {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;

  const children: unknown[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) return null;
    children.push(descriptor.value);
  }
  return children;
};

const isEntryDataValueInternal = (value: unknown, ancestors: Set<object>): boolean => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;
  if (ancestors.has(value)) return false;

  const children = Array.isArray(value) ? readArrayChildren(value) : readObjectChildren(value);
  if (!children) return false;

  ancestors.add(value);
  const valid = children.every((child) => isEntryDataValueInternal(child, ancestors));
  ancestors.delete(value);
  return valid;
};

export const isEntryDataValue = (value: unknown): value is EntryDataValue => {
  try {
    return isEntryDataValueInternal(value, new Set());
  } catch {
    return false;
  }
};

export const isEntryData = (value: unknown): value is EntryData => {
  try {
    return (
      Boolean(value) &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      isEntryDataValueInternal(value, new Set())
    );
  } catch {
    return false;
  }
};
