import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

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
import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type {
  CustomScreenCreateMode,
  CustomScreenListFormatter,
  CustomScreenListViewDefinition,
  CustomScreenRowClickMode,
  CustomScreenSortDirection,
} from "../../../services/customScreens/customScreenSchemas";
import {
  buildListColumnFromOption,
  buildListFilterFromOption,
  listSelectableListFields,
} from "./customScreenListModel";

type ListViewDesignerProps = {
  contentType: ContentTypeSummary | null;
  value: CustomScreenListViewDefinition;
  onChange: (next: CustomScreenListViewDefinition) => void;
};

const formatterOptions: CustomScreenListFormatter[] = [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "media",
  "relation",
];

export function ListViewDesigner({ contentType, value, onChange }: ListViewDesignerProps) {
  const fieldOptions = useMemo(
    () => (contentType ? listSelectableListFields(contentType) : []),
    [contentType]
  );
  const [selectedField, setSelectedField] = useState("");
  const selectedOption = fieldOptions.find(
    (option) => `${option.source}:${option.field}` === selectedField
  );

  const updateColumn = (
    columnId: string,
    patch: Partial<CustomScreenListViewDefinition["columns"][number]>
  ) => {
    onChange({
      ...value,
      columns: value.columns.map((column) =>
        column.id === columnId ? { ...column, ...patch } : column
      ),
    });
  };

  const addColumn = () => {
    if (!selectedOption) return;
    const nextColumn = buildListColumnFromOption(selectedOption);
    if (
      value.columns.some(
        (column) => column.source === nextColumn.source && column.field === nextColumn.field
      )
    ) {
      return;
    }
    onChange({ ...value, columns: [...value.columns, nextColumn] });
  };

  const toggleFilter = (fieldKey: string, enabled: boolean) => {
    const option = fieldOptions.find((item) => `${item.source}:${item.field}` === fieldKey);
    if (!option) return;
    const existing = value.filters.find(
      (filter) => filter.source === option.source && filter.field === option.field
    );
    if (existing) {
      onChange({
        ...value,
        filters: value.filters.map((filter) =>
          filter.id === existing.id ? { ...filter, enabled } : filter
        ),
      });
      return;
    }
    onChange({
      ...value,
      filters: [...value.filters, { ...buildListFilterFromOption(option), enabled }],
    });
  };

  if (!contentType) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Select a content type before configuring List View.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedField} onValueChange={setSelectedField}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Add column" />
            </SelectTrigger>
            <SelectContent>
              {fieldOptions.map((option) => (
                <SelectItem
                  key={`${option.source}:${option.field}`}
                  value={`${option.source}:${option.field}`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={addColumn}>
            <Plus className="h-4 w-4" />
            Add column
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border">
          {value.columns.map((column) => (
            <div
              key={column.id}
              className="grid gap-3 border-b p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_9rem_6rem_2rem]"
            >
              <Input
                value={column.label}
                onChange={(event) => updateColumn(column.id, { label: event.target.value })}
                aria-label={`${column.field} column label`}
              />
              <Select
                value={column.formatter}
                onValueChange={(next) =>
                  updateColumn(column.id, {
                    formatter: next as CustomScreenListFormatter,
                  })
                }
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
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={column.visible !== false}
                  onCheckedChange={(checked) =>
                    updateColumn(column.id, { visible: checked === true })
                  }
                />
                Visible
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  onChange({
                    ...value,
                    columns: value.columns.filter((item) => item.id !== column.id),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Row click
          </p>
          <Select
            value={value.rowClick}
            onValueChange={(next) =>
              onChange({ ...value, rowClick: next as CustomScreenRowClickMode })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor-view">Editor View</SelectItem>
              <SelectItem value="classic-editor">Classic editor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Create mode
          </p>
          <Select
            value={value.createMode}
            onValueChange={(next) =>
              onChange({ ...value, createMode: next as CustomScreenCreateMode })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor-view">Editor View</SelectItem>
              <SelectItem value="drawer">Legacy drawer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Default sort
          </p>
          <Select
            value={value.defaultSort.field}
            onValueChange={(field) =>
              onChange({ ...value, defaultSort: { ...value.defaultSort, field } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fieldOptions.map((option) => (
                <SelectItem key={`${option.source}:${option.field}`} value={option.field}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Direction
          </p>
          <Select
            value={value.defaultSort.direction}
            onValueChange={(direction) =>
              onChange({
                ...value,
                defaultSort: {
                  ...value.defaultSort,
                  direction: direction as CustomScreenSortDirection,
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Filters
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {fieldOptions
            .filter((option) => option.formatter === "select" || option.field === "status")
            .map((option) => {
              const key = `${option.source}:${option.field}`;
              const filter = value.filters.find(
                (item) => item.source === option.source && item.field === option.field
              );
              return (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={filter?.enabled === true}
                    onCheckedChange={(checked) => toggleFilter(key, checked === true)}
                  />
                  {option.label}
                </label>
              );
            })}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Bulk actions
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.bulkActions.publish}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  bulkActions: {
                    ...value.bulkActions,
                    publish: checked === true,
                  },
                })
              }
            />
            Publish
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.bulkActions.unpublish}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  bulkActions: {
                    ...value.bulkActions,
                    unpublish: checked === true,
                  },
                })
              }
            />
            Move to Draft
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.bulkActions.delete}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  bulkActions: {
                    ...value.bulkActions,
                    delete: checked === true,
                  },
                })
              }
            />
            Delete
          </label>
        </div>
      </section>
    </div>
  );
}
