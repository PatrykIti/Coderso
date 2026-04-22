import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FormPicker } from "./FormPicker";
import { TemplatePicker } from "./TemplatePicker";
import { WidgetPicker } from "./WidgetPicker";

export type LibraryPanelProps = {
  onAddWidget: (type: string) => void;
  onAddTemplate: (template: { id: string; name: string }) => void;
  onAddForm: (form: { id: string; name: string }) => void;
  defaultTab?: "widgets" | "templates" | "forms";
  activeTab?: "widgets" | "templates" | "forms";
  onActiveTabChange?: (value: "widgets" | "templates" | "forms") => void;
  widgetAllowedTypes?: string[] | null;
  widgetContextLabel?: string | null;
  onClearWidgetContext?: () => void;
};

export function LibraryPanel({
  onAddWidget,
  onAddTemplate,
  onAddForm,
  defaultTab = "widgets",
  activeTab,
  onActiveTabChange,
  widgetAllowedTypes,
  widgetContextLabel,
  onClearWidgetContext,
}: LibraryPanelProps) {
  const tabProps = activeTab
    ? {
        value: activeTab,
        onValueChange: (value: string) =>
          onActiveTabChange?.(value as "widgets" | "templates" | "forms"),
      }
    : {
        defaultValue: defaultTab,
      };

  return (
    <Tabs {...tabProps} className="flex h-full flex-col">
      <TabsList variant="line" className="border-b border-border px-4 pt-4">
        <TabsTrigger value="widgets">Widgets</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="forms">Forms</TabsTrigger>
      </TabsList>
      <TabsContent value="widgets" className="flex-1">
        <WidgetPicker
          onAdd={onAddWidget}
          allowedTypes={widgetAllowedTypes}
          contextLabel={widgetContextLabel}
          onClearContext={onClearWidgetContext}
        />
      </TabsContent>
      <TabsContent value="templates" className="flex-1">
        <TemplatePicker onAdd={onAddTemplate} />
      </TabsContent>
      <TabsContent value="forms" className="flex-1">
        <FormPicker onAdd={onAddForm} />
      </TabsContent>
    </Tabs>
  );
}
