import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type ExportDialogFormat = "csv" | "json";

export type ExportDialogPayload = {
  format: ExportDialogFormat;
  fields: string[];
};

export type ExportField = {
  id: string;
  label: string;
  defaultChecked?: boolean;
};

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  filename: string;
  fields: ExportField[];
  onExport?: (payload: ExportDialogPayload) => Promise<void> | void;
  unavailableReason?: string;
};

const formatOptions: Array<{ value: ExportDialogFormat; label: string }> = [
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
];

const resolveInitialFields = (fields: ExportField[]) =>
  fields.filter((field) => field.defaultChecked !== false).map((field) => field.id);

const toErrorMessage = (error: unknown) =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Export failed. Review the issue and try again.";

export function ExportDialog({
  open,
  onOpenChange,
  title,
  description,
  filename,
  fields,
  onExport,
  unavailableReason,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportDialogFormat>("csv");
  const [selectedFields, setSelectedFields] = useState<string[]>(() =>
    resolveInitialFields(fields)
  );
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const selectedFieldSet = useMemo(() => new Set(selectedFields), [selectedFields]);
  const unavailableCopy =
    unavailableReason ?? (!onExport ? "Export is not available for this surface yet." : null);
  const canSubmit = Boolean(onExport) && !unavailableCopy && selectedFields.length > 0;
  const isSubmitting = status === "submitting";

  const resetDialogState = () => {
    setFormat("csv");
    setSelectedFields(resolveInitialFields(fields));
    setStatus("idle");
    setMessage(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting && !nextOpen) return;
    if (!nextOpen) resetDialogState();
    onOpenChange(nextOpen);
  };

  const handleFieldChange = (fieldId: string, checked: boolean) => {
    setSelectedFields((current) => {
      if (checked) return Array.from(new Set([...current, fieldId]));
      return current.filter((item) => item !== fieldId);
    });
    setMessage(null);
    setStatus("idle");
  };

  const handleSubmit = async () => {
    if (!onExport || unavailableCopy) return;
    if (selectedFields.length === 0) {
      setStatus("error");
      setMessage("Select at least one field to export.");
      return;
    }
    setStatus("submitting");
    setMessage(null);
    try {
      await onExport({ format, fields: selectedFields });
      setStatus("success");
      setMessage("Export started.");
    } catch (error) {
      setStatus("error");
      setMessage(toErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              File format
            </label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportDialogFormat)}
              disabled={isSubmitting || Boolean(unavailableCopy)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Include fields</p>
            <div className="grid gap-2">
              {fields.map((field) => (
                <label key={field.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedFieldSet.has(field.id)}
                    disabled={isSubmitting || Boolean(unavailableCopy)}
                    onCheckedChange={(checked) => handleFieldChange(field.id, checked === true)}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>
          {unavailableCopy ? (
            <Alert>
              <AlertDescription>{unavailableCopy}</AlertDescription>
            </Alert>
          ) : null}
          {message ? (
            <Alert variant={status === "error" ? "destructive" : "default"}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
            Export will include data from the current filters. File name:{" "}
            <span className="font-semibold text-foreground">{filename}</span>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || isSubmitting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isSubmitting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
