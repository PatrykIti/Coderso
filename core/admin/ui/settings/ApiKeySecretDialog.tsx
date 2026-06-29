import { Copy, X } from "lucide-react";

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

type ApiKeySecretDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  secret: string;
};

export function ApiKeySecretDialog({ open, onOpenChange, name, secret }: ApiKeySecretDialogProps) {
  const handleCopy = () => {
    if (typeof navigator === "undefined") return;
    void navigator.clipboard.writeText(secret);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>API Key created</DialogTitle>
            <DialogDescription>
              Copy the key for <span className="font-medium text-foreground">{name}</span>. You
              won&apos;t be able to view it again.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close API key dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">API Key</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={secret} readOnly className="font-mono text-xs" />
              <Button variant="outline" className="gap-2" type="button" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-transparent bg-warning-soft p-3 text-xs text-warning">
            Store this key securely. If you lose it, you will need to rotate the key to generate a
            new one.
          </div>
        </div>
        <Separator />
        <div className="flex justify-end bg-muted/30 px-6 py-4">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
