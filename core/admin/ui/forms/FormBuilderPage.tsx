import {
  AlignLeft,
  ArrowLeft,
  AtSign,
  Calendar,
  CheckSquare,
  Eye,
  ListChecks,
  Save,
  Type,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { FieldLibrary, type FieldLibraryItem } from "./FieldLibrary";
import { FieldSettingsPanel, type FieldSettings } from "./FieldSettingsPanel";
import { FormCanvas } from "./FormCanvas";

const fieldLibraryItems: Array<FieldLibraryItem & FieldSettings> = [
  {
    id: "text",
    label: "Text Input",
    icon: Type,
    type: "text",
    helper: "Single line text field.",
  },
  {
    id: "email",
    label: "Email Field",
    icon: AtSign,
    type: "email",
    helper: "Validates email addresses automatically.",
  },
  {
    id: "checkbox",
    label: "Checkbox",
    icon: CheckSquare,
    type: "checkbox",
    helper: "Toggle a yes/no value.",
  },
  {
    id: "select",
    label: "Select Menu",
    icon: ListChecks,
    type: "select",
    helper: "Choose one option from a list.",
  },
  {
    id: "textarea",
    label: "Textarea",
    icon: AlignLeft,
    type: "textarea",
    helper: "Multi-line text input.",
  },
  {
    id: "date",
    label: "Date Picker",
    icon: Calendar,
    type: "date",
    helper: "Pick a date from the calendar.",
  },
];

export function FormBuilderPage() {
  const [selectedFieldId, setSelectedFieldId] = useState("text");
  const selectedField =
    fieldLibraryItems.find((field) => field.id === selectedFieldId) ??
    fieldLibraryItems[0];

  return (
    <AdminShell
      activeHref="/admin/forms"
      showSearch={false}
      contentClassName="p-0 overflow-hidden"
      breadcrumbs={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              Contact Support Form
            </span>
            <span className="text-xs text-muted-foreground">
              Customer Service / Draft / Saved 12s ago
            </span>
          </div>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Save Form
          </Button>
        </div>
      }
    >
      <div className="flex h-full min-h-[calc(100vh-4rem)]">
        <aside className="hidden min-h-0 w-72 shrink-0 overflow-hidden border-r bg-background lg:block">
          <FieldLibrary
            items={fieldLibraryItems}
            selectedId={selectedFieldId}
            onSelect={setSelectedFieldId}
          />
        </aside>
        <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-muted/20">
          <FormCanvas selectedFieldId={selectedFieldId} onSelectField={setSelectedFieldId} />
        </section>
        <aside className="hidden min-h-0 w-80 shrink-0 overflow-hidden border-l bg-background lg:block">
          <FieldSettingsPanel field={selectedField} />
        </aside>
      </div>
    </AdminShell>
  );
}
