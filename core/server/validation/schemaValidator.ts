import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";

import { ApiError } from "../errorHandler";

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  strictTypes: false,
  allowUnionTypes: true,
});

const validators = new WeakMap<object, ValidateFunction>();

const formatErrors = (errors: ErrorObject[]) =>
  errors.map((error) => {
    let path = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
    if (!path && "missingProperty" in error.params) {
      path = String((error.params as { missingProperty?: string }).missingProperty ?? "");
    }
    return {
      path: path || "_",
      message: error.message ?? "Invalid value",
      keyword: error.keyword,
    };
  });

export function validate(schema: unknown, payload: unknown) {
  if (!schema || typeof schema !== "object") return;
  let validator = validators.get(schema);
  if (!validator) {
    validator = ajv.compile(schema);
    validators.set(schema, validator);
  }

  const ok = validator(payload);
  if (!ok) {
    const details = formatErrors(validator.errors ?? []);
    throw new ApiError("validation_error", "Invalid payload", 400, details);
  }
}
