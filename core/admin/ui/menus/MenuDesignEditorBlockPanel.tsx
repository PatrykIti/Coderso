/**
 * MenuDesignEditorBlockPanel - per-block panel chrome of the Menu Design
 * editor (TASK-542-03-L03 line-gate split). Owns the header (title +
 * move/remove), the per-device visibility override, and the flat desktop
 * leaf visibility toggle, then delegates the authored block fields to
 * `MenuBlockFields` (MenuDesignEditorBlockFields.tsx).
 */

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  clearMenuBlockVisibilityOverride,
  resolveMenuBlockVisibleForDevice,
  setMenuBlockVisibleForDevice,
  type MenuBlockV2,
  type MenuDocumentV2,
} from "../../../services/menus/menuDocumentV2";
import type { PageBreakpoint } from "../../../services/pages/pageDocumentV2";
import { type PageEditorColorSwatch } from "../../../services/pages/pageEditorControlUiModel";
import { ToggleSwitch } from "../pages/editorControls";

import {
  MENU_BLOCK_LABELS,
  DEVICE_LABELS,
  isMenuOverrideDevice,
  MenuResponsiveControlShell,
} from "./MenuDesignEditorControls";
import { MenuBlockFields } from "./MenuDesignEditorBlockFields";
import type { UpdateDoc } from "./MenuDesignEditorBarPanel";

export function MenuBlockPanel({
  block,
  doc,
  device,
  palette,
  siteName,
  updateDoc,
  onRemove,
  onMove,
  navLevel,
  onNavLevelChange,
}: {
  block: MenuBlockV2;
  doc: MenuDocumentV2;
  device: PageBreakpoint;
  /** Site-resolved swatch palette so preset swatches preview their REAL colors. */
  palette: readonly PageEditorColorSwatch[];
  /** Site name for the brand-text placeholder (the default the front renders). */
  siteName: string | null;
  updateDoc: UpdateDoc;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  /** TASK-504-04 §4: the selected nesting level (0 = nav base; 1/2 = levelStyles).
   * Owned by the top-level component so the canvas force-open stays in sync. */
  navLevel: 0 | 1 | 2;
  onNavLevelChange: (level: 0 | 1 | 2) => void;
}) {
  const visibleOnDevice = resolveMenuBlockVisibleForDevice(block, device);
  const visibilityOverride =
    isMenuOverrideDevice(device) && block.responsive?.[device]?.visibility !== undefined;
  const deviceLabelLower = DEVICE_LABELS[device].toLowerCase();

  return (
    <div className="flex flex-col gap-4" data-menu-block-panel={block.type}>
      <div className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {MENU_BLOCK_LABELS[block.type]}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move block up"
          onClick={() => onMove("up")}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move block down"
          onClick={() => onMove("down")}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove block"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isMenuOverrideDevice(device) ? (
        // Tablet AND Mobile: EVERY block type gets a per-device visibility
        // override toggle (writes the sparse block responsive record).
        <MenuResponsiveControlShell
          device={device}
          override={visibilityOverride}
          label={`Visible on ${deviceLabelLower}`}
          onReset={() =>
            updateDoc((current) => clearMenuBlockVisibilityOverride(current, block.id, device))
          }
        >
          <ToggleSwitch
            label={`Visible on ${deviceLabelLower}`}
            value={visibleOnDevice}
            onChange={(next) =>
              updateDoc((current) => setMenuBlockVisibleForDevice(current, block.id, device, next))
            }
          />
        </MenuResponsiveControlShell>
      ) : block.type === "cta-button" || block.type === "divider" || block.type === "spacer" ? (
        // Desktop only: LEAF blocks get the FLAT visibility toggle (native blocks
        // carry no flat visibility slot by schema). The inlined three-type check
        // mirrors the module-private MENU_LEAF_BLOCK_TYPES; a vitest divergence
        // guard pins the lists against schema drift. Composable with a device
        // override: flat visible:false + tablet/mobile override true =
        // "show only on tablet/mobile".
        <ToggleSwitch
          label="Visible"
          value={block.visibility?.visible ?? true}
          onChange={(next) =>
            updateDoc((current) => setMenuBlockVisibleForDevice(current, block.id, device, next))
          }
        />
      ) : null}

      <MenuBlockFields
        block={block}
        doc={doc}
        device={device}
        palette={palette}
        siteName={siteName}
        updateDoc={updateDoc}
        navLevel={navLevel}
        onNavLevelChange={onNavLevelChange}
      />
    </div>
  );
}
