import { Plus, X } from "lucide-react";
import { useState } from "react";

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
import { useRegisterSettingsDirty } from "@/ui/settings/SettingsDirtyNavigation";

type IntegrationRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (payload: { name: string; website?: string | null; notes?: string | null }) => void;
  isSubmitting?: boolean;
  error?: string | null;
};

export function IntegrationRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  error,
}: IntegrationRequestDialogProps) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  useRegisterSettingsDirty(
    open && (name.trim().length > 0 || website.trim().length > 0 || notes.trim().length > 0)
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setLocalError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setLocalError("Please provide a service name.");
      return;
    }
    setLocalError(null);
    onSubmit?.({
      name: name.trim(),
      website: website.trim() ? website.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Request New Integration</DialogTitle>
            <DialogDescription>
              Tell us which service you want to connect with Coderso.
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
          {error || localError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error ?? localError}
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Service name
            </label>
            <Input
              placeholder="e.g. HubSpot"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Website URL
            </label>
            <Input
              placeholder="https://..."
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Notes</label>
            <Textarea
              rows={4}
              placeholder="Describe what you need (events, data sync, etc.)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={handleSubmit} disabled={isSubmitting}>
            <Plus className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
