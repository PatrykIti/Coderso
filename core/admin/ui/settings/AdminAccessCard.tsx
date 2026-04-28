import { Shield } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

type AdminAccessCardProps = {
  adminPath: string;
  redirectEnabled: boolean;
  error?: string | null;
  onChange?: (next: { adminPath: string; redirectEnabled: boolean }) => void;
  disabled?: boolean;
};

export function AdminAccessCard({
  adminPath,
  redirectEnabled,
  error,
  onChange,
  disabled = false,
}: AdminAccessCardProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Admin Access Path</CardTitle>
            <CardDescription>
              Customize the admin URL and redirect behavior for the admin host.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="admin-path">
              Admin path
            </label>
            <Input
              id="admin-path"
              value={adminPath}
              placeholder="/admin"
              onChange={(event) =>
                onChange?.({ adminPath: event.target.value, redirectEnabled })
              }
              disabled={disabled}
              aria-invalid={error ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Use a single segment path (e.g. /admin-panel).
            </p>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Redirect admin host root</p>
              <p className="text-xs text-muted-foreground">
                When enabled, visiting the admin host root redirects to the admin path.
              </p>
            </div>
            <Switch
              checked={redirectEnabled}
              onCheckedChange={(checked) =>
                onChange?.({ adminPath, redirectEnabled: checked })
              }
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
