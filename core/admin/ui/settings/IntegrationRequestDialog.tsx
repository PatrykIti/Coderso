import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type IntegrationRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IntegrationRequestDialog({
  open,
  onOpenChange,
}: IntegrationRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Request New Integration</DialogTitle>
            <DialogDescription>
              Tell us which service you want to connect with Nextless.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close integration request dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Service name
            </label>
            <Input placeholder="e.g. HubSpot" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Website URL
            </label>
            <Input placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Notes
            </label>
            <Textarea
              rows={4}
              placeholder="Describe what you need (events, data sync, etc.)"
            />
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={() => onOpenChange(false)}>
            <Plus className="h-4 w-4" />
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
