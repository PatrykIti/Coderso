import { X } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

export type MenuCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { name: string; location?: string }) => Promise<void> | void;
};

export function MenuCreateDialog({
  open,
  onOpenChange,
  onCreate,
}: MenuCreateDialogProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Menu name is required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreate({ name: trimmed, location: location.trim() || undefined });
      setName("");
      setLocation("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Failed to create menu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Create Menu</DialogTitle>
            <DialogDescription>
              Add a new navigation menu and start arranging links.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close create menu dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Menu name
            </label>
            <Input
              placeholder="Main Menu"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Location (optional)
            </label>
            <Input
              placeholder="primary"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Theme slot identifier such as <code>primary</code> or{" "}
              <code>footer</code>. Use the value your frontend theme expects for
              navigation placement.
            </p>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Menu"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
