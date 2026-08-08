import type { JsonObject } from "../../core/services/kits/fullSitePackage/types";

const INVALID_JSON_OBJECT = "projekty_domow_json_object_invalid";

const fail = (): never => {
  throw new Error(INVALID_JSON_OBJECT);
};

const isCanonicalArrayIndex = (key: string, length: number): boolean => {
  if (key === "" || key === "-0") return false;
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
};

const validateJsonValue = (value: unknown, active: WeakSet<object>): void => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail();
    return;
  }
  if (typeof value !== "object") fail();
  const objectValue = value as object;
  if (active.has(objectValue)) fail();

  active.add(objectValue);
  try {
    const ownKeys = Reflect.ownKeys(objectValue);
    if (ownKeys.some((key) => typeof key === "symbol")) fail();

    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) fail();
      const names = ownKeys as string[];
      if (
        names.length !== value.length + 1 ||
        !names.includes("length") ||
        names.some((key) => key !== "length" && !isCanonicalArrayIndex(key, value.length))
      ) {
        fail();
      }
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail();
        validateJsonValue((descriptor as PropertyDescriptor & { value: unknown }).value, active);
      }
      return;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail();
    for (const key of ownKeys as string[]) {
      if (key === "toJSON") fail();
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail();
      validateJsonValue((descriptor as PropertyDescriptor & { value: unknown }).value, active);
    }
  } finally {
    active.delete(objectValue);
  }
};

export const cleanJsonObject = (value: object): JsonObject => {
  try {
    if (!value || Array.isArray(value)) fail();
    validateJsonValue(value, new WeakSet<object>());
    const serialized = JSON.stringify(value);
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") fail();
    return parsed as JsonObject;
  } catch {
    throw new Error(INVALID_JSON_OBJECT);
  }
};
