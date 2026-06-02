import { History } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import { exportConfig, type ExportRequest, type ExportTarget } from "@/services/importExportClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ExportCards } from "./ExportCards";
import { ImportDropzone } from "./ImportDropzone";

export function ImportExportPage() {
  const [exportingTargets, setExportingTargets] = useState<ExportTarget[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async (request: ExportRequest) => {
    const target = request.target ?? "full";
    setExportingTargets((current) => [...new Set([...current, target])]);
    setError(null);
    try {
      const bundle = await exportConfig(request);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const downloadTarget = request.target ?? bundle.scope?.target ?? "full";
      const exportedAt = bundle.exportedAt.replace(/[:.]/g, "-");
      anchor.download = `coderso-export-${downloadTarget}-${exportedAt}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to export data.");
      }
    } finally {
      setExportingTargets((current) => current.filter((item) => item !== target));
    }
  }, []);

  return (
    <AdminShell
      activeHref="/admin/tools/import-export"
      breadcrumbs={["Data", "Import & Export"]}
      topbarActions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled
          title="Import activity is shown in Recent Imports for this session."
        >
          <History className="h-4 w-4" />
          Activity Log
        </Button>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <PageHeader title="Import & Export" description="Data management and portability." />
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
              Select supported configuration sections to download as JSON bundles.
            </p>
          </div>
          <ExportCards onExport={handleExport} exportingTargets={exportingTargets} />
        </section>

        <Separator />

        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Import Data</h2>
            <p className="text-sm text-muted-foreground">
              Upload JSON configuration bundles to preview and apply changes.
            </p>
          </div>
          <ImportDropzone />
        </section>
      </div>
    </AdminShell>
  );
}
