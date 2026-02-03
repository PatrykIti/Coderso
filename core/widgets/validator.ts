import Ajv, { type ValidateFunction } from "ajv";

import { getWidget } from "./registry";
import type { WidgetBlock, WidgetDefinition } from "./types";

const ajv = new Ajv({ allErrors: true, strict: true });
const validators = new Map<string, ValidateFunction>();

function getValidator(def: WidgetDefinition<any>) {
  const cached = validators.get(def.type);
  if (cached) return cached;
  const compiled = ajv.compile(def.schema);
  validators.set(def.type, compiled);
  return compiled;
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function normalizeWidgetBlock(block: WidgetBlock): WidgetBlock {
  const def = getWidget(block.type);
  if (!def) throw new Error("widget_unknown_type");

  const variant = block.variant ?? def.variants[0]?.id;
  if (!variant || !def.variants.some((item) => item.id === variant)) {
    throw new Error("widget_invalid_variant");
  }

  const data = ensureObject(block.data);
  const merged = { ...def.defaults, ...data } as Record<string, unknown>;

  const validate = getValidator(def);
  const valid = validate(merged);
  if (!valid) {
    throw new Error("widget_schema_invalid");
  }

  const children = Array.isArray(block.children) ? block.children : undefined;

  return {
    ...block,
    variant,
    data: merged,
    children,
  };
}

export function normalizeWidgetBlocks(blocks: WidgetBlock[]): WidgetBlock[] {
  return blocks.map((block) => {
    const normalized = normalizeWidgetBlock(block);
    return {
      ...normalized,
      children: Array.isArray(block.children)
        ? normalizeWidgetBlocks(block.children)
        : normalized.children,
    };
  });
}

export function clearWidgetValidators() {
  validators.clear();
}
