import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import type { InstalledPlugin, UpdatePolicy } from "./types";

const statusStyle: Record<InstalledPlugin["status"], string> = {
  enabled: "border-emerald-500/30 text-emerald-600",
  disabled: "border-slate-500/30 text-slate-600",
  error: "border-rose-500/40 text-rose-600",
};

export type PluginDetailProps = {
  plugin?: InstalledPlugin;
  onToggleEnabled: (enabled: boolean) => void;
  onPolicyChange: (policy: UpdatePolicy) => void;
  onUpdate: () => void;
};

export function PluginDetail({
  plugin,
  onToggleEnabled,
  onPolicyChange,
  onUpdate,
}: PluginDetailProps) {
  if (!plugin) {
    return (
      <Card className="flex h-full items-center justify-center border-dashed">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Select an installed plugin to manage updates and policy.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted/60">
      <CardContent className="flex h-full flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">{plugin.name}</p>
            <p className="text-sm text-muted-foreground">v{plugin.version}</p>
          </div>
          <Badge variant="outline" className={statusStyle[plugin.status]}>
            {plugin.status}
          </Badge>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <p>Last updated: {plugin.lastUpdated}</p>
          <p>Permissions: {plugin.permissions.join(", ")}</p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Enabled</p>
              <p className="text-xs text-muted-foreground">
                Disable to stop runtime hooks and admin UI.
              </p>
            </div>
            <Switch
              checked={plugin.enabled}
              onCheckedChange={(checked) => onToggleEnabled(checked)}
            />
          </div>

          <div>
            <p className="text-sm font-semibold">Update policy</p>
            <p className="text-xs text-muted-foreground">
              Auto-security applies only signed security releases.
            </p>
            <Select
              value={plugin.policy}
              onValueChange={(value) => onPolicyChange(value as UpdatePolicy)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="auto-security">Auto-security</SelectItem>
                <SelectItem value="auto-all">Auto-all</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {plugin.updateAvailable && (
            <Alert>
              <AlertTitle>Update available</AlertTitle>
              <AlertDescription>
                New version {plugin.updateAvailable} is ready to install.
              </AlertDescription>
            </Alert>
          )}

          {plugin.status === "error" && plugin.lastError && (
            <Alert variant="destructive">
              <AlertTitle>Plugin error</AlertTitle>
              <AlertDescription>{plugin.lastError}</AlertDescription>
            </Alert>
          )}
        </div>

        <Button className="mt-auto" onClick={onUpdate}>
          Run update check
        </Button>
      </CardContent>
    </Card>
  );
}
