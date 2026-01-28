import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ExportCards } from "./ExportCards";
import { ImportDropzone } from "./ImportDropzone";

export function ImportExportPage() {
  return (
    <AdminShell
      activeHref="/admin/tools/import-export"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Data</span>
          <span>/</span>
          <span className="text-foreground">Import &amp; Export</span>
        </div>
      }
      topbarActions={
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Activity Log
        </Button>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <PageHeader
          title="Import & Export"
          description="Data management and portability."
        />

        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Export Data</h2>
            <p className="text-sm text-muted-foreground">
              Select modules and data types to download as portable files.
            </p>
          </div>
          <ExportCards />
        </section>

        <Separator />

        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Import Data</h2>
            <p className="text-sm text-muted-foreground">
              Upload JSON or CSV files to populate your CMS content.
            </p>
          </div>
          <ImportDropzone />
        </section>
      </div>
    </AdminShell>
  );
}
