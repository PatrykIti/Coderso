import { Save, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditorShell } from "@/ui/layouts/EditorShell";

import { BlockLibrary } from "./BlockLibrary";
import { CanvasFrame } from "./CanvasFrame";
import { DeviceSwitcher } from "./DeviceSwitcher";
import { InspectorPanel } from "./InspectorPanel";

export function PageEditorPage() {
  return (
    <EditorShell
      activeHref="/admin/pages"
      leftPanel={<BlockLibrary />}
      rightPanel={<InspectorPanel />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Pages</span>
          <span>/</span>
          <span className="text-foreground">Homepage</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            Draft
          </span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground lg:inline">
            Last saved 2m ago
          </span>
          <DeviceSwitcher />
          <Button variant="secondary" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Publish
          </Button>
        </div>
      }
    >
      <CanvasFrame />
    </EditorShell>
  );
}
