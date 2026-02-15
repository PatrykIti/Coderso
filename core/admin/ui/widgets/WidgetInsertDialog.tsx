import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getPageCached } from "@/services/pagesClient";
import { getWidgetTemplateCached } from "@/services/widgetTemplatesClient";
import type { Block } from "@/ui/pages/builder/types";
import { findBlockById } from "@/ui/pages/builder/blockUtils";
import { listRegisteredWidgets } from "@/ui/widgets/registry";

import type { WidgetItem } from "./types";
import { buildSlotOptions, mapWidgetBlockOptions } from "./widgetInsertUtils";

export type WidgetInsertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget?: WidgetItem | null;
  preview?: React.ReactNode;
  pages?: { id: string; title: string }[];
  templates?: { id: string; name: string }[];
  onInsert?: (payload: {
    placement: "new" | "inside";
    targetType?: "page" | "template";
    targetId?: string | null;
    blockId?: string | null;
    slotId?: string | null;
  }) => void;
};

type PlacementOption = "new" | "inside";
type WidgetInsertPayload = Parameters<
  NonNullable<WidgetInsertDialogProps["onInsert"]>
>[0];
const NO_PAGES_VALUE = "no-pages";
const NO_TEMPLATES_VALUE = "no-templates";
const NO_BLOCKS_VALUE = "no-blocks";

export function WidgetInsertDialog({
  open,
  onOpenChange,
  widget,
  preview,
  pages,
  templates,
  onInsert,
}: WidgetInsertDialogProps) {
  const pageOptions = useMemo(() => pages ?? [], [pages]);
  const templateOptions = useMemo(() => templates ?? [], [templates]);
  const widgetMetaMap = useMemo(
    () =>
      new Map(
        listRegisteredWidgets().map((item) => [
          item.type,
          {
            label: item.title,
            canHaveChildren: item.canHaveChildren ?? false,
            slots: item.slots ?? [],
          },
        ])
      ),
    []
  );
  const [pageId, setPageId] = useState<string>(() => pageOptions[0]?.id ?? "");
  const [placement, setPlacement] = useState<PlacementOption>("new");
  const [targetType, setTargetType] = useState<"page" | "template">("page");
  const [targetId, setTargetId] = useState<string>("");
  const [blockId, setBlockId] = useState<string>("");
  const [slotId, setSlotId] = useState<string>("");
  const [blocks, setBlocks] = useState<
    Array<{ id: string; label: string; type: string; depth: number }>
  >([]);
  const [blockTree, setBlockTree] = useState<Block[]>([]);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const resolvedPageId = pageId || pageOptions[0]?.id || "";
  const selectedBlock = blocks.find((block) => block.id === blockId) ?? null;
  const selectedBlockData = useMemo(
    () => findBlockById(blockTree, blockId),
    [blockTree, blockId]
  );
  const selectedBlockMeta = selectedBlockData
    ? widgetMetaMap.get(selectedBlockData.type)
    : null;
  const slotOptions = useMemo(() => {
    if (!selectedBlockData || !selectedBlockMeta?.slots?.length) return [];
    return buildSlotOptions(selectedBlockMeta.slots, selectedBlockData, widget?.id);
  }, [selectedBlockData, selectedBlockMeta, widget?.id]);
  const selectedSlot = slotOptions.find((slot) => slot.id === slotId) ?? null;
  const supportsLegacyChildren = selectedBlockMeta?.canHaveChildren ?? false;
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setPageId(pageOptions[0]?.id ?? "");
      setPlacement("new");
      setTargetType("page");
      setTargetId("");
      setBlockId("");
      setSlotId("");
      setBlocks([]);
      setBlockTree([]);
      setBlocksError(null);
    }
    onOpenChange(nextOpen);
  };

  const canSubmit =
    placement === "new"
      ? Boolean(resolvedPageId)
      : Boolean(
          targetId &&
            blockId &&
            (slotOptions.length === 0 ||
              (selectedSlot && !selectedSlot.disabled))
        );

  useEffect(() => {
    if (placement !== "inside") return;
    const options = targetType === "page" ? pageOptions : templateOptions;
    if (targetId || options.length === 0) return;
    setTargetId(options[0]?.id ?? "");
  }, [placement, targetType, pageOptions, templateOptions, targetId]);

  useEffect(() => {
    if (placement !== "inside" || !targetId) {
      setBlocks([]);
      setBlockId("");
      setSlotId("");
      setBlockTree([]);
      return;
    }
    let active = true;
    setBlocksLoading(true);
    setBlocksError(null);
    const loadBlocks = async () => {
      try {
        if (targetType === "template") {
          const template = await getWidgetTemplateCached(targetId, { force: true });
          const items = Array.isArray(template.blocks) ? template.blocks : [];
          const mapped = mapWidgetBlockOptions(items, (type) =>
            widgetMetaMap.get(type)?.label ?? type
          );
          if (!active) return;
          setBlocks(mapped);
          setBlockTree(items as Block[]);
          setBlockId(mapped[0]?.id ?? "");
        } else {
          const page = await getPageCached(targetId, { force: true });
          const data = (page.currentData ?? {}) as Record<string, unknown>;
          const items = Array.isArray(data.blocks) ? (data.blocks as unknown[]) : [];
          const mapped = mapWidgetBlockOptions(items, (type) =>
            widgetMetaMap.get(type)?.label ?? type
          );
          if (!active) return;
          setBlocks(mapped);
          setBlockTree(items as Block[]);
          setBlockId(mapped[0]?.id ?? "");
        }
      } catch {
        if (!active) return;
        setBlocksError("Failed to load blocks.");
        setBlocks([]);
        setBlockId("");
        setBlockTree([]);
      } finally {
        if (active) {
          setBlocksLoading(false);
        }
      }
    };
    void loadBlocks();
    return () => {
      active = false;
    };
  }, [placement, targetId, targetType, widgetMetaMap]);

  useEffect(() => {
    if (slotOptions.length === 0) {
      setSlotId("");
      return;
    }
    if (selectedSlot && !selectedSlot.disabled) return;
    const firstAvailable = slotOptions.find((slot) => !slot.disabled);
    setSlotId(firstAvailable?.id ?? slotOptions[0]?.id ?? "");
  }, [slotOptions, selectedSlot]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Insert Widget</DialogTitle>
            <DialogDescription>
              Choose where this widget should be inserted.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close insert widget dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-6 px-6 py-6">
          <div className="flex gap-4 rounded-xl border bg-muted/30 p-3">
            <div className="h-20 w-28 overflow-hidden rounded-lg border bg-muted/40">
              <div className="h-full w-full">{preview}</div>
            </div>
            <div className="flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {widget?.name ?? "Selected widget"}
                </span>
                {widget?.categoryLabel ? (
                  <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    {widget.categoryLabel}
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Insert this widget into a layout.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Placement
            </label>
            <div className="space-y-2">
              {([
                {
                  id: "new",
                  title: "Insert as new section",
                  description: "Adds at the bottom of the page layout",
                },
                {
                  id: "inside",
                  title: "Insert into existing block",
                  description: "Pick a specific container inside the layout",
                },
              ] as const).map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                    placement === option.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/70 bg-muted/20 hover:border-primary/30"
                  )}
                >
                  <input
                    type="radio"
                    name="widget-placement"
                    checked={placement === option.id}
                    onChange={() => setPlacement(option.id)}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      {option.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {placement === "new" ? (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Target page
              </label>
              <Select
                value={resolvedPageId}
                onValueChange={(value) => setPageId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {pageOptions.length === 0 ? (
                    <SelectItem value={NO_PAGES_VALUE} disabled>
                      No pages available
                    </SelectItem>
                  ) : (
                    pageOptions.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {placement === "inside" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Target type
                </label>
                <Select
                  value={targetType}
                  onValueChange={(value) => {
                    setTargetType(value as "page" | "template");
                    setTargetId("");
                    setBlockId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="page">Page</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {targetType === "template" ? "Target template" : "Target page"}
                </label>
                <Select
                  value={targetId}
                  onValueChange={(value) => setTargetId(value)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        targetType === "template"
                          ? "Select a template"
                          : "Select a page"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {targetType === "template" ? (
                      templateOptions.length === 0 ? (
                        <SelectItem value={NO_TEMPLATES_VALUE} disabled>
                          No templates available
                        </SelectItem>
                      ) : (
                        templateOptions.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))
                      )
                    ) : pageOptions.length === 0 ? (
                      <SelectItem value={NO_PAGES_VALUE} disabled>
                        No pages available
                      </SelectItem>
                    ) : (
                      pageOptions.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Existing block
                </label>
                <Select
                  value={blockId}
                  onValueChange={(value) => setBlockId(value)}
                  disabled={blocksLoading || blocks.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        blocksLoading
                          ? "Loading blocks..."
                          : blocks.length === 0
                            ? "No blocks available"
                            : "Select a block"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.length === 0 ? (
                      <SelectItem value={NO_BLOCKS_VALUE} disabled>
                        No blocks available
                      </SelectItem>
                    ) : (
                      blocks.map((block) => (
                        <SelectItem key={block.id} value={block.id}>
                          {block.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {blocksError ? (
                  <p className="text-xs text-destructive">{blocksError}</p>
                ) : null}
                {slotOptions.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Target slot
                    </label>
                    <Select value={slotId} onValueChange={(value) => setSlotId(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {slotOptions.map((slot) => {
                          const countLabel =
                            typeof slot.maxItems === "number"
                              ? ` (${slot.count}/${slot.maxItems})`
                              : ` (${slot.count})`;
                          return (
                            <SelectItem
                              key={slot.id}
                              value={slot.id}
                              disabled={slot.disabled}
                            >
                              {slot.label}
                              {countLabel}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedSlot?.reason ? (
                      <p className="text-xs text-destructive">
                        {selectedSlot.reason}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {selectedBlock ? (
                  <div className="rounded-lg border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                    {slotOptions.length > 0
                      ? "This widget will be inserted into the selected slot."
                      : supportsLegacyChildren
                        ? "This widget will be nested inside the selected block."
                        : "This block does not support nesting, so the widget will be inserted after it."}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              const payload: WidgetInsertPayload =
                placement === "new"
                  ? {
                      placement: "new",
                      targetType: "page",
                      targetId: resolvedPageId,
                    }
                  : {
                      placement: "inside",
                      targetType,
                      targetId,
                      blockId,
                      slotId: slotOptions.length > 0 ? slotId : undefined,
                    };
              onInsert?.(payload);
              handleOpenChange(false);
            }}
          >
            Insert Widget
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
