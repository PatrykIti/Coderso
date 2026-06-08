import type { ContentTypeFieldAddSpec } from "../content/contentTypeSchemaFields";

export type ContentTypeFieldInferenceGate = {
  name: string;
  reason:
    | "array_field_unsupported"
    | "nested_field_unsupported"
    | "field_name_invalid"
    | "secret_like_field";
};

export type ContentTypeFieldInferenceResult = {
  fields: ContentTypeFieldAddSpec[];
  gates: ContentTypeFieldInferenceGate[];
};

const fieldPattern = /^[A-Za-z][A-Za-z0-9_-]{0,79}(\[\])?$/;
const secretLikePattern =
  /\b[\w.-]*(?:token|secret|password|api[-_]?key|credential|cookie|session|csrf|authorization|bearer)[\w.-]*\b/i;

const humanizeFieldLabel = (name: string) =>
  name
    .replace(/\[\]$/u, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeLine = (line: string) =>
  line
    .replace(/^[\s>*-]+/u, "")
    .replace(/^\d+[.)]\s*/u, "")
    .trim();

const isHeading = (line: string) => /^#{1,6}\s+/u.test(line.trim());

const isNestedLine = (line: string) =>
  /^\s+(?:[-*]\s*)?[A-Za-z][A-Za-z0-9_-]*(?:\[\])?\s*$/u.test(line);

const normalizeFieldName = (candidate: string) => candidate.replace(/\[\]$/u, "");

const includesAny = (value: string, fragments: readonly string[]) =>
  fragments.some((fragment) => value.includes(fragment));

const inferFieldType = (name: string): ContentTypeFieldAddSpec["type"] => {
  const normalized = name.toLowerCase();
  if (/^(is|has|can|show|hide|enable|enabled|active|published)_/u.test(normalized)) {
    return "boolean";
  }
  if (
    includesAny(normalized, [
      "image",
      "images",
      "gallery",
      "photo",
      "photos",
      "picture",
      "pictures",
      "pdf",
      "file",
      "files",
      "attachment",
      "attachments",
      "media",
      "thumbnail",
      "poster",
      "avatar",
      "logo",
    ])
  ) {
    return "media";
  }
  if (
    includesAny(normalized, [
      "description",
      "content",
      "copy",
      "markdown",
      "notes",
      "bio",
      "story",
      "summary",
    ]) ||
    normalized === "body" ||
    normalized.endsWith("_body")
  ) {
    return "richtext";
  }
  if (
    /(?:^|_)(count|quantity|qty|total|amount|price|cost|rate|score|rating|area|volume|height|width|depth|weight|length|size|capacity|duration|year|age|slope|spaces|rooms|beds|bedrooms|bathrooms|floors|mileage|power)(?:_|$)/u.test(
      normalized
    ) ||
    /_(m2|m3|cm|mm|km|kg|hp|usd|eur|pln)$/u.test(normalized)
  ) {
    return "number";
  }
  return "text";
};

const mediaAcceptForName = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("pdf")) return ["application/pdf"];
  if (
    includesAny(normalized, [
      "image",
      "images",
      "gallery",
      "photo",
      "photos",
      "picture",
      "thumbnail",
      "poster",
      "avatar",
      "logo",
    ])
  ) {
    return ["image/*"];
  }
  return undefined;
};

const inferNumberFormatForName = (name: string): ContentTypeFieldAddSpec["numberFormat"] => {
  const normalized = name.toLowerCase();
  if (
    /(?:^|_)(count|quantity|qty|total|year|age|spaces|rooms|beds|bedrooms|bathrooms|floors|mileage|power)(?:_|$)/u.test(
      normalized
    ) ||
    /_(km|hp)$/u.test(normalized)
  ) {
    return "integer";
  }
  return "decimal";
};

const buildFieldSpec = (rawName: string, multiple: boolean): ContentTypeFieldAddSpec | null => {
  const name = normalizeFieldName(rawName);
  if (secretLikePattern.test(name)) return null;
  const type = inferFieldType(name);
  if (multiple && type !== "media") return null;
  return {
    name,
    label: humanizeFieldLabel(name),
    type,
    ...(multiple ? { multiple: true } : {}),
    ...(type === "media" ? { mediaAccept: mediaAcceptForName(name) ?? [] } : {}),
    ...(type === "number" ? { numberFormat: inferNumberFormatForName(name) } : {}),
  };
};

export const inferContentTypeFieldAdditions = (prompt: string): ContentTypeFieldInferenceResult => {
  const fields: ContentTypeFieldAddSpec[] = [];
  const gates: ContentTypeFieldInferenceGate[] = [];
  const seen = new Set<string>();
  let nestedArrayParent: string | null = null;

  for (const originalLine of prompt.split(/\r?\n/u)) {
    if (!originalLine.trim() || isHeading(originalLine)) continue;

    if (nestedArrayParent && isNestedLine(originalLine)) {
      const child = normalizeLine(originalLine);
      gates.push({
        name: `${nestedArrayParent}.${normalizeFieldName(child)}`,
        reason: "nested_field_unsupported",
      });
      continue;
    }
    if (!isNestedLine(originalLine)) nestedArrayParent = null;

    const candidate = normalizeLine(originalLine);
    if (!candidate) continue;
    if (!fieldPattern.test(candidate)) continue;

    const name = normalizeFieldName(candidate);
    const multiple = candidate.endsWith("[]");
    if (secretLikePattern.test(name)) {
      gates.push({ name, reason: "secret_like_field" });
      continue;
    }
    if (!fieldPattern.test(candidate)) {
      gates.push({ name, reason: "field_name_invalid" });
      continue;
    }
    if (seen.has(name)) continue;

    const spec = buildFieldSpec(candidate, multiple);
    if (!spec) {
      gates.push({ name, reason: "array_field_unsupported" });
      if (multiple) nestedArrayParent = name;
      continue;
    }
    fields.push(spec);
    seen.add(name);
  }

  return { fields, gates };
};
