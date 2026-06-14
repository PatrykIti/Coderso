import { Button } from "@/components/ui/button";
import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  type PageBlockV2,
  type PageBreakpoint,
  type PageSectionV2,
} from "../../../../services/pages/pageDocumentV2";
import {
  getPageBlockAtPath,
  getPageBlockEditorSlotKeys,
  getPageBlockInsertTargetStatus,
  getPageBlockListAtPath,
  isPageBlockPathDescendant,
  isSamePageBlockPath,
  serializePageBlockPath,
  type PageBlockInsertTarget,
  type PageBlockPath,
} from "../../../../services/pages/pageBlockPaths";
import {
  hasAnyResponsiveOverride,
  readBlockBreakpointOverride,
} from "../../../../services/pages/pageEditorState";
import { formatSlotLabel, getBlockDisplayLabel } from "./pageEditorLabels";

const createLayerBlockPath = (
  ownerPath: PageBlockPath | null,
  slotKey: PageBlockPath[number]["slotKey"],
  index: number
): PageBlockPath =>
  ownerPath
    ? ([...ownerPath, { slotKey, index }] as PageBlockPath)
    : ([{ index }] as PageBlockPath);

export const LayerBlockRows = ({
  section,
  blocks,
  ownerPath,
  slotKey,
  selectedBlockPath,
  canAddBeside,
  device,
  onSelectBlock,
  onAddToTarget,
  onMoveToTarget,
  onAddBeside,
}: {
  section: PageSectionV2;
  blocks: readonly PageBlockV2[];
  ownerPath: PageBlockPath | null;
  slotKey?: PageBlockPath[number]["slotKey"];
  selectedBlockPath: PageBlockPath | null;
  canAddBeside: boolean;
  device: PageBreakpoint;
  onSelectBlock: (blockPath: PageBlockPath) => void;
  onAddToTarget: (target: PageBlockInsertTarget) => void;
  onMoveToTarget: (target: PageBlockInsertTarget) => void;
  onAddBeside: () => void;
}) => (
  <div className="space-y-1">
    {blocks.map((block, index) => {
      const blockPath = createLayerBlockPath(ownerPath, slotKey, index);
      const serializedPath = serializePageBlockPath(blockPath);
      const slotKeys = getPageBlockEditorSlotKeys(block);
      const blockSelected = isSamePageBlockPath(blockPath, selectedBlockPath);
      return (
        <div key={block.id} className="space-y-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`flex min-w-0 flex-1 items-center justify-between rounded px-2 py-1.5 text-left text-xs ${
                blockSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
              data-page-editor-layer-block-id={block.id}
              data-page-editor-layer-block-path={serializedPath}
              data-page-editor-responsive-target={
                hasAnyResponsiveOverride(device, readBlockBreakpointOverride(block, device))
                  ? "override"
                  : "inherited"
              }
              onClick={() => onSelectBlock(blockPath)}
            >
              <span className="truncate">{getBlockDisplayLabel(block)}</span>
              <span className="ml-2 shrink-0 uppercase text-muted-foreground">
                {hasAnyResponsiveOverride(device, readBlockBreakpointOverride(block, device))
                  ? `${device} `
                  : ""}
                {block.type}
              </span>
            </button>
            {blockSelected ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="shrink-0"
                title="Add block beside"
                aria-label="Add block beside"
                disabled={!canAddBeside}
                onClick={onAddBeside}
              >
                Beside
              </Button>
            ) : null}
          </div>
          {slotKeys.length > 0 ? (
            <div className="space-y-1 border-l pl-3">
              {slotKeys.map((childSlotKey) => {
                const children = block.slots?.[childSlotKey] ?? [];
                const target: PageBlockInsertTarget = {
                  listPath: { ownerPath: blockPath, slotKey: childSlotKey },
                  index: children.length,
                };
                const listResult = getPageBlockListAtPath(section, target.listPath);
                const canAdd =
                  listResult.status === "ok" &&
                  blockPath.length + 1 <= PAGE_BLOCK_MAX_TREE_DEPTH &&
                  listResult.blocks.length < PAGE_BLOCK_MAX_CHILDREN_PER_SLOT;
                const selectedBlockForMove = selectedBlockPath
                  ? getPageBlockAtPath(section, selectedBlockPath)
                  : null;
                const canMove =
                  selectedBlockPath !== null &&
                  selectedBlockForMove !== null &&
                  canAdd &&
                  getPageBlockInsertTargetStatus(section, target, selectedBlockForMove) === "ok" &&
                  !isSamePageBlockPath(selectedBlockPath, blockPath) &&
                  !(selectedBlockPath && isPageBlockPathDescendant(blockPath, selectedBlockPath));
                const slotLabel = formatSlotLabel(childSlotKey);
                return (
                  <div
                    key={`${serializedPath}:${childSlotKey}`}
                    className="space-y-1"
                    data-page-editor-layer-slot-key={childSlotKey}
                    data-page-editor-layer-slot-owner-path={serializedPath}
                  >
                    <div className="flex items-center justify-between gap-2 rounded bg-muted/60 px-2 py-1 text-[11px] uppercase text-muted-foreground">
                      <span>{slotLabel}</span>
                      <span className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          title={`Add block to ${slotLabel}`}
                          aria-label={`Add block to ${slotLabel}`}
                          disabled={!canAdd}
                          onClick={() => onAddToTarget(target)}
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          title={`Move selected block to ${slotLabel}`}
                          aria-label={`Move selected block to ${slotLabel}`}
                          disabled={!canMove}
                          onClick={() => onMoveToTarget(target)}
                        >
                          Move here
                        </Button>
                      </span>
                    </div>
                    {children.length > 0 ? (
                      <LayerBlockRows
                        section={section}
                        blocks={children}
                        ownerPath={blockPath}
                        slotKey={childSlotKey}
                        selectedBlockPath={selectedBlockPath}
                        canAddBeside={canAddBeside}
                        device={device}
                        onSelectBlock={onSelectBlock}
                        onAddToTarget={onAddToTarget}
                        onMoveToTarget={onMoveToTarget}
                        onAddBeside={onAddBeside}
                      />
                    ) : (
                      <p className="px-2 py-1 text-[11px] text-muted-foreground">Empty</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      );
    })}
  </div>
);
