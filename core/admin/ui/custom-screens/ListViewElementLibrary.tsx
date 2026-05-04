import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { CustomScreenListFieldOption } from "./customScreenListModel";

type ListViewElementLibraryProps = {
  options: CustomScreenListFieldOption[];
  onAddColumn: (option: CustomScreenListFieldOption) => void;
};

export function ListViewElementLibrary({ options, onAddColumn }: ListViewElementLibraryProps) {
  return (
    <div className="space-y-4 p-6">
      <div className="space-y-1">
        <p className="text-sm font-medium">List elements</p>
        <p className="text-xs text-muted-foreground">
          Add columns from the selected content type and approved system fields.
        </p>
      </div>

      {options.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          All available columns are already present in this view.
        </div>
      ) : (
        <div className="space-y-2">
          {options.map((option) => (
            <div
              key={`${option.source}:${option.field}`}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {option.source === "system" ? "System field" : "Content field"} · {option.field}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onAddColumn(option)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
