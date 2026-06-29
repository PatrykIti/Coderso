import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Download } from "lucide-react";

const defaultCodes = [
  "X8Y2-99L1",
  "M4K2-11OP",
  "Q2Z9-44R3",
  "A7B3-88C1",
  "••••-••••",
  "••••-••••",
  "••••-••••",
  "••••-••••",
];

type RecoveryCodesPanelProps = {
  codes?: string[];
};

export function RecoveryCodesPanel({ codes = defaultCodes }: RecoveryCodesPanelProps) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="space-y-6 p-6">
        <Alert variant="warning">
          <AlertTitle>Save your recovery codes</AlertTitle>
          <AlertDescription>
            If you lose access to your device, use these backup codes to access your account. Store
            them safely.
          </AlertDescription>
        </Alert>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Recovery Codes</h4>
            <p className="text-xs text-muted-foreground">
              One-time use tokens for account recovery.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-2">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {codes.map((code, index) => (
            <Badge
              key={`${code}-${index}`}
              variant="outline"
              className="justify-center rounded-md bg-background px-3 py-2 font-mono text-xs"
            >
              {code}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
