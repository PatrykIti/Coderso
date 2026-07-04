import { FileJson, UploadCloud } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import {
  getCachedImportHistory,
  importConfig,
  previewImport,
  writeImportHistoryCache,
  type ExportBundle,
  type ImportHistoryItem,
  type ImportHistoryStatus,
  type ImportSummary,
} from "@/services/importExportClient";

type ImportRecord = ImportHistoryItem;

const statusLabels: Record<ImportHistoryStatus, string> = {
  validating: "Validating",
  "preview-ready": "Preview ready",
  applying: "Applying",
  applied: "Applied",
  failed: "Failed",
};

type ImportStatusVariant = "soft" | "info" | "warning" | "success" | "destructive";

const statusStyles: Record<
  ImportHistoryStatus,
  { variant: ImportStatusVariant; dot: string; bar: string }
> = {
  validating: { variant: "soft", dot: "bg-primary", bar: "bg-primary" },
  "preview-ready": { variant: "info", dot: "bg-info", bar: "bg-info" },
  applying: { variant: "warning", dot: "bg-warning", bar: "bg-warning" },
  applied: { variant: "success", dot: "bg-success", bar: "bg-success" },
  failed: { variant: "destructive", dot: "bg-destructive", bar: "bg-destructive" },
};

const maxImportFileSizeBytes = 50 * 1024 * 1024;

const createImportRecord = (
  file: File,
  status: ImportHistoryStatus,
  progress: number,
  failureReason?: string | null
): ImportRecord => ({
  id: `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  fileName: file.name,
  type: "JSON bundle",
  sizeBytes: file.size,
  status,
  progress: Math.max(0, Math.min(100, progress)),
  createdAt: new Date().toISOString(),
  completedAt: status === "failed" ? new Date().toISOString() : null,
  failureReason: failureReason ?? null,
  summary: null,
});

const getUserSafeError = (error: unknown, fallback: string) => {
  if (isApiClientError(error) || error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

const isJsonFile = (file: File) =>
  file.name.toLowerCase().endsWith(".json") || file.type === "application/json";

const formatDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function ImportDropzone() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bundle, setBundle] = useState<ExportBundle | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportRecord[]>(() => getCachedImportHistory() ?? []);
  const [search, setSearch] = useState("");
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pushHistoryRecord = useCallback((record: ImportRecord) => {
    setHistory((current) => {
      const next = [record, ...current].slice(0, 20);
      writeImportHistoryCache(next);
      return next;
    });
  }, []);

  const updateHistoryRecord = useCallback(
    (id: string, patch: Partial<Omit<ImportRecord, "id" | "fileName" | "type" | "sizeBytes">>) => {
      setHistory((current) => {
        const next = current.map((record) =>
          record.id === id
            ? {
                ...record,
                ...patch,
                progress:
                  patch.progress === undefined
                    ? record.progress
                    : Math.max(0, Math.min(100, patch.progress)),
              }
            : record
        );
        writeImportHistoryCache(next);
        return next;
      });
    },
    []
  );

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setPreview(null);
      setBundle(null);

      if (!isJsonFile(file)) {
        const message = "Only .json configuration bundles can be imported.";
        setError(message);
        toast.error(message);
        const record = createImportRecord(file, "failed", 0, message);
        pushHistoryRecord(record);
        setActiveRecordId(record.id);
        return;
      }

      if (file.size > maxImportFileSizeBytes) {
        const message = "Import file exceeds the 50MB limit.";
        setError(message);
        toast.error(message);
        const record = createImportRecord(file, "failed", 0, message);
        pushHistoryRecord(record);
        setActiveRecordId(record.id);
        return;
      }

      const record = createImportRecord(file, "validating", 35);
      pushHistoryRecord(record);
      setActiveRecordId(record.id);
      setIsPreviewing(true);
      try {
        const text = await file.text();
        let parsed: ExportBundle;
        try {
          parsed = JSON.parse(text) as ExportBundle;
        } catch {
          throw new Error("Import file must contain valid JSON.");
        }
        const result = await previewImport(parsed);
        setBundle(parsed);
        setPreview(result.summary);
        updateHistoryRecord(record.id, {
          status: "preview-ready",
          progress: 65,
          failureReason: null,
          summary: result.summary,
        });
        toast.success("Import preview ready.");
      } catch (err) {
        const message = getUserSafeError(err, "Failed to preview import file.");
        setError(message);
        toast.error(message);
        updateHistoryRecord(record.id, {
          status: "failed",
          progress: 100,
          completedAt: new Date().toISOString(),
          failureReason: message,
        });
      } finally {
        setIsPreviewing(false);
      }
    },
    [pushHistoryRecord, updateHistoryRecord]
  );

  const handleImport = useCallback(async () => {
    if (!bundle) return;
    setIsImporting(true);
    setError(null);
    if (activeRecordId) {
      updateHistoryRecord(activeRecordId, {
        status: "applying",
        progress: 80,
        failureReason: null,
      });
    }
    try {
      const result = await importConfig(bundle);
      setPreview(result.summary);
      if (activeRecordId) {
        updateHistoryRecord(activeRecordId, {
          status: "applied",
          progress: 100,
          completedAt: new Date().toISOString(),
          failureReason: null,
          summary: result.summary,
        });
      }
      toast.success("Import applied.");
    } catch (err) {
      const message = getUserSafeError(err, "Failed to import configuration.");
      setError(message);
      toast.error(message);
      if (activeRecordId) {
        updateHistoryRecord(activeRecordId, {
          status: "failed",
          progress: 100,
          completedAt: new Date().toISOString(),
          failureReason: message,
        });
      }
    } finally {
      setIsImporting(false);
    }
  }, [activeRecordId, bundle, updateHistoryRecord]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredHistory = normalizedSearch
    ? history.filter((record) =>
        [
          record.fileName,
          record.type,
          statusLabels[record.status],
          record.failureReason ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
      )
    : history;

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-8">
      <Card
        className={cn(
          "rounded-2xl border-2 border-dashed border-border bg-muted/40 py-10 text-center transition-colors hover:border-primary/40",
          isDragging && "border-primary/50 bg-primary-soft/40"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
            <UploadCloud className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Drop your files here</h3>
            <p className="text-sm text-muted-foreground">
              Drop or choose a .json configuration bundle up to 50MB
            </p>
          </div>
          <Button
            variant="outline"
            className="border-primary/20 bg-primary-soft text-primary-soft-foreground hover:bg-primary hover:text-primary-foreground"
            onClick={handleBrowse}
            disabled={isPreviewing || isImporting}
          >
            {isPreviewing ? "Validating..." : "Browse Files"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void handleFile(file);
              event.currentTarget.value = "";
            }}
          />
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Import error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Import Preview</p>
                <p className="text-xs text-muted-foreground">
                  Review the bundle before applying changes.
                </p>
              </div>
              <Button className="min-w-[160px]" onClick={handleImport} disabled={isImporting}>
                {isImporting ? "Importing..." : "Apply Import"}
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Settings", value: preview.settings },
                { label: "Menus", value: preview.menus },
                { label: "Menu items", value: preview.menuItems },
                { label: "Theme profiles", value: preview.themeProfiles },
                { label: "Theme routes", value: preview.themeRoutes },
                { label: "Admin templates", value: preview.adminThemeTemplates },
                { label: "Admin profiles", value: preview.adminThemeProfiles },
                { label: "Redirects", value: preview.redirects },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
            {preview.warnings.length > 0 ? (
              <div className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-xs text-warning">
                <p className="font-semibold">Warnings</p>
                <ul className="list-disc pl-4">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Recent Imports
            </p>
            <p className="text-sm text-muted-foreground">Monitor validation and upload progress.</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <Input
              type="search"
              placeholder="Search files..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <Card className="overflow-hidden rounded-2xl border-border/60 py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>File name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {history.length === 0
                        ? "No import activity in this session."
                        : "No imports match your search."}
                    </TableCell>
                  </TableRow>
                ) : null}
                {filteredHistory.map((item) => {
                  const statusStyle = statusStyles[item.status];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                            <FileJson className="size-4" />
                          </div>
                          <span className="text-sm font-medium">{item.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.type}</TableCell>
                      <TableCell>
                        <Badge variant={statusStyle.variant} className="gap-1.5">
                          <span className={cn("size-1.5 rounded-full", statusStyle.dot)} />
                          {statusLabels[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="w-full max-w-[140px]"
                          role="progressbar"
                          aria-label={`${item.fileName} import progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={item.progress}
                        >
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", statusStyle.bar)}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] text-xs text-muted-foreground">
                        {item.status === "failed" ? (
                          <div className="flex flex-col gap-2">
                            <span>{item.failureReason ?? "Import failed."}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-fit"
                              onClick={handleBrowse}
                              disabled={isPreviewing || isImporting}
                            >
                              Upload again
                            </Button>
                          </div>
                        ) : item.status === "validating" || item.status === "applying" ? (
                          <span>{item.progress}% complete</span>
                        ) : item.status === "preview-ready" ? (
                          <span>Preview is ready. Apply import to make changes.</span>
                        ) : (
                          <span>Applied.</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDateLabel(item.completedAt ?? item.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
