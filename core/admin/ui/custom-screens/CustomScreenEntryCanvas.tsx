import type { EntryDataValue } from "@/services/entriesClient";

import type {
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import type { ScreenEntryPresentationOverrideDraft } from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import type { RelatedEntrySummary } from "../../../services/customScreens/relatedEntryResolver";
import type { ContentField } from "../content-types/SchemaBuilder";
import { ScreenRuntimeRenderer } from "./ScreenRuntimeRenderer";

type CustomScreenEntryCanvasProps = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  fieldValues: Record<string, unknown>;
  fieldErrors: Record<string, string>;
  presentationOverrides?: ScreenEntryPresentationOverrideDraft[];
  presentationMediaUrlsById?: Readonly<Record<string, string>>;
  fields: ContentField[];
  relationTargets: Array<{ slug: string; name: string }>;
  // TASK-498-03: host-precomputed related entries (forward-only — the owner
  // CustomScreenEntryEditor resolves + passes this in).
  relatedEntries?: Record<string, RelatedEntrySummary[]>;
  onFieldChange: (field: string, value: EntryDataValue) => void;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  // TASK-503-03: entry-view badge gating (per-user preference, default off).
  showFieldMetadata?: boolean;
};

export function CustomScreenEntryCanvas({
  document,
  bindings,
  fieldValues,
  fieldErrors,
  presentationOverrides,
  presentationMediaUrlsById,
  fields,
  relationTargets,
  relatedEntries,
  onFieldChange,
  onTitleChange,
  onSlugChange,
  selectedBlockId,
  onSelectBlock,
  showFieldMetadata,
}: CustomScreenEntryCanvasProps) {
  return (
    <ScreenRuntimeRenderer
      document={document}
      bindings={bindings}
      values={fieldValues}
      fields={fields}
      fieldErrors={fieldErrors}
      presentationOverrides={presentationOverrides}
      presentationMediaUrlsById={presentationMediaUrlsById}
      relationTargets={relationTargets}
      relatedEntries={relatedEntries}
      mode="entry"
      selectedBlockId={selectedBlockId}
      onSelectBlock={onSelectBlock}
      showFieldMetadata={showFieldMetadata}
      onFieldChange={onFieldChange}
      onTitleChange={onTitleChange}
      onSlugChange={onSlugChange}
      enableInlineFieldEditing
      emptyMessage="Add screen blocks in the builder to compose this record editor."
    />
  );
}
