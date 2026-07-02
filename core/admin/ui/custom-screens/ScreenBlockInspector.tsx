import { Copy, MoveDown, MoveUp, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

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
import type {
  CustomScreenBindingMode,
  ScreenBlockV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import type { ContentField } from "../content-types/SchemaBuilder";

type ScreenBlockInspectorProps = {
  selectedBlock: ScreenBlockV1 | null;
  bindings: ScreenFieldBinding[];
  fields: ContentField[];
  // TASK-498-01 A4: the inspector renders ONE flat body. The historical
  // `content|binding|layout|style|visibility` sub-values collapse to a single
  // shape; the prop is retained (type-stable) but its sub-value no longer routes.
  panel?: "all" | "content" | "binding" | "layout" | "style" | "visibility";
  showBlockActions?: boolean;
  // TASK-500-02 (optional): "Insert into" slot picker for a selected container.
  // Arms a slot-end insert point on the host (keyboard-first parity with the
  // canvas drop zones — those remain the primary surface). The inspector stays
  // dumb: the canvas builds the full ScreenInsertTarget from (parentId, slotId).
  onArmSlotInsert?: (parentId: string, slotId: string) => void;
  armedInsertSlotId?: string | null;
  onPatchBlock: (blockId: string, patch: Partial<ScreenBlockV1>) => void;
  onPatchBlockData: (blockId: string, patch: Record<string, unknown>) => void;
  onPatchBinding: (
    blockId: string,
    propPath: string,
    patch: Partial<Pick<ScreenFieldBinding, "field" | "mode">>
  ) => void;
  onMove: (blockId: string, direction: "up" | "down") => void;
  onDuplicate: (blockId: string) => void;
  onDelete: (blockId: string) => void;
};

type FieldOption = {
  value: string;
  label: string;
  type: string;
};

const systemFieldOptions: FieldOption[] = [
  { value: "title", label: "Title", type: "system" },
  { value: "slug", label: "Slug", type: "system" },
  { value: "status", label: "Status", type: "system" },
  { value: "createdAt", label: "Created", type: "system" },
  { value: "updatedAt", label: "Updated", type: "system" },
  { value: "publishedAt", label: "Published", type: "system" },
];

const createBindingId = (blockId: string, propPath: string) =>
  `${blockId}-${propPath}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const createScreenFieldBinding = (input: {
  blockId: string;
  propPath: string;
  field: string;
  mode?: CustomScreenBindingMode;
}): ScreenFieldBinding => ({
  id: createBindingId(input.blockId, input.propPath),
  blockId: input.blockId,
  propPath: input.propPath,
  source: "entry",
  field: input.field,
  mode: input.mode ?? "readwrite",
});

const readString = (value: unknown) => (typeof value === "string" ? value : "");

const buildFieldOptions = (fields: ContentField[]): FieldOption[] => {
  const schemaFieldNames = new Set(fields.map((field) => field.name));
  return [
    ...systemFieldOptions.filter((field) => !schemaFieldNames.has(field.value)),
    ...fields.map((field) => ({
      value: field.name,
      label: field.label,
      type: field.type,
    })),
  ];
};

/**
 * TASK-498-01 A4: prototype flat inspector row — a label above a single control,
 * no bordered card (CustomScreenEditorPreview.tsx:72-79, :250-296).
 */
function InspectorRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/**
 * First-class flat "Bound field" row (prototype :258-266). The binding MODE
 * ("Interaction" read/readwrite) is no longer a user-visible control — it is set
 * per-kind by the insert wiring (TASK-498-02 B4), so only the field Select ships.
 *
 * TASK-498-02 B4:
 *  - `filterTypes` restricts the option list per kind (stat → number, image → media,
 *    related-list → relation). Omitted = all fields (field / record-header / heading).
 *  - `bindMode` is passed EXPLICITLY into onPatchBinding: display kinds bind `read`,
 *    `field` + editable header bind `readwrite`. This is the single kind-based mode
 *    convention (NOT a propPath-keyed default, which cannot disambiguate `field`
 *    readwrite `value` from `stat` read `value`).
 *  - `onFieldSelected` is a side-effect fired on change (related-list uses it to sync
 *    `data.target` from the selected relation field — `handlePatchBinding` only
 *    auto-syncs `data` for propPath `value`, never for `items`).
 */
function BoundFieldRow({
  block,
  propPath,
  bindings,
  fields,
  onPatchBinding,
  filterTypes,
  bindMode,
  onFieldSelected,
}: {
  block: ScreenBlockV1;
  propPath: string;
  bindings: ScreenFieldBinding[];
  fields: ContentField[];
  onPatchBinding: ScreenBlockInspectorProps["onPatchBinding"];
  filterTypes?: readonly string[];
  bindMode?: CustomScreenBindingMode;
  onFieldSelected?: (fieldName: string) => void;
}) {
  const binding = bindings.find((item) => item.blockId === block.id && item.propPath === propPath);
  const allOptions = buildFieldOptions(fields);
  const fieldOptions = filterTypes
    ? allOptions.filter((option) => filterTypes.includes(option.type))
    : allOptions;
  const selectedField =
    binding?.field ?? readString(block.data.field) ?? fieldOptions[0]?.value ?? "title";

  return (
    <InspectorRow label="Bound field">
      {fieldOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No matching fields on this content type.</p>
      ) : (
        <Select
          value={selectedField}
          onValueChange={(field) => {
            onPatchBinding(block.id, propPath, bindMode ? { field, mode: bindMode } : { field });
            onFieldSelected?.(field);
          }}
        >
          <SelectTrigger data-screen-bound-field="true">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label} ({field.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </InspectorRow>
  );
}

/** Flat enum Select row shared by the per-kind inspector controls (TASK-498-02 B4). */
function EnumRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <InspectorRow label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </InspectorRow>
  );
}

const readEnum = (value: unknown, fallback: string) =>
  typeof value === "string" && value ? value : fallback;

/** Tabs add/remove editor — keeps `data.tabs` and `slots` in sync (TASK-498-02 B4). */
function TabsEditor({
  block,
  onPatchBlock,
}: {
  block: ScreenBlockV1;
  onPatchBlock: ScreenBlockInspectorProps["onPatchBlock"];
}) {
  const tabs = Array.isArray(block.data.tabs)
    ? (block.data.tabs as Array<Record<string, unknown>>)
    : [];
  const slots = block.slots ?? {};

  const commit = (
    nextTabs: Array<{ id: string; label: string }>,
    nextSlots: Record<string, ScreenBlockV1[]>
  ) => {
    onPatchBlock(block.id, {
      data: { ...block.data, tabs: nextTabs },
      slots: nextSlots,
    });
  };

  const normalizedTabs = tabs.map((tab, index) => ({
    id: typeof tab.id === "string" && tab.id ? tab.id : `tab-${index + 1}`,
    label: typeof tab.label === "string" ? tab.label : `Tab ${index + 1}`,
  }));

  return (
    <InspectorRow label="Tabs">
      <div className="flex flex-col gap-2">
        {normalizedTabs.map((tab, index) => (
          <div key={tab.id} className="flex items-center gap-2">
            <Input
              value={tab.label}
              onChange={(event) => {
                const nextTabs = normalizedTabs.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, label: event.target.value } : item
                );
                commit(nextTabs, slots);
              }}
              placeholder={`Tab ${index + 1}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Remove ${tab.label || `tab ${index + 1}`}`}
              disabled={normalizedTabs.length <= 1}
              onClick={() => {
                const nextTabs = normalizedTabs.filter((_, itemIndex) => itemIndex !== index);
                const nextSlots = Object.fromEntries(
                  Object.entries(slots).filter(([slotId]) => slotId !== tab.id)
                );
                commit(nextTabs, nextSlots);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const nextId = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
            const nextTabs = [
              ...normalizedTabs,
              { id: nextId, label: `Tab ${normalizedTabs.length + 1}` },
            ];
            commit(nextTabs, { ...slots, [nextId]: [] });
          }}
        >
          Add tab
        </Button>
      </div>
    </InspectorRow>
  );
}

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
          <InspectorRow label="Image URL">
            <Input
              value={readString(selectedBlock.data.src)}
              onChange={(event) => patchData({ src: event.target.value })}
              placeholder="https://… or /media/… — used when no field is bound"
            />
          </InspectorRow>
          <EnumRow
            label="Fit"
            value={readEnum(selectedBlock.data.fit, "cover")}
            options={[
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
            ]}
            onChange={(value) => patchData({ fit: value })}
          />
          <InspectorRow label="Ratio">
            <Input
              value={readString(selectedBlock.data.ratio)}
              onChange={(event) => patchData({ ratio: event.target.value })}
              placeholder="e.g. 16/9 (optional)"
            />
          </InspectorRow>
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
        <TabsEditor block={selectedBlock} onPatchBlock={onPatchBlock} />
      ) : null}

      {selectedBlock.type === "button" ? (
        <>
          <EnumRow
            label="Action"
            value={readEnum(selectedBlock.data.action, "link")}
            options={[
              { value: "link", label: "Link" },
              { value: "publish", label: "Publish" },
              { value: "custom", label: "Custom" },
            ]}
            onChange={(value) => patchData({ action: value })}
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
          {readEnum(selectedBlock.data.action, "link") === "link" ? (
            <InspectorRow label="Link">
              <Input
                value={readString(selectedBlock.data.href)}
                onChange={(event) => patchData({ href: event.target.value })}
                placeholder="https://…"
              />
            </InspectorRow>
          ) : null}
        </>
      ) : null}

      {selectedBlock.slots && Object.keys(selectedBlock.slots).length > 0 && onArmSlotInsert ? (
        // TASK-500-02: optional convenience — pick which slot of the selected
        // container the NEXT insert targets (slot-end). The canvas drop zones
        // and gaps stay the primary insertion surface.
        <InspectorRow label="Insert into">
          <Select
            value={armedInsertSlotId ?? undefined}
            onValueChange={(slotId) => onArmSlotInsert(selectedBlock.id, slotId)}
          >
            <SelectTrigger data-screen-insert-into="true">
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

      <InspectorRow label="Background">
        <Input
          value={selectedBlock.variant ?? ""}
          onChange={(event) =>
            onPatchBlock(selectedBlock.id, {
              variant: event.target.value.trim() || undefined,
            })
          }
          placeholder="Default"
        />
      </InspectorRow>
    </div>
  );
}
