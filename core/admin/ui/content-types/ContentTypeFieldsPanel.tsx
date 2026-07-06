import { GripVertical, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { FIELD_TYPE_LABELS, type ContentField } from "./SchemaBuilder";

/**
 * TASK-513-03: prototype Fields row list (`ContentTypeEditorPreview.tsx:84-98`).
 *
 * Presentational — the editor owns `fields` state + all mutations; the panel only emits intent.
 * Each row renders `GripVertical` (grab) + truncated field label + a soft type Badge whose text
 * comes from the canonical `FIELD_TYPE_LABELS` map (513-02, incl. Date/Slug) — never a local
 * label map / `capitalize(field.type)` (would drift to "Richtext"). The `…` menu exposes
 * Edit / Duplicate field / Delete field.
 *
 * Drag reorder uses HTML5 drag with FINAL from/to indices (no target-index-before-removal math);
 * keyboard reorder is Arrow Up/Down on the focused row. Both call `onReorder(fromIndex, toIndex)`;
 * the editor's `handleReorder` no-ops on equal / out-of-bounds indices, so `index - 1` at the top
 * and `index + 1` at the bottom are safe. Rows are keyed by `field.id` so focus follows the moved
 * row.
 */
export interface ContentTypeFieldsPanelProps {
  fields: ContentField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDuplicateField: (id: string) => void;
  onDeleteField: (id: string) => void;
}

export function ContentTypeFieldsPanel({
  fields,
  selectedId,
  onSelect,
  onReorder,
  onDuplicateField,
  onDeleteField,
}: ContentTypeFieldsPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const clearDrag = () => setDragIndex(null);

  if (fields.length === 0) {
    return (
      <div className="px-5 py-6 text-sm text-muted-foreground">
        Add your first field to start building the schema.
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {fields.map((field, index) => (
          <div
            key={field.id}
            draggable
            role="button"
            tabIndex={0}
            aria-label={`Field ${field.label}`}
            onClick={() => onSelect(field.id)}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              setDragIndex(index);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null) onReorder(dragIndex, index);
              clearDrag();
            }}
            onDragEnd={clearDrag}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                onReorder(index, index - 1);
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                onReorder(index, index + 1);
              }
            }}
            className={cn(
              "flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
              field.id === selectedId && "bg-accent",
              dragIndex === index && "opacity-60"
            )}
          >
            <GripVertical
              className="size-4 shrink-0 cursor-grab text-muted-foreground"
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{field.label}</span>
            <Badge variant="soft">{FIELD_TYPE_LABELS[field.type] ?? field.type}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Field actions"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onSelect(field.id)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDuplicateField(field.id)}>
                  Duplicate field
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => onDeleteField(field.id)}
                >
                  Delete field
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
      <div className="px-5 py-2.5 text-xs text-muted-foreground">
        Keyboard: focus a field and press <kbd className="rounded border bg-muted px-1">↑</kbd>{" "}
        <kbd className="rounded border bg-muted px-1">↓</kbd> to reorder.
      </div>
    </div>
  );
}
