import { exactOwnKeys, invariant } from "./foundation.mjs";
import { assertPlainJsonValue } from "./json-schema.mjs";

export function validateExactBridgeKeys(value, keys, label) {
  exactOwnKeys(value, keys, label, { plain: true });
  assertPlainJsonValue(value, label);
  return value;
}

export function validateBridgeNullableUuid(value, label) {
  if (value !== null) requireBridgeUuid(value, label);
}

export function validateBridgeNullableString(value, label, maximum = 1024) {
  if (value !== null) requireBoundedBridgeString(value, label, maximum);
}

export function validateBridgeJsonObject(value, label) {
  exactOwnKeys(value, Object.keys(value ?? {}), label, { plain: true });
  assertPlainJsonValue(value, label);
  return value;
}

export function validateBridgeStringArray(value, label, maximumItems = 64, maximumLength = 256) {
  invariant(Array.isArray(value) && value.length <= maximumItems, label + " array bound drift");
  value.forEach((item, index) =>
    requireBoundedBridgeString(item, label + "[" + index + "]", maximumLength)
  );
  invariant(new Set(value).size === value.length, label + " contains duplicates");
  return value;
}

export function requireBoundedBridgeString(value, label, maximum = 512) {
  invariant(
    typeof value === "string" &&
      value.length > 0 &&
      !value.includes("\0") &&
      Buffer.byteLength(value) <= maximum,
    label + " bounded string drift"
  );
  return value;
}

export function requireBridgeUuid(value, label) {
  invariant(
    typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value),
    label + " UUID drift"
  );
  return value;
}
