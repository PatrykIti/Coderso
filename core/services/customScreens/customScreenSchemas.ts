import type { WidgetBlock } from "../../widgets/types";
import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { normalizeWidgetBlocks } from "../../widgets/validator";

export const customScreenBindingModes = ["read", "write", "readwrite"] as const;
export const customScreenStatusValues = ["draft", "active"] as const;

export type CustomScreenBindingMode = (typeof customScreenBindingModes)[number];
export type CustomScreenStatus = (typeof customScreenStatusValues)[number];
export type CustomScreenDefinitionVersion = 1;

export type CustomScreenBinding = {
  id: string;
  widgetId: string;
  propPath: string;
  field: string;
  mode: CustomScreenBindingMode;
};

export type CustomScreenDefinition = {
  schemaVersion: CustomScreenDefinitionVersion;
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
};

export type CustomScreenSidebarConfig = {
  showInSidebar: boolean;
  sidebarLabel: string | null;
};

const supportedDefinitionVersions = new Set<CustomScreenDefinitionVersion>([1]);
const bindingModes = new Set<CustomScreenBindingMode>(customScreenBindingModes);
const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const normalizePath = (value: unknown) => {
  const text = normalizeText(value);
  if (!text || !/^[a-zA-Z0-9_.-]+$/.test(text)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const segments = text.split(".");
  if (segments.some((segment) => segment.length === 0 || unsafePathSegments.has(segment))) {
    throw new Error("custom_screen_definition_invalid");
  }
  return text;
};

const normalizeBindingMode = (value: unknown): CustomScreenBindingMode => {
  const mode = normalizeText(value) ?? "readwrite";
  if (!bindingModes.has(mode as CustomScreenBindingMode)) {
    throw new Error("custom_screen_definition_invalid");
  }
  return mode as CustomScreenBindingMode;
};

export function normalizeCustomScreenSchemaVersion(
  value: unknown
): CustomScreenDefinitionVersion {
  if (value === undefined || value === null) return 1;
  if (typeof value !== "number" || !Number.isFinite(value) || Math.floor(value) !== value) {
    throw new Error("custom_screen_definition_invalid");
  }
  if (!supportedDefinitionVersions.has(value as CustomScreenDefinitionVersion)) {
    throw new Error("custom_screen_definition_invalid");
  }
  return value as CustomScreenDefinitionVersion;
}

export function normalizeCustomScreenBlocks(value: unknown): WidgetBlock[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("custom_screen_definition_invalid");
  }
  ensureRuntimeWidgetsRegistered();
  return normalizeWidgetBlocks(value as WidgetBlock[]);
}

export function normalizeCustomScreenBindings(value: unknown): CustomScreenBinding[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("custom_screen_definition_invalid");
  }

  const normalized = value.map((item, index) => {
    if (!isRecord(item)) throw new Error("custom_screen_definition_invalid");

    const widgetId = normalizeText(item.widgetId);
    if (!widgetId) throw new Error("custom_screen_definition_invalid");

    const propPath = normalizePath(item.propPath);
    const field = normalizePath(item.field);
    const mode = normalizeBindingMode(item.mode);
    const id =
      slugify(normalizeText(item.id) ?? `${widgetId}-${propPath}`) ||
      `binding-${index + 1}`;

    return {
      id,
      widgetId,
      propPath,
      field,
      mode,
    };
  });

  const ids = new Set<string>();
  normalized.forEach((binding) => {
    if (ids.has(binding.id)) {
      throw new Error("custom_screen_definition_invalid");
    }
    ids.add(binding.id);
  });

  return normalized;
}

export function normalizeCustomScreenDefinition(
  input: {
    schemaVersion?: unknown;
    blocks?: unknown;
    bindings?: unknown;
  } = {}
): CustomScreenDefinition {
  return {
    schemaVersion: normalizeCustomScreenSchemaVersion(input.schemaVersion),
    blocks: normalizeCustomScreenBlocks(input.blocks),
    bindings: normalizeCustomScreenBindings(input.bindings),
  };
}

export function normalizeCustomScreenSidebarConfig(
  input: {
    showInSidebar?: unknown;
    sidebarLabel?: unknown;
  } = {}
): CustomScreenSidebarConfig {
  const showInSidebar = input.showInSidebar === true;
  const label = normalizeText(input.sidebarLabel);
  return {
    showInSidebar,
    sidebarLabel: label,
  };
}

export const customScreenBindingSchema = {
  type: "object",
  required: ["widgetId", "propPath", "field"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    widgetId: { type: "string", minLength: 1, maxLength: 160 },
    propPath: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    field: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    mode: { enum: customScreenBindingModes },
  },
  additionalProperties: false,
} as const;

export const customScreenDefinitionSchema = {
  type: "object",
  required: ["schemaVersion", "blocks", "bindings"],
  properties: {
    schemaVersion: { enum: [1] },
    blocks: {
      type: "array",
      maxItems: 500,
      items: { type: "object" },
    },
    bindings: {
      type: "array",
      maxItems: 200,
      items: customScreenBindingSchema,
    },
  },
  additionalProperties: false,
} as const;

export const customScreenCreateSchema = {
  type: "object",
  required: ["name", "contentTypeId"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    contentTypeId: { type: "string", minLength: 1, maxLength: 64 },
    status: { enum: customScreenStatusValues },
    showInSidebar: { type: "boolean" },
    sidebarLabel: {
      anyOf: [
        { type: "string", minLength: 1, maxLength: 160 },
        { type: "null" },
      ],
    },
    schemaVersion: { enum: [1] },
    blocks: {
      type: "array",
      maxItems: 500,
      items: { type: "object" },
    },
    bindings: {
      type: "array",
      maxItems: 200,
      items: customScreenBindingSchema,
    },
  },
  additionalProperties: false,
} as const;

export const customScreenUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    contentTypeId: { type: "string", minLength: 1, maxLength: 64 },
    status: { enum: customScreenStatusValues },
    showInSidebar: { type: "boolean" },
    sidebarLabel: {
      anyOf: [
        { type: "string", minLength: 1, maxLength: 160 },
        { type: "null" },
      ],
    },
    schemaVersion: { enum: [1] },
    blocks: {
      type: "array",
      maxItems: 500,
      items: { type: "object" },
    },
    bindings: {
      type: "array",
      maxItems: 200,
      items: customScreenBindingSchema,
    },
  },
  additionalProperties: false,
} as const;
