import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type { EntrySummary } from "@/services/entriesClient";

import type { CustomScreenListViewDefinition } from "../../../services/customScreens/customScreenSchemas";
import {
  buildListColumnFromOption,
  getVisibleListColumns,
  listSelectableListFields,
  resolveEntryColumnValue,
} from "./customScreenListModel";

const buildPreviewEntryValue = (fieldType: string) => {
  switch (fieldType) {
    case "number":
      return 120;
    case "boolean":
      return true;
    case "select":
      return "Sample";
    case "media":
      return "Hero image";
    case "relation":
      return "Related item";
    default:
      return "Sample value";
  }
};

export const buildCustomScreenPreviewEntries = (
  contentType: ContentTypeSummary
): EntrySummary[] => {
  const fieldOptions = listSelectableListFields(contentType).filter(
    (option) => option.source === "field"
  );
  const sharedData = Object.fromEntries(
    fieldOptions.map((option) => [option.field, buildPreviewEntryValue(option.formatter)])
  );

  return [
    {
      id: "preview-entry-1",
      typeId: contentType.id,
      title: "House Aurora",
      slug: "house-aurora",
      status: "draft",
      data: sharedData,
      createdAt: "2026-05-01T08:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
      publishedAt: null,
    },
    {
      id: "preview-entry-2",
      typeId: contentType.id,
      title: "House Nova",
      slug: "house-nova",
      status: "published",
      data: sharedData,
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-05-01T11:00:00.000Z",
      publishedAt: "2026-05-01T11:30:00.000Z",
    },
  ];
};

type ListViewCanvasProps = {
  contentType: ContentTypeSummary | null;
  listView: CustomScreenListViewDefinition;
  selectedColumnId: string | null;
  onSelectColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  showHiddenColumnsTray?: boolean;
};

export function ListViewCanvas({
  contentType,
  listView,
  selectedColumnId,
  onSelectColumn,
  onMoveColumn,
  showHiddenColumnsTray = false,
}: ListViewCanvasProps) {
  if (!contentType) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Select a content type before configuring List View.
      </div>
    );
  }

  const columns = getVisibleListColumns(listView);
  const previewRows = buildCustomScreenPreviewEntries(contentType);
  const resolvedColumns =
    columns.length > 0
      ? columns
      : [
          buildListColumnFromOption({
            source: "system",
            field: "title",
            label: "Record",
            formatter: "text",
          }),
        ];
  const hiddenColumns = listView.columns.filter(
    (column) => !resolvedColumns.some((visibleColumn) => visibleColumn.id === column.id)
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {resolvedColumns.map((column, index) => (
                <TableHead key={column.id} className="px-4 py-3">
                  <div
                    data-selected-column={selectedColumnId === column.id ? "true" : "false"}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1",
                      selectedColumnId === column.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      data-column-select={column.id}
                      onClick={() => onSelectColumn(column.id)}
                      className="min-w-0 flex-1 text-left text-xs font-semibold uppercase tracking-wider"
                    >
                      <span>{column.label}</span>
                      <span className="ml-2 text-[10px] normal-case">{column.formatter}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onMoveColumn(column.id, "left")}
                        disabled={columns.length === 0 || index === 0}
                        aria-label={`Move ${column.label} left`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onMoveColumn(column.id, "right")}
                        disabled={columns.length === 0 || index === resolvedColumns.length - 1}
                        aria-label={`Move ${column.label} right`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((entry) => (
              <TableRow key={entry.id}>
                {resolvedColumns.map((column) => (
                  <TableCell key={column.id} className="px-4 py-4 text-sm">
                    {resolveEntryColumnValue({ entry, column })}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showHiddenColumnsTray && hiddenColumns.length > 0 ? (
        <div className="rounded-lg border border-dashed p-3" data-hidden-columns-tray="true">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hidden columns
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {hiddenColumns.map((column) => {
              const isSelected = selectedColumnId === column.id;
              return (
                <button
                  key={column.id}
                  type="button"
                  data-hidden-column-id={column.id}
                  onClick={() => onSelectColumn(column.id)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left",
                    isSelected ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/50"
                  )}
                >
                  <p className="text-sm font-medium">{column.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {column.field} · {column.formatter}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
