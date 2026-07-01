import {
  AlignLeft,
  BarChart3,
  Braces,
  Columns3,
  Image as ImageIcon,
  List,
  Minus,
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

// 9 data-block chips (prototype order + icons, CustomScreenEditorPreview.tsx:234-246).
// The 9-chip grid is the SOLE insert surface — a field/bound block is inserted by its
// chip and its specific bound field is chosen afterward via the Inspect inspector's
// Bound-field control (there is no per-field palette list). TASK-498-02 extends the
// `ScreenBlockKind` set + insert wiring, so every chip is now live.
const PALETTE_CHIPS: Array<{
  label: string;
  icon: ComponentType<{ className?: string }>;
  kind: ScreenBlockKind;
}> = [
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
