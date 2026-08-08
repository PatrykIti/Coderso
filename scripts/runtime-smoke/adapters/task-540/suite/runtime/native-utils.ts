import { createHash } from "node:crypto";
import { isPlainObject, SmokeError } from "../../../../contracts";
import type { PlainJsonObject, PlainJsonValue } from "../../../../workers/contracts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function runtimeInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new SmokeError("smoke_output_invalid", message);
}

export function runtimeObject(value: unknown, label: string): PlainJsonObject {
  runtimeInvariant(isPlainObject(value), `${label} is invalid`);
  return value as PlainJsonObject;
}

export function runtimeString(value: unknown, label: string, maximum = 4_096): string {
  runtimeInvariant(
    typeof value === "string" &&
      value.length > 0 &&
      Buffer.byteLength(value) <= maximum &&
      !value.includes("\0"),
    `${label} is invalid`
  );
  return value;
}

export function runtimeUuid(value: unknown, label: string): string {
  const id = runtimeString(value, label, 36);
  runtimeInvariant(UUID.test(id), `${label} is invalid`);
  return id;
}

export function fixtureObject(
  root: Readonly<Record<string, unknown>>,
  path: readonly string[],
  label: string
): PlainJsonObject {
  let value: unknown = root;
  for (const key of path) value = runtimeObject(value, label)[key];
  return runtimeObject(value, label);
}

export function fixtureString(
  root: Readonly<Record<string, unknown>>,
  path: readonly string[],
  label: string
): string {
  let value: unknown = root;
  for (const key of path) value = runtimeObject(value, label)[key];
  return runtimeString(value, label);
}

export function capture(captures: ReadonlyMap<string, string>, name: string, label = name): string {
  return runtimeString(captures.get(name), `TASK-540 ${label} capture`, 2_048);
}

export function canonicalTask540Value(value: PlainJsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalTask540Value(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalTask540Value((value as PlainJsonObject)[key] as PlainJsonValue)}`
    )
    .join(",")}}`;
}

export function task540Sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function runtimeSafeProjection(
  observation: PlainJsonValue,
  captureBindings: Readonly<Record<string, string>> = Object.freeze({})
): PlainJsonObject {
  return Object.freeze({
    captureBindings: Object.freeze({ ...captureBindings }),
    observationSha256: task540Sha256(canonicalTask540Value(observation)),
  });
}

export function deepJsonEqual(left: PlainJsonValue, right: PlainJsonValue): boolean {
  return canonicalTask540Value(left) === canonicalTask540Value(right);
}

export function assertRecordFields(
  value: unknown,
  expected: Readonly<Record<string, PlainJsonValue>>,
  label: string
): PlainJsonObject {
  const record = runtimeObject(value, label);
  for (const [key, expectedValue] of Object.entries(expected)) {
    runtimeInvariant(
      deepJsonEqual(record[key] as PlainJsonValue, expectedValue),
      `${label} ${key} drifted`
    );
  }
  return record;
}

export function resolveTask540Captures(
  value: PlainJsonValue,
  captures: ReadonlyMap<string, string>
): PlainJsonValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => resolveTask540Captures(item, captures)));
  }
  if (!isPlainObject(value)) return value;
  if (Object.keys(value).length === 1 && typeof value.capture === "string") {
    return capture(captures, value.capture, value.capture);
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        resolveTask540Captures(nested as PlainJsonValue, captures),
      ])
    )
  ) as PlainJsonObject;
}

export function contentSchemaFromFields(fieldsValue: unknown): PlainJsonObject {
  runtimeInvariant(Array.isArray(fieldsValue), "TASK-540 content fields are invalid");
  const properties: Record<string, PlainJsonValue> = {};
  for (const [order, fieldValue] of fieldsValue.entries()) {
    const field = runtimeObject(fieldValue, "TASK-540 content field");
    const name = runtimeString(field.name, "TASK-540 content field name", 128);
    const label = runtimeString(field.label, "TASK-540 content field label", 256);
    const type = runtimeString(field.type, "TASK-540 content field type", 32);
    const common = { title: label, xFieldType: type };
    if (type === "relation") {
      const relation = runtimeObject(field.relation, "TASK-540 relation field");
      const multiple = relation.multiple === true;
      const target = runtimeString(relation.target, "TASK-540 relation target", 256);
      properties[name] = Object.freeze({
        type: multiple ? "array" : "string",
        ...(multiple ? { items: Object.freeze({ type: "string" }) } : {}),
        ...common,
        xRelationTarget: target,
        xFieldConfig: Object.freeze({
          relation: Object.freeze({ target, ...(multiple ? { multiple: true } : {}) }),
          order,
        }),
      });
    } else if (type === "media") {
      const media = runtimeObject(field.media, "TASK-540 media field");
      const multiple = media.multiple === true;
      const accept = Array.isArray(media.accept) ? Object.freeze([...media.accept]) : undefined;
      properties[name] = Object.freeze({
        type: multiple ? "array" : "string",
        ...(multiple ? { items: Object.freeze({ type: "string" }) } : {}),
        ...common,
        xFieldConfig: Object.freeze({
          media: Object.freeze({
            ...(multiple ? { multiple: true } : {}),
            ...(accept === undefined || accept.length === 0 ? {} : { accept }),
          }),
          order,
        }),
      });
    } else {
      properties[name] = Object.freeze({
        type: "string",
        ...common,
        xFieldConfig: Object.freeze({ order }),
      });
    }
  }
  return Object.freeze({
    type: "object",
    additionalProperties: false,
    properties: Object.freeze(properties),
  });
}
