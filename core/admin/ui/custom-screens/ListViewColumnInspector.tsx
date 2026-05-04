import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  CustomScreenListColumn,
  CustomScreenListFormatter,
} from "../../../services/customScreens/customScreenSchemas";

const formatterOptions: CustomScreenListFormatter[] = [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "media",
  "relation",
];

type ListViewColumnInspectorProps = {
  column: CustomScreenListColumn | null;
  onChange: (patch: Partial<CustomScreenListColumn>) => void;
  onRemove: () => void;
};

export function ListViewColumnInspector({
  column,
  onChange,
  onRemove,
}: ListViewColumnInspectorProps) {
  if (!column) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a column on the canvas to edit its label, formatter, and visibility.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Selected column</p>
          <p className="text-xs text-muted-foreground">
            {column.source === "system" ? "System field" : "Content field"} · {column.field}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Label
        </label>
        <Input
          value={column.label}
          onChange={(event) => onChange({ label: event.target.value })}
          placeholder="Column label"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Formatter
        </label>
        <Select
          value={column.formatter}
          onValueChange={(next) => onChange({ formatter: next as CustomScreenListFormatter })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {formatterOptions.map((formatter) => (
              <SelectItem key={formatter} value={formatter}>
                {formatter}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={column.visible !== false}
          onCheckedChange={(checked) => onChange({ visible: checked === true })}
        />
        Visible on records list
      </label>
    </div>
  );
}
