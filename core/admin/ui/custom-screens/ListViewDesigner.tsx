import { useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type {
  CustomScreenListFormatter,
  CustomScreenListViewDefinition,
  CustomScreenSortDirection,
} from "../../../services/customScreens/customScreenSchemas";
import { buildListFilterFromOption, listSelectableListFields } from "./customScreenListModel";

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
      <section className="grid gap-4 md:grid-cols-2">
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
          Column formatter defaults
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {value.columns.map((column) => (
            <div key={column.id} className="rounded-lg border p-3">
              <div className="mb-2">
                <p className="text-sm font-medium">{column.label}</p>
                <p className="text-xs text-muted-foreground">{column.field}</p>
              </div>
              <Select
                value={column.formatter}
                onValueChange={(next) =>
                  onChange({
                    ...value,
                    columns: value.columns.map((item) =>
                      item.id === column.id
                        ? { ...item, formatter: next as CustomScreenListFormatter }
                        : item
                    ),
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
            </div>
          ))}
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
