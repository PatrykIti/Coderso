import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
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

const buildPreviewRows = (contentType: ContentTypeSummary): EntrySummary[] => {
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
};

export function ListViewCanvas({
  contentType,
  listView,
  selectedColumnId,
  onSelectColumn,
  onMoveColumn,
}: ListViewCanvasProps) {
  if (!contentType) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Select a content type before configuring List View.
      </div>
    );
  }

  const columns = getVisibleListColumns(listView);
  const previewRows = buildPreviewRows(contentType);
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {resolvedColumns.map((column) => (
                <TableHead key={column.id} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelectColumn(column.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs font-semibold uppercase tracking-wider ${
                      selectedColumnId === column.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{column.label}</span>
                    <span className="text-[10px] normal-case">{column.formatter}</span>
                  </button>
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

      <div className="grid gap-2 md:grid-cols-2">
        {listView.columns.map((column, index) => {
          const isSelected = selectedColumnId === column.id;
          return (
            <div
              key={column.id}
              className={`rounded-lg border p-3 ${
                isSelected ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onSelectColumn(column.id)}
              >
                <p className="text-sm font-medium">{column.label}</p>
                <p className="text-xs text-muted-foreground">
                  {column.field} · {column.formatter}
                </p>
              </button>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onMoveColumn(column.id, "left")}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onMoveColumn(column.id, "right")}
                  disabled={index === listView.columns.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
