import { Puzzle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/ui/shared/SectionCard";

import type { InstalledPlugin, UpdatePolicy } from "./types";

// TASK-479-24-L01: token-driven status tones (replaces the local emerald/slate/rose
// hex map).
const statusVariant: Record<InstalledPlugin["status"], "success" | "secondary" | "destructive"> = {
  enabled: "success",
  disabled: "secondary",
  error: "destructive",
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
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
        Select an installed plugin to manage updates and policy.
      </div>
    );
  }

  return (
    <SectionCard
      title={plugin.name}
      description={`v${plugin.version}`}
      icon={<Puzzle />}
      action={
        <Badge variant={statusVariant[plugin.status]} className="capitalize">
          {plugin.status}
        </Badge>
      }
      bodyClassName="flex flex-col gap-6 p-5"
    >
      <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
        <p>Last updated: {plugin.lastUpdated}</p>
        <p>Permissions: {plugin.permissions.join(", ")}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Enabled</p>
          <p className="text-xs text-muted-foreground">
            Disable to stop runtime hooks and admin UI.
          </p>
        </div>
        <Switch checked={plugin.enabled} onCheckedChange={(checked) => onToggleEnabled(checked)} />
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

      <Button className="mt-auto" onClick={onUpdate}>
        Run update check
      </Button>
    </SectionCard>
  );
}
