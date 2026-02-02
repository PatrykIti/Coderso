import { Code2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type WidgetCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WidgetCreateDialog({
  open,
  onOpenChange,
}: WidgetCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Custom Widget</DialogTitle>
            <DialogDescription>
              Create a reusable widget template for your pages.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close custom widget dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Widget name <span className="text-destructive">*</span>
            </label>
            <Input placeholder="Featured Service Card" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <Textarea rows={3} placeholder="Explain the purpose of this widget." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <Select defaultValue="content">
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="layout">Layout</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="forms">Forms</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Base template
              </label>
              <Select defaultValue="blank">
                <SelectTrigger>
                  <SelectValue placeholder="Start from..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">Start from Hero</SelectItem>
                  <SelectItem value="timeline">Timeline</SelectItem>
                  <SelectItem value="blank">Blank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Code2 className="h-4 w-4 text-primary" />
              Developer note
            </div>
            <p className="mt-2">
              Custom widgets can be reused across pages. Updates will apply everywhere
              the widget is used.
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Create Widget</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
