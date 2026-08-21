import { isRecord, type RecordValue } from "./pageDocumentV2Normalization";

/**
 * Non-destructive legacy adapter (TASK-459-02, frozen TASK-459-01 decision):
 * assistant blueprints historically attached `mode: "filters"` plus the
 * filter-surface props to a COLLECTION block. Those payloads now normalize
 * into a filters + collection pair: the dedicated filters block owns the
 * facet controls, while the original collection block keeps rendering the
 * linked results. Collection blocks WITHOUT `mode: "filters"` are untouched,
 * so existing documents render byte-identically.
 *
 * Extracted from pageBlockNormalizerV2 so the block normalizer stays within
 * the repository physical line limit.
 */

const legacyFiltersCollectionFilterPropKeys = [
  "queryId",
  "facets",
  "aliases",
  "layout",
  "autoApply",
  "showSearch",
  "showCount",
  "searchLabel",
  "searchPlaceholder",
  "applyLabel",
] as const;

const legacyFiltersCollectionStripPropKeys = new Set<string>([
  "mode",
  ...legacyFiltersCollectionFilterPropKeys.filter((key) => key !== "queryId"),
]);

export const expandLegacyFiltersCollectionBlock = (value: unknown): unknown[] => {
  if (!isRecord(value) || value.type !== "collection" || !isRecord(value.props)) return [value];
  if (value.props.mode !== "filters") return [value];
  const legacy = value.props;
  const props: RecordValue = {};
  for (const key of legacyFiltersCollectionFilterPropKeys) {
    if (legacy[key] !== undefined) props[key] = legacy[key];
  }
  const collectionProps = Object.fromEntries(
    Object.entries(legacy).filter(([key]) => !legacyFiltersCollectionStripPropKeys.has(key))
  );
  const sourceId = typeof value.id === "string" ? value.id.trim() : "";
  const filtersId = sourceId ? `${sourceId}_filters` : undefined;
  const filtersBlock = {
    ...value,
    ...(filtersId ? { id: filtersId } : {}),
    type: "filters",
    props,
  };
  const collectionBlock = {
    ...value,
    props: collectionProps,
  };
  return [filtersBlock, collectionBlock];
};
