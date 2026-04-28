import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

type ThemeExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ThemeExportDialog({ open, onOpenChange }: ThemeExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Export Theme Config</DialogTitle>
            <DialogDescription>
              Choose which parts of the theme to export.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close export dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-3 px-6 py-5">
          {[
            { id: "tokens", label: "Design tokens", checked: true },
            { id: "templates", label: "Template presets", checked: true },
            { id: "typography", label: "Typography scale", checked: false },
            { id: "breakpoints", label: "Responsive breakpoints", checked: false },
          ].map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked={item.checked} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={() => onOpenChange(false)}>
            <Download className="h-4 w-4" />
            Export Config
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
