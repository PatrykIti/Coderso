import { Download, RefreshCcw, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { ThemePreviewPanel } from "./ThemePreviewPanel";
import { ThemeTokensEditor } from "./ThemeTokensEditor";

export function ThemeEditorPage() {
  return (
    <AdminShell
      activeHref="/admin/themes"
      contentClassName="p-0"
      showSearch={false}
      breadcrumbs={
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">Theme Editor</span>
          <Separator orientation="vertical" className="h-4" />
          <Badge className="bg-emerald-100 text-[10px] uppercase tracking-wide text-emerald-700">
            Live
          </Badge>
          <span className="text-xs italic text-muted-foreground/80">
            Last saved 4m ago
          </span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2 shadow-sm">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-muted/30 xl:flex-row">
        <section className="flex-1 border-b bg-muted/20 xl:border-b-0">
          <ThemePreviewPanel />
        </section>
        <aside className="w-full border-t bg-background xl:w-[480px] xl:border-l xl:border-t-0">
          <ThemeTokensEditor />
        </aside>
      </div>
    </AdminShell>
  );
}
