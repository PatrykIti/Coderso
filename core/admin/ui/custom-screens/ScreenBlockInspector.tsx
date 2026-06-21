import { Copy, MoveDown, MoveUp, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { screenBlockLabels } from "../../../services/customScreens/screenDocumentOps";
import type { ContentField } from "../content-types/SchemaBuilder";

type ScreenBlockInspectorProps = {
  selectedBlock: ScreenBlockV1 | null;
  bindings: ScreenFieldBinding[];
  fields: ContentField[];
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

const modeOptions: Array<{ value: CustomScreenBindingMode; label: string }> = [
  { value: "readwrite", label: "Read / write" },
  { value: "read", label: "Read only" },
  { value: "write", label: "Write only" },
];

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

function FieldBindingControls({
  block,
  propPath,
  bindings,
  fields,
  onPatchBinding,
  defaultMode,
}: {
  block: ScreenBlockV1;
  propPath: string;
  bindings: ScreenFieldBinding[];
  fields: ContentField[];
  onPatchBinding: ScreenBlockInspectorProps["onPatchBinding"];
  defaultMode: CustomScreenBindingMode;
}) {
  const binding = bindings.find((item) => item.blockId === block.id && item.propPath === propPath);
  const fieldOptions = buildFieldOptions(fields);
  const selectedField = binding?.field ?? readString(block.data.field) ?? "title";
  const selectedMode = binding?.mode ?? defaultMode;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Bound field
        </p>
        <Select
          value={selectedField}
          onValueChange={(field) => onPatchBinding(block.id, propPath, { field })}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Interaction
        </p>
        <Select
          value={selectedMode}
          onValueChange={(mode) =>
            onPatchBinding(block.id, propPath, { mode: mode as CustomScreenBindingMode })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modeOptions.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ScreenBlockInspector({
  selectedBlock,
  bindings,
  fields,
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

  const label =
    screenBlockLabels[selectedBlock.type as keyof typeof screenBlockLabels] ?? selectedBlock.type;
  const patchData = (patch: Record<string, unknown>) => {
    onPatchBlockData(selectedBlock.id, patch);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{selectedBlock.id}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
            {selectedBlock.type}
          </Badge>
        </div>
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
      </div>

      {selectedBlock.type === "record-header" ? (
        <div className="space-y-3">
          <FieldBindingControls
            block={selectedBlock}
            propPath="title"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            defaultMode="read"
          />
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Header text
            </p>
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
          </div>
        </div>
      ) : null}

      {selectedBlock.type === "field" ? (
        <div className="space-y-3">
          <FieldBindingControls
            block={selectedBlock}
            propPath="value"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            defaultMode="readwrite"
          />
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Field presentation
            </p>
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
          </div>
        </div>
      ) : null}

      {selectedBlock.type === "field-group" ? (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Group presentation
          </p>
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
        </div>
      ) : null}

      {selectedBlock.type === "columns" ? (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Columns
          </p>
          <Input
            value={readString(selectedBlock.data.label)}
            onChange={(event) => patchData({ label: event.target.value })}
            placeholder="Internal label"
          />
        </div>
      ) : null}

      {selectedBlock.type === "rich-text" ? (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shared text
          </p>
          <Textarea
            value={readString(selectedBlock.data.content)}
            onChange={(event) => patchData({ content: event.target.value })}
            placeholder="Supporting text"
          />
        </div>
      ) : null}

      {selectedBlock.type === "legacy-widget" ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Legacy widget content is preserved as a read-only placeholder until it is rebuilt with
          native screen blocks.
        </div>
      ) : null}

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Variant
        </p>
        <Input
          value={selectedBlock.variant ?? ""}
          onChange={(event) =>
            onPatchBlock(selectedBlock.id, {
              variant: event.target.value.trim() || undefined,
            })
          }
          placeholder="Default"
        />
      </div>
    </div>
  );
}
