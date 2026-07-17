import { Input } from "@/components/ui/input";
import {
  SCREEN_SECTION_COLUMN_GAP_CLAMP,
  type ScreenSectionStyleV1,
  type ScreenSectionV1,
} from "../../../services/customScreens/customScreenSchemas";
import { EnumRow, InspectorRow } from "./ScreenBlockInspectorControls";
import {
  buildSectionLayoutPatch,
  SCREEN_SECTION_COLUMNS_DEFAULT_OPTION,
  type ScreenSectionStyleEdit,
} from "./screenBlockInspectorModel";

// Values remain raw presets for loss-free round trips; labels describe their
// fractional column intent to authors.
const screenSectionColumnOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: SCREEN_SECTION_COLUMNS_DEFAULT_OPTION, label: "Stacked (default)" },
  { value: "1", label: "1 column" },
  { value: "2", label: "2 equal" },
  { value: "3", label: "3 equal" },
  { value: "4", label: "4 equal" },
  { value: "1-1", label: "2 · equal (1:1)" },
  { value: "1-2", label: "2 · 1:2" },
  { value: "2-1", label: "2 · 2:1" },
  { value: "1-3", label: "2 · 1:3 (¼ · ¾)" },
  { value: "3-1", label: "2 · 3:1 (¾ · ¼)" },
  { value: "2-3", label: "2 · 2:3" },
  { value: "3-2", label: "2 · 3:2" },
  { value: "1-1-1", label: "3 · equal" },
  { value: "1-1-1-1", label: "4 · equal" },
];

/** Section-only layout editor. Unset state remains byte-stable until a change. */
export function ScreenSectionInspector({
  section,
  onPatchSection,
}: {
  section: ScreenSectionV1 | null;
  onPatchSection: (patch: { style?: ScreenSectionStyleV1 | undefined }) => void;
}) {
  if (!section) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a section on the canvas to edit its column layout.
      </div>
    );
  }
  const commitLayout = (edit: ScreenSectionStyleEdit) =>
    onPatchSection({ style: buildSectionLayoutPatch(section.style, edit) });

  return (
    <div className="flex flex-col gap-4" data-screen-section-layout-group="true">
      <EnumRow
        label="Columns"
        value={section.style?.columns ?? SCREEN_SECTION_COLUMNS_DEFAULT_OPTION}
        options={screenSectionColumnOptions}
        onChange={(value) => commitLayout({ kind: "columns", value })}
      />
      <InspectorRow label="Column gap (px)">
        <Input
          type="number"
          inputMode="numeric"
          min={SCREEN_SECTION_COLUMN_GAP_CLAMP.min}
          max={SCREEN_SECTION_COLUMN_GAP_CLAMP.max}
          value={section.style?.columnGap ?? ""}
          placeholder="16"
          data-screen-section-gap="true"
          // Gap only takes visible effect once columns is set. Authoring it
          // while stacked is harmless, so the control remains enabled.
          onChange={(event) => commitLayout({ kind: "columnGap", value: event.target.value })}
        />
      </InspectorRow>
      <p className="text-xs text-muted-foreground">
        Blocks flow left-to-right into the columns in canvas order. Pick “Stacked” to return to a
        single vertical column.
      </p>
    </div>
  );
}
