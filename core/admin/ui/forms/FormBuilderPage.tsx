import { ArrowLeft, Eye, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { FieldLibrary } from "./FieldLibrary";
import { FieldSettingsPanel } from "./FieldSettingsPanel";
import { FormCanvas } from "./FormCanvas";

export function FormBuilderPage() {
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
        <aside className="hidden w-72 shrink-0 border-r bg-background lg:block">
          <FieldLibrary />
        </aside>
        <section className="min-w-0 flex-1 bg-muted/20">
          <FormCanvas />
        </section>
        <aside className="hidden w-80 shrink-0 border-l bg-background lg:block">
          <FieldSettingsPanel />
        </aside>
      </div>
    </AdminShell>
  );
}
