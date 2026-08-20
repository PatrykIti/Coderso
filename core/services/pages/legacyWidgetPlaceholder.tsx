import type { PageBlockV2 } from "./pageDocumentV2Types";

/**
 * Maximum rendered length of the preserved v1 widget type id. The write
 * normalizer already bounds `props.legacyWidgetType` to 1..64 chars; this
 * slice is defence-in-depth for documents that bypass normalization.
 */
const LEGACY_WIDGET_TYPE_MAX_LENGTH = 64 as const;

/**
 * TASK-580-03-L01 migration-only read-only placeholder for v1 widget types
 * that have no Page V2 equivalent (converted detail-page documents only).
 *
 * Renders ONLY the preserved widget type id as a neutral dashed-border note:
 * the verbatim `props.data` is never read, rendered, or logged here — it stays
 * in the document props untouched for a future re-authoring migration (no XSS
 * surface, no secret leak). Never editor-insertable, never assistant-emittable.
 */
export function LegacyWidgetPlaceholder({ block }: { block: PageBlockV2 }) {
  const type =
    typeof block.props.legacyWidgetType === "string"
      ? block.props.legacyWidgetType.slice(0, LEGACY_WIDGET_TYPE_MAX_LENGTH)
      : "unknown";
  return (
    <div
      role="note"
      data-legacy-widget={type}
      className="rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600"
    >
      <span>Legacy widget: {type}</span>
      <span className="sr-only">
        Read-only placeholder. Contact an editor to re-author this section.
      </span>
    </div>
  );
}
