import { pageBlockPropKeys, type PageBlockV2 } from "../pages/pageDocumentV2";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function collectBindingPropPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectBindingPropPaths(item, prefix ? `${prefix}.${String(index)}` : String(index))
    );
  }

  if (!isRecord(value)) {
    return prefix ? [prefix] : [];
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return prefix ? [prefix] : [];
  }

  return entries.flatMap(([key, nested]) =>
    collectBindingPropPaths(nested, prefix ? `${prefix}.${key}` : key)
  );
}

/**
 * Leaf binding-prop paths for a Page V2 block (TASK-580-03-L05). The detail
 * template binding panel maps entry fields onto the value-carrying block
 * props only: text-like content, labels, titles, media sources, and hrefs.
 * Layout/visual-only keys (align, level, variant, style, ...) never appear,
 * and container/slot hosts expose no binding paths.
 */
export function collectV2BlockBindingPropPaths(block: PageBlockV2): string[] {
  const keys = pageBlockPropKeys[block.type] ?? [];
  return keys.filter((key) => ["text", "label", "title", "src", "href", "value"].includes(key));
}
