import { History } from "lucide-react";
import { useCallback, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import { exportConfig } from "@/services/importExportClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ExportCards } from "./ExportCards";
import { ImportDropzone } from "./ImportDropzone";

export function ImportExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      const bundle = await exportConfig();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nextless-export-${bundle.exportedAt}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to export data.");
      }
    } finally {
      setIsExporting(false);
    }
  }, []);

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
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Import/export error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Export Data</h2>
            <p className="text-sm text-muted-foreground">
              Select modules and data types to download as portable files.
            </p>
          </div>
          <ExportCards onExport={handleExport} isExporting={isExporting} />
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
