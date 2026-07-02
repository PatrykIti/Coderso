import {
  AlignLeft,
  BarChart3,
  Braces,
  Columns3,
  Image as ImageIcon,
  Layers,
  LayoutPanelTop,
  List,
  Minus,
  PanelTop,
  Square,
  Type,
} from "lucide-react";
import type { ComponentType } from "react";

import type { ContentField } from "../content-types/SchemaBuilder";
import type { ScreenBlockKind } from "../../../services/customScreens/screenDocumentOps";

type ScreenBlockLibraryProps = {
  fields: ContentField[];
  onAddBlock: (type: ScreenBlockKind, field?: ContentField) => void;
};

/**
 * TASK-498-01 A1: the ported prototype palette chip
 * (`_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx:147-157`). The
 * prototype's chip has no real-admin equivalent, so this is a small LOCAL chip.
 * It MUST be named `PaletteChip` — the editor-surface dead-code guard
 * (`tests/vitest/ui/editor-surface-dead-code.test.ts`) asserts the retired
 * prototype chip symbol appears nowhere under `core/`, so no other name is valid.
 */
function PaletteChip({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:text-muted-foreground"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// TASK-500-01: one canonical KIND vocabulary sourced from this module. The two
// SURFACES stay distinct — the VISIBLE chip grid renders EXACTLY the prototype's
// 9 chips, while the container/composite kinds ride the searchable command
// palette only (SCREEN_CANONICAL_KINDS = the composition of both).
export type ScreenPaletteChip = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  kind: ScreenBlockKind;
};

// The prototype's 9 VISIBLE chips (prototype order + icons, grid-cols-3 —
// CustomScreenEditorPreview.tsx:234-246). This is EXACTLY what the chip grid
// renders; do NOT add chips here (the grid must not grow to 13). A field/bound
// block is inserted by its chip and its specific bound field is chosen afterward
// via the Inspect inspector's Bound-field control (no per-field palette list).
export const SCREEN_PALETTE_CHIPS: readonly ScreenPaletteChip[] = [
  { label: "Heading", icon: Type, kind: "heading" },
  { label: "Text", icon: AlignLeft, kind: "text" },
  { label: "Field", icon: Braces, kind: "field" },
  { label: "Stat", icon: BarChart3, kind: "stat" },
  { label: "Divider", icon: Minus, kind: "divider" },
  { label: "Image", icon: ImageIcon, kind: "image" },
  { label: "Related list", icon: List, kind: "related-list" },
  { label: "Tabs", icon: Columns3, kind: "tabs" },
  { label: "Button", icon: Square, kind: "button" },
];

// Container/composite kinds the command palette is the SOLE creation surface for
// today. They are NOT visible chips (adding them would grow the grid to 13 and
// depart from the canonical 9-chip prototype look); they surface ONLY through the
// searchable command palette so field-group/columns stay creatable for
// TASK-500-02's nesting (record-header/rich-text are real createScreenBlock kinds).
export const SCREEN_PALETTE_COMMANDS: readonly ScreenPaletteChip[] = [
  { label: "Record header", icon: PanelTop, kind: "record-header" },
  { label: "Field group", icon: Layers, kind: "field-group" },
  { label: "Two columns", icon: LayoutPanelTop, kind: "columns" },
  { label: "Help text", icon: Type, kind: "rich-text" },
];

// Full canonical KIND vocabulary = single source of truth for the command palette.
// The grid reads SCREEN_PALETTE_CHIPS (the 9); the palette reads this full set.
export const SCREEN_CANONICAL_KINDS: readonly ScreenPaletteChip[] = [
  ...SCREEN_PALETTE_CHIPS,
  ...SCREEN_PALETTE_COMMANDS,
];

// The chip grid is UNCHANGED — still exactly the prototype's 9.
const PALETTE_CHIPS = SCREEN_PALETTE_CHIPS;

export function ScreenBlockLibrary({ onAddBlock }: ScreenBlockLibraryProps) {
  return (
    <div className="flex h-full flex-col" data-screen-block-library="true">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">Screen Blocks</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Add block</div>
        <div className="grid grid-cols-3 gap-1.5">
          {PALETTE_CHIPS.map((chip) => (
            <PaletteChip
              key={chip.label}
              icon={chip.icon}
              label={chip.label}
              onClick={() => onAddBlock(chip.kind)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
