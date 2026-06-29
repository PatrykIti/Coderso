import { ShieldCheck, Sparkles } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import type { StoreCatalogItem, StoreCatalogVersion } from "./types";

export type StoreDetailProps = {
  plugin?: StoreCatalogItem;
  selectedVersion?: string;
  onSelectVersion: (version: string) => void;
  onInstall: (version: string) => void;
  onUpdate: (version: string) => void;
};

function getSelectedVersion(
  plugin: StoreCatalogItem | undefined,
  selectedVersion?: string
): StoreCatalogVersion | undefined {
  if (!plugin) return undefined;
  if (!selectedVersion) return plugin.versions[0];
  return plugin.versions.find((version) => version.version === selectedVersion);
}

export function StoreDetail({
  plugin,
  selectedVersion,
  onSelectVersion,
  onInstall,
  onUpdate,
}: StoreDetailProps) {
  if (!plugin) {
    return (
      <Card className="flex h-full items-center justify-center border-dashed">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Select a plugin to see details and install options.
        </CardContent>
      </Card>
    );
  }

  const version = getSelectedVersion(plugin, selectedVersion);
  const releaseType = version?.releaseType ?? "normal";
  const compatible = version?.compatible ?? true;
  const isInstalled = Boolean(plugin.installedVersion);

  return (
    <Card className="border-muted/60">
      <CardContent className="flex h-full flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">{plugin.name}</p>
            <p className="text-sm text-muted-foreground">{plugin.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {plugin.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="capitalize">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <Badge variant="outline" className="capitalize">
            {plugin.status}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Security score</p>
            <p className="text-lg font-semibold">{plugin.securityScore}%</p>
            <Progress value={plugin.securityScore} className="mt-2" />
          </div>
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Latest update</p>
            <p className="text-lg font-semibold">{plugin.lastUpdated}</p>
            <p className="text-xs text-muted-foreground">{plugin.downloads}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Version</p>
            <Badge variant={releaseType === "security" ? "default" : "secondary"}>
              {releaseType}
            </Badge>
          </div>
          <Select value={version?.version ?? ""} onValueChange={(value) => onSelectVersion(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {plugin.versions.map((item) => (
                <SelectItem key={item.version} value={item.version}>
                  v{item.version} {item.releaseType === "security" ? "(security)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {compatible ? (
              <Badge variant="success">Compatible with current core</Badge>
            ) : (
              <Badge variant="warning">Requires core update</Badge>
            )}
            <span>Installed: {plugin.installedVersion ?? "Not installed"}</span>
          </div>
        </div>

        {!compatible && (
          <Alert variant="destructive">
            <AlertDescription>
              This version requires a newer core. Update core or select a compatible version.
            </AlertDescription>
          </Alert>
        )}

        {isInstalled && releaseType !== "security" && (
          <Alert>
            <AlertDescription className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4" />
              This update is not marked as a security release and will require manual approval.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-auto flex flex-col gap-3">
          <Button
            className="w-full"
            disabled={!compatible}
            onClick={() => {
              if (!version) return;
              if (isInstalled) {
                onUpdate(version.version);
              } else {
                onInstall(version.version);
              }
            }}
          >
            {isInstalled ? "Update plugin" : "Install plugin"}
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            All plugins are scanned and signed before publishing.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
