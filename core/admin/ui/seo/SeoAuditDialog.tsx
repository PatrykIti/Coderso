import { useState } from "react";
import { RefreshCw, SearchCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { seoAuditCheckIds, type SeoAuditCheckId } from "@/services/seoClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const auditChecks = [
  {
    id: "meta",
    label: "Meta titles & descriptions",
    description: "Validate length, uniqueness, and missing tags.",
  },
  {
    id: "links",
    label: "Canonical links",
    description: "Check missing or invalid canonical URLs.",
  },
  {
    id: "robots",
    label: "Robots directives",
    description: "Validate index and follow directives.",
  },
] satisfies Array<{
  id: SeoAuditCheckId;
  label: string;
  description: string;
}>;

type SeoAuditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun: (checks: SeoAuditCheckId[]) => Promise<void> | void;
  isRunning?: boolean;
};

export function SeoAuditDialog({
  open,
  onOpenChange,
  onRun,
  isRunning = false,
}: SeoAuditDialogProps) {
  const [selectedChecks, setSelectedChecks] = useState<SeoAuditCheckId[]>([...seoAuditCheckIds]);

  const updateCheck = (checkId: SeoAuditCheckId, checked: boolean) => {
    setSelectedChecks((current) => {
      if (checked) return current.includes(checkId) ? current : [...current, checkId];
      return current.filter((item) => item !== checkId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Run SEO Audit</DialogTitle>
          <DialogDescription>
            Choose the checks to run across your content library.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
              <SearchCheck className="h-4 w-4 text-primary" />
              Full-site SEO audit
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The audit can take several minutes depending on your content size.
            </p>
          </div>
          <div className="space-y-3">
            {auditChecks.map((check) => (
              <label
                key={check.id}
                className="flex items-start gap-3 rounded-xl border bg-background/60 p-3"
              >
                <Checkbox
                  checked={selectedChecks.includes(check.id)}
                  onCheckedChange={(checked) => updateCheck(check.id, checked === true)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="gap-2"
            onClick={async () => {
              await onRun(selectedChecks);
              onOpenChange(false);
            }}
            disabled={isRunning || selectedChecks.length === 0}
          >
            <RefreshCw className="h-4 w-4" />
            {isRunning ? "Running..." : "Start Audit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
