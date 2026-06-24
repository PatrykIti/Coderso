import type {
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import type { ContentField } from "../content-types/SchemaBuilder";
import { ScreenRuntimeRenderer } from "./ScreenRuntimeRenderer";

type CustomScreenEntryCanvasProps = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  fieldValues: Record<string, unknown>;
  fieldErrors: Record<string, string>;
  fields: ContentField[];
  relationTargets: Array<{ slug: string; name: string }>;
  onFieldChange: (field: string, value: unknown) => void;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
};

export function CustomScreenEntryCanvas({
  document,
  bindings,
  fieldValues,
  fieldErrors,
  fields,
  relationTargets,
  onFieldChange,
  onTitleChange,
  onSlugChange,
  selectedBlockId,
  onSelectBlock,
}: CustomScreenEntryCanvasProps) {
  return (
    <ScreenRuntimeRenderer
      document={document}
      bindings={bindings}
      values={fieldValues}
      fields={fields}
      fieldErrors={fieldErrors}
      relationTargets={relationTargets}
      mode="entry"
      selectedBlockId={selectedBlockId}
      onSelectBlock={onSelectBlock}
      onFieldChange={onFieldChange}
      onTitleChange={onTitleChange}
      onSlugChange={onSlugChange}
      enableInlineFieldEditing
      emptyMessage="Add screen blocks in the builder to compose this record editor."
    />
  );
}
