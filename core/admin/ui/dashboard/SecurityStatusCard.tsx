import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SecurityStatusCard() {
  return (
    <Card className="border-border/60">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Security Status</h3>
            <p className="text-xs text-muted-foreground">System protected</p>
          </div>
        </div>
        <div className="space-y-2 border-t pt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            SSL Certificate Valid
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Backups Up-to-date
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock3 className="h-4 w-4" />
            Last scan: 2m ago
          </div>
        </div>
        <Button variant="outline" className="w-full">
          Run Security Scan
        </Button>
      </CardContent>
    </Card>
  );
}
