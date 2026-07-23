import { Copy, MoveDown, MoveUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  screenImageRatios,
  SCREEN_BLOCK_MIN_HEIGHT_CLAMP,
} from "../../../services/customScreens/customScreenSchemas";
import {
  BoundFieldRow,
  BoxSpacingRow,
  EnumRow,
  ImageSrcRow,
  InspectorRow,
} from "./ScreenBlockInspectorControls";
import { TabsEditor } from "./ScreenBlockInspectorTabs";
import {
  buildStylePatch,
  readScreenInspectorEnum as readEnum,
  readScreenInspectorString as readString,
  SCREEN_ALIGN_DEFAULT_OPTION,
  type ScreenBlockInspectorProps,
  type ScreenBlockStyleEdit,
} from "./screenBlockInspectorModel";

export {
  buildSectionLayoutPatch,
  buildStylePatch,
  createScreenFieldBinding,
  SCREEN_ALIGN_DEFAULT_OPTION,
  SCREEN_SECTION_COLUMNS_DEFAULT_OPTION,
} from "./screenBlockInspectorModel";
export type { ScreenBlockStyleEdit, ScreenSectionStyleEdit } from "./screenBlockInspectorModel";
export { ScreenSectionInspector } from "./ScreenBlockInspectorSection";

export function ScreenBlockInspector({
  selectedBlock,
  bindings,
  fields,
  showBlockActions = true,
  onArmSlotInsert,
  armedInsertSlotId = null,
  onPatchBlock,
  onPatchBlockData,
  onPatchBinding,
  onMove,
  onDuplicate,
  onDelete,
}: ScreenBlockInspectorProps) {
  if (!selectedBlock) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a block on the canvas to edit its shared layout and field binding.
      </div>
    );
  }

  const patchData = (patch: Record<string, unknown>) => {
    onPatchBlockData(selectedBlock.id, patch);
  };

  const commitStyle = (edit: ScreenBlockStyleEdit) => {
    onPatchBlock(selectedBlock.id, {
      style: buildStylePatch(selectedBlock.style, edit),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {showBlockActions ? (
        <div className="grid grid-cols-4 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Move selected block up"
            onClick={() => onMove(selectedBlock.id, "up")}
          >
            <MoveUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Move selected block down"
            onClick={() => onMove(selectedBlock.id, "down")}
          >
            <MoveDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Duplicate selected block"
            onClick={() => onDuplicate(selectedBlock.id)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Delete selected block"
            onClick={() => onDelete(selectedBlock.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {selectedBlock.type === "record-header" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="title"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
          />
          <InspectorRow label="Header text">
            <Input
              value={readString(selectedBlock.data.eyebrow)}
              onChange={(event) => patchData({ eyebrow: event.target.value })}
              placeholder="Eyebrow"
            />
            <Input
              value={readString(selectedBlock.data.subtitle)}
              onChange={(event) => patchData({ subtitle: event.target.value })}
              placeholder="Subtitle"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.type === "field" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="value"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
          />
          <InspectorRow label="Field presentation">
            <Input
              value={readString(selectedBlock.data.label)}
              onChange={(event) => patchData({ label: event.target.value })}
              placeholder="Label"
            />
            <Input
              value={readString(selectedBlock.data.helper)}
              onChange={(event) => patchData({ helper: event.target.value })}
              placeholder="Helper text"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.type === "field-group" ? (
        <InspectorRow label="Group presentation">
          <Input
            value={readString(selectedBlock.data.title)}
            onChange={(event) => patchData({ title: event.target.value })}
            placeholder="Group title"
          />
          <Input
            value={readString(selectedBlock.data.description)}
            onChange={(event) => patchData({ description: event.target.value })}
            placeholder="Description"
          />
        </InspectorRow>
      ) : null}

      {selectedBlock.type === "columns" ? (
        <InspectorRow label="Columns">
          <Input
            value={readString(selectedBlock.data.label)}
            onChange={(event) => patchData({ label: event.target.value })}
            placeholder="Internal label"
          />
        </InspectorRow>
      ) : null}

      {selectedBlock.type === "rich-text" ? (
        <InspectorRow label="Shared text">
          <Textarea
            value={readString(selectedBlock.data.content)}
            onChange={(event) => patchData({ content: event.target.value })}
            placeholder="Supporting text"
          />
        </InspectorRow>
      ) : null}

      {selectedBlock.type === "heading" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="text"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            bindMode="read"
          />
          <InspectorRow label="Heading text">
            <Input
              value={readString(selectedBlock.data.text)}
              onChange={(event) => patchData({ text: event.target.value })}
              placeholder="Static heading text"
            />
          </InspectorRow>
          <EnumRow
            label="Level"
            value={String(
              typeof selectedBlock.data.level === "number" ? selectedBlock.data.level : 2
            )}
            options={[
              { value: "1", label: "Heading 1" },
              { value: "2", label: "Heading 2" },
              { value: "3", label: "Heading 3" },
            ]}
            onChange={(value) => patchData({ level: Number(value) })}
          />
          <EnumRow
            label="Align"
            accessibleName="Heading text alignment"
            value={readEnum(selectedBlock.data.align, "left")}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            onChange={(value) => patchData({ align: value })}
          />
        </>
      ) : null}

      {selectedBlock.type === "text" ? (
        <>
          <InspectorRow label="Text">
            <Textarea
              value={readString(selectedBlock.data.content)}
              onChange={(event) => patchData({ content: event.target.value })}
              placeholder="Paragraph text"
            />
          </InspectorRow>
          <EnumRow
            label="Tone"
            value={readEnum(selectedBlock.data.tone, "default")}
            options={[
              { value: "default", label: "Default" },
              { value: "muted", label: "Muted" },
            ]}
            onChange={(value) => patchData({ tone: value })}
          />
        </>
      ) : null}

      {selectedBlock.type === "stat" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="value"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            filterTypes={["number"]}
            bindMode="read"
          />
          <EnumRow
            label="Format"
            value={readEnum(selectedBlock.data.format, "number")}
            options={[
              { value: "number", label: "Number" },
              { value: "percent", label: "Percent" },
              { value: "money", label: "Money" },
            ]}
            onChange={(value) => patchData({ format: value })}
          />
          <EnumRow
            label="Trend"
            value={readEnum(selectedBlock.data.trend, "auto")}
            options={[
              { value: "auto", label: "Auto" },
              { value: "up", label: "Up" },
              { value: "down", label: "Down" },
              { value: "flat", label: "Flat" },
            ]}
            onChange={(value) => patchData({ trend: value })}
          />
          <InspectorRow label="Delta field">
            <Input
              value={readString(selectedBlock.data.deltaField)}
              onChange={(event) => patchData({ deltaField: event.target.value })}
              placeholder="Optional field name"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.type === "divider" ? (
        <>
          <EnumRow
            label="Variant"
            value={readEnum(selectedBlock.data.variant, "line")}
            options={[
              { value: "line", label: "Line" },
              { value: "space", label: "Space" },
              { value: "label", label: "Label" },
            ]}
            onChange={(value) => patchData({ variant: value })}
          />
          {readEnum(selectedBlock.data.variant, "line") === "label" ? (
            <InspectorRow label="Label">
              <Input
                value={readString(selectedBlock.data.label)}
                onChange={(event) => patchData({ label: event.target.value })}
                placeholder="Divider label"
              />
            </InspectorRow>
          ) : null}
        </>
      ) : null}

      {selectedBlock.type === "image" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="src"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            filterTypes={["media"]}
            bindMode="read"
          />
          <ImageSrcRow block={selectedBlock} onPatchBlockData={onPatchBlockData} />
          <EnumRow
            label="Fit"
            value={readEnum(selectedBlock.data.fit, "cover")}
            options={[
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
            ]}
            onChange={(value) => patchData({ fit: value })}
          />
          <EnumRow
            label="Ratio"
            value={
              (screenImageRatios as readonly string[]).includes(
                readString(selectedBlock.data.ratio)
              )
                ? readString(selectedBlock.data.ratio)
                : "auto" // legacy free text (e.g. "16:9") DISPLAYS as Auto; the
              // stored value is only rewritten when the user changes the control
            }
            options={[
              { value: "auto", label: "Auto" },
              { value: "1/1", label: "Square (1:1)" },
              { value: "4/3", label: "4:3" },
              { value: "16/9", label: "16:9" },
              { value: "3/2", label: "3:2" },
            ]}
            onChange={(value) => patchData({ ratio: value })}
          />
        </>
      ) : null}

      {selectedBlock.type === "related-list" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="items"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            filterTypes={["relation"]}
            bindMode="read"
            onFieldSelected={(fieldName) => {
              const target = fields.find((item) => item.name === fieldName)?.relation?.target;
              patchData({ target: target ?? "" });
            }}
          />
          <InspectorRow label="Target">
            <Input value={readString(selectedBlock.data.target)} readOnly placeholder="Derived" />
          </InspectorRow>
          <InspectorRow label="Display field">
            <Input
              value={readString(selectedBlock.data.displayField)}
              onChange={(event) => patchData({ displayField: event.target.value })}
              placeholder="title"
            />
          </InspectorRow>
          <EnumRow
            label="Variant"
            value={readEnum(selectedBlock.data.variant, "checklist")}
            options={[
              { value: "checklist", label: "Checklist" },
              { value: "activity", label: "Activity" },
              { value: "cards", label: "Cards" },
            ]}
            onChange={(value) => patchData({ variant: value })}
          />
          <InspectorRow label="Limit">
            <Input
              type="number"
              aria-label="Limit"
              value={String(
                typeof selectedBlock.data.limit === "number" ? selectedBlock.data.limit : 5
              )}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                patchData({ limit: Number.isFinite(parsed) ? parsed : 5 });
              }}
              placeholder="5"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.type === "tabs" ? (
        <TabsEditor
          block={selectedBlock}
          bindings={bindings}
          onPatchBlock={onPatchBlock}
          onPatchBinding={onPatchBinding}
          onArmSlotInsert={onArmSlotInsert}
          armedInsertSlotId={armedInsertSlotId}
        />
      ) : null}

      {selectedBlock.type === "button" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="href"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            bindMode="read"
            clearAffordance={{
              label: "Use static link",
              onClear: () => onPatchBinding(selectedBlock.id, "href", { field: "" }),
            }}
          />
          <EnumRow
            label="Action"
            value="link"
            options={[{ value: "link", label: "Link" }]}
            onChange={() => patchData({ action: "link" })}
          />
          <EnumRow
            label="Variant"
            value={readEnum(selectedBlock.data.variant, "primary")}
            options={[
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" },
              { value: "ghost", label: "Ghost" },
            ]}
            onChange={(value) => patchData({ variant: value })}
          />
          <InspectorRow label="Link">
            <Input
              value={readString(selectedBlock.data.href)}
              onChange={(event) => patchData({ href: event.target.value })}
              placeholder="https://…"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.slots && Object.keys(selectedBlock.slots).length > 0 && onArmSlotInsert ? (
        // TASK-500-02: optional convenience — pick which slot of the selected
        // container the NEXT insert targets (slot-end). The canvas drop zones
        // and gaps stay the primary insertion surface.
        <InspectorRow label="Insert into">
          <Select
            value={armedInsertSlotId ?? ""}
            onValueChange={(slotId) => onArmSlotInsert(selectedBlock.id, slotId)}
          >
            <SelectTrigger data-screen-insert-into="true" aria-label="Insert into">
              <SelectValue placeholder="Choose a slot" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(selectedBlock.slots).map((slotId) => (
                <SelectItem key={slotId} value={slotId}>
                  {slotId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InspectorRow>
      ) : null}

      {selectedBlock.type === "legacy-widget" ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Legacy widget content is preserved as a read-only placeholder until it is rebuilt with
          native screen blocks.
        </div>
      ) : null}

      {/* TASK-503-03: block-level Layout (ScreenBlockStyleV1). Replaces the dead
          free-text "Background" row (block.variant — never read by the renderer;
          parent decision 1: removed, key still accepted by the schema). */}
      <div className="flex flex-col gap-4" data-screen-layout-group="true">
        <EnumRow
          label="Width"
          value={selectedBlock.style?.width ?? "auto"}
          options={[
            { value: "auto", label: "Auto" },
            { value: "full", label: "Full" },
            { value: "half", label: "Half" },
            { value: "third", label: "Third" },
            { value: "two-thirds", label: "Two thirds" },
          ]}
          onChange={(value) => commitStyle({ kind: "width", value })}
        />
        <EnumRow
          label="Align"
          accessibleName="Block layout alignment"
          value={selectedBlock.style?.align ?? SCREEN_ALIGN_DEFAULT_OPTION}
          options={[
            { value: SCREEN_ALIGN_DEFAULT_OPTION, label: "Default" },
            { value: "start", label: "Start" },
            { value: "center", label: "Center" },
            { value: "end", label: "End" },
            { value: "stretch", label: "Stretch" },
          ]}
          onChange={(value) => commitStyle({ kind: "align", value })}
        />
        <InspectorRow label="Min height (px)">
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Min height"
            min={SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min}
            max={SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max}
            value={selectedBlock.style?.minHeight ?? ""}
            placeholder="Auto"
            onChange={(event) => commitStyle({ kind: "minHeight", value: event.target.value })}
          />
        </InspectorRow>
        <BoxSpacingRow
          box="margin"
          label="Margin"
          style={selectedBlock.style}
          onEdit={commitStyle}
        />
        <BoxSpacingRow
          box="padding"
          label="Padding"
          style={selectedBlock.style}
          onEdit={commitStyle}
        />
      </div>
    </div>
  );
}
