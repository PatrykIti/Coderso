import { Columns2, FileText, Heading, Layers, ListPlus, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ContentField } from "../content-types/SchemaBuilder";
import type { ScreenBlockKind } from "../../../services/customScreens/screenDocumentOps";

type ScreenBlockLibraryProps = {
  fields: ContentField[];
  onAddBlock: (type: ScreenBlockKind, field?: ContentField) => void;
};

const layoutBlocks: Array<{
  type: ScreenBlockKind;
  label: string;
  description: string;
  icon: typeof Heading;
}> = [
  {
    type: "record-header",
    label: "Record header",
    description: "Title-focused header bound to the active entry.",
    icon: Heading,
  },
  {
    type: "field-group",
    label: "Field group",
    description: "Framed group for related fields.",
    icon: Layers,
  },
  {
    type: "columns",
    label: "Two columns",
    description: "Side-by-side field layout.",
    icon: Columns2,
  },
  {
    type: "rich-text",
    label: "Help text",
    description: "Static guidance shared by every entry.",
    icon: Type,
  },
];

const systemTitleField: ContentField = {
  id: "system-title",
  name: "title",
  label: "Title",
  type: "text",
};

export function ScreenBlockLibrary({ fields, onAddBlock }: ScreenBlockLibraryProps) {
  const hasTitleField = fields.some((field) => field.name === "title");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">Screen Blocks</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Layout
            </p>
            {layoutBlocks.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.type}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
                  onClick={() => onAddBlock(item.type)}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fields
            </p>
            {fields.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                Select a content type to add fields.
              </div>
            ) : (
              fields.map((field) => (
                <Button
                  key={field.name}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
                  onClick={() => onAddBlock("field", field)}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{field.label}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {field.name} · {field.type}
                    </span>
                  </span>
                </Button>
              ))
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2"
            onClick={() => onAddBlock("field", systemTitleField)}
            disabled={fields.length === 0 || hasTitleField}
          >
            <ListPlus className="h-4 w-4" />
            Add title field
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
