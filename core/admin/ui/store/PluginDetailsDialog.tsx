import { CalendarDays, Download, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { PluginSummary } from "./types";

const statusLabel: Record<PluginSummary["status"], string> = {
  verified: "Security verified",
  official: "Official",
  community: "Community",
};

export type PluginDetailsDialogProps = {
  plugin: PluginSummary;
  triggerLabel?: string;
};

export function PluginDetailsDialog({
  plugin,
  triggerLabel = "View details",
}: PluginDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="gap-3">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {plugin.icon}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{plugin.name}</DialogTitle>
              <DialogDescription>{plugin.description}</DialogDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  v{plugin.version}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {statusLabel[plugin.status]}
                </Badge>
                {plugin.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <Button className="shrink-0">
              {plugin.installed ? "Open" : "Install"}
            </Button>
          </div>
        </DialogHeader>
        <Separator />
        <Tabs defaultValue="overview">
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="changelog">Changelog</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This plugin integrates directly with the Coderso runtime and is
              updated automatically when new security patches are released.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Downloads
                </p>
                <p className="mt-1 text-lg font-semibold">{plugin.downloads}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Last updated
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {plugin.lastUpdated}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="security" className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm font-medium">Security score</p>
                </div>
                <span className="text-sm font-semibold">
                  {plugin.securityScore}%
                </span>
              </div>
              <Progress value={plugin.securityScore} className="mt-3" />
              <p className="mt-3 text-xs text-muted-foreground">
                Automated CVE scans plus dependency checks.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Verified sources
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Download className="h-4 w-4 text-muted-foreground" />
                Bundles signed and hosted by Coderso Store.
              </div>
            </div>
          </TabsContent>
          <TabsContent value="changelog" className="space-y-3">
            {plugin.changelog.map((entry) => (
              <div key={entry} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm">{entry}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
