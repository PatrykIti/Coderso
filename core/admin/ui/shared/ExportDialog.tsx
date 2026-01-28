import { Download } from "lucide-react";

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

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  filename: string;
  fields: Array<{ id: string; label: string; defaultChecked?: boolean }>;
};

export function ExportDialog({
  open,
  onOpenChange,
  title,
  description,
  filename,
  fields,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Select defaultValue="csv">
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Include fields
            </p>
            <div className="grid gap-2">
              {fields.map((field) => (
                <label key={field.id} className="flex items-center gap-2 text-sm">
                  <Checkbox defaultChecked={field.defaultChecked} />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
            Export will include data from the current filters. File name:{" "}
            <span className="font-semibold text-foreground">{filename}</span>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
