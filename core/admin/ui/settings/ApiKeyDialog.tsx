import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const scopeOptions = [
  {
    id: "content.read",
    label: "Content Read",
    description: "Read published entries and page content.",
    defaultChecked: true,
  },
  {
    id: "content.write",
    label: "Content Write",
    description: "Create and update entries or pages.",
  },
  {
    id: "media.read",
    label: "Media Read",
    description: "Access media asset metadata and files.",
    defaultChecked: true,
  },
  {
    id: "media.manage",
    label: "Media Manage",
    description: "Upload, edit, and delete media assets.",
  },
  {
    id: "settings.read",
    label: "Settings Read",
    description: "View configuration details and audit logs.",
  },
  {
    id: "settings.write",
    label: "Settings Write",
    description: "Update settings, roles, and team access.",
  },
];

type ApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate credentials for integrations and automation.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close create API key dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-5 px-6 py-5">
            <div className="space-y-2">
              <label
                htmlFor="api-key-name"
                className="text-sm font-semibold text-foreground"
              >
                Key Name
              </label>
              <Input
                id="api-key-name"
                placeholder="e.g. Analytics Pipeline"
                className="bg-muted/40"
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Scopes</p>
                <p className="text-xs text-muted-foreground">
                  Limit access to only the permissions you need.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30">
                <div className="space-y-3 p-4">
                  {scopeOptions.map((scope) => (
                    <label
                      key={scope.id}
                      className="flex items-start gap-3 rounded-xl border bg-background/60 p-3 transition-colors hover:bg-muted/40"
                    >
                      <Checkbox
                        className="mt-1"
                        defaultChecked={scope.defaultChecked}
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {scope.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {scope.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <div className="bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>Create Key</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
