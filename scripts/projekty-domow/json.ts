import type { JsonObject, JsonValue } from "../../core/services/kits/fullSitePackage/types";

const isJsonValue = (value: unknown): value is JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  return typeof value === "object" && Object.values(value).every(isJsonValue);
};

const isJsonObject = (value: unknown): value is JsonObject => {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  return Object.values(value).every(isJsonValue);
};

export const cleanJsonObject = (value: object): JsonObject => {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  if (!isJsonObject(parsed)) {
    throw new Error("projekty_domow_json_object_invalid");
  }
  return parsed;
};
