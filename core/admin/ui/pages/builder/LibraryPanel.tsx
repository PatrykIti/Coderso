import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TemplatePicker } from "./TemplatePicker";
import { WidgetPicker } from "./WidgetPicker";

export type LibraryPanelProps = {
  onAddWidget: (type: string) => void;
  onAddTemplate: (template: { id: string; name: string }) => void;
  defaultTab?: "widgets" | "templates";
};

export function LibraryPanel({
  onAddWidget,
  onAddTemplate,
  defaultTab = "widgets",
}: LibraryPanelProps) {
  return (
    <Tabs defaultValue={defaultTab} className="flex h-full flex-col">
      <TabsList variant="line" className="border-b border-border px-4 pt-4">
        <TabsTrigger value="widgets">Widgets</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="widgets" className="flex-1">
        <WidgetPicker onAdd={onAddWidget} />
      </TabsContent>
      <TabsContent value="templates" className="flex-1">
        <TemplatePicker onAdd={onAddTemplate} />
      </TabsContent>
    </Tabs>
  );
}
