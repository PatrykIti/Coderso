import {
  normalizeCustomScreenBindings,
  type CustomScreenBinding,
  type CustomScreenBindingMode,
} from "../../customScreens/customScreenSchemas";

export type BlueprintBindingContribution = {
  id: string;
  widgetId: string;
  propPath: string;
  field: string;
  mode?: CustomScreenBindingMode | null;
};

export type BlueprintBindingCompositionInput = {
  contentSchema?: Record<string, unknown> | null;
  allowedFields?: string[];
  bindings: BlueprintBindingContribution[];
};

const stableKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safePathPattern = /^[a-zA-Z0-9_.-]+$/;
const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);
const secretLikePattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;
const bindingModes = new Set<CustomScreenBindingMode>(["read", "write", "readwrite"]);

const fail = (code = "assistant_blueprint_binding_invalid"): never => {
  throw new Error(code);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normalizeStableId = (value: unknown) => {
  const explicit = normalizeText(value) ?? fail();
  const id = slugify(explicit);
  if (!id || !stableKeyPattern.test(id)) fail();
  return id;
};

const normalizePath = (value: unknown) => {
  const path = normalizeText(value) ?? fail();
  if (!safePathPattern.test(path)) fail();
  const segments = path.split(".");
  if (segments.some((segment) => !segment || unsafePathSegments.has(segment))) fail();
  return path;
};

const extractSchemaFields = (schema: Record<string, unknown> | null | undefined) => {
  const properties = isRecord(schema?.properties) ? schema.properties : null;
  return properties ? Object.keys(properties) : [];
};

const assertKnownField = (field: string, knownFields: Set<string>) => {
  if (knownFields.size === 0) return;
  const root = field.split(".")[0] ?? field;
  if (!knownFields.has(root)) fail("assistant_blueprint_binding_field_missing");
};

const assertNoSecretBinding = (binding: { field: string; propPath: string }) => {
  if (secretLikePattern.test(binding.field) || secretLikePattern.test(binding.propPath)) {
    fail("assistant_blueprint_binding_secret_field");
  }
};

const bindingsEqual = (left: CustomScreenBinding, right: CustomScreenBinding) =>
  left.widgetId === right.widgetId &&
  left.propPath === right.propPath &&
  left.field === right.field &&
  left.mode === right.mode;

export const composeBindings = (input: BlueprintBindingCompositionInput): CustomScreenBinding[] => {
  const knownFields = new Set([
    ...extractSchemaFields(input.contentSchema),
    ...(input.allowedFields ?? []),
  ]);
  const byId = new Map<string, CustomScreenBinding>();

  for (const binding of input.bindings) {
    const widgetId = normalizePath(binding.widgetId);
    const propPath = normalizePath(binding.propPath);
    const field = normalizePath(binding.field);
    const mode = binding.mode ?? "readwrite";
    if (!bindingModes.has(mode)) fail();
    assertKnownField(field, knownFields);
    assertNoSecretBinding({ field, propPath });

    const id = normalizeStableId(binding.id);
    const next = { id, widgetId, propPath, field, mode };
    const existing = byId.get(id);
    if (existing) {
      if (!bindingsEqual(existing, next)) fail("assistant_blueprint_binding_duplicate_id");
      continue;
    }
    byId.set(id, next);
  }

  const normalized = Array.from(byId.values());
  return normalizeCustomScreenBindings(normalized, {
    contentType: {
      schema: {
        properties: Object.fromEntries(Array.from(knownFields).map((field) => [field, {}])),
      },
    },
  });
};
