import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Info,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type PluginDetailsPermission = {
  scope: string;
  access: "Read" | "Write" | "Admin";
  description: string;
};

export type PluginDetailsChangelogEntry = {
  version: string;
  date: string;
  type: "security" | "feature" | "fix";
  highlights: string[];
};

export type PluginDetailsSetting = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type PluginDetailsInfoItem = {
  label: string;
  value: string;
  note?: string;
  actionLabel?: string;
};

export type PluginDetailsData = {
  description: string;
  features: string[];
  screenshots: { title: string; src?: string }[];
  info: PluginDetailsInfoItem[];
  support: {
    title: string;
    description: string;
    cta: string;
  };
  permissions: PluginDetailsPermission[];
  changelog: PluginDetailsChangelogEntry[];
  settings: PluginDetailsSetting[];
};

const permissionBadgeStyles: Record<PluginDetailsPermission["access"], string> = {
  Read: "border-emerald-500/30 text-emerald-600",
  Write: "border-amber-500/40 text-amber-600",
  Admin: "border-rose-500/40 text-rose-600",
};

const changelogBadgeStyles: Record<PluginDetailsChangelogEntry["type"], string> = {
  security: "border-rose-200 bg-rose-50 text-rose-700",
  feature: "border-sky-200 bg-sky-50 text-sky-700",
  fix: "border-amber-200 bg-amber-50 text-amber-700",
};

const infoIcons: Record<string, ReactNode> = {
  Author: <User className="h-4 w-4 text-muted-foreground" />,
  Compatibility: <ShieldCheck className="h-4 w-4 text-muted-foreground" />,
  "Installed on": <CalendarDays className="h-4 w-4 text-muted-foreground" />,
  License: <Lock className="h-4 w-4 text-muted-foreground" />,
};

export type PluginDetailsTabsProps = {
  data: PluginDetailsData;
};

export function PluginDetailsTabs({ data }: PluginDetailsTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList variant="line" className="border-b border-border pb-2">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
        <TabsTrigger value="changelog">Changelog</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <div className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
          <div className="space-y-6">
            <Card className="border-border/60">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {data.description}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Key features include:</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {data.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="space-y-4">
                <h3 className="text-lg font-semibold">Screenshots</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.screenshots.map((shot) => (
                    <div
                      key={shot.title}
                      className="group relative aspect-video overflow-hidden rounded-xl border bg-muted/30"
                    >
                      {shot.src ? (
                        <img
                          src={shot.src}
                          alt={shot.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          {shot.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/60">
              <CardContent className="space-y-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Plugin information
                </p>
                <div className="space-y-5">
                  {data.info.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                        {infoIcons[item.label] ?? (
                          <Info className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {item.value}
                        </p>
                        {item.note ? (
                          <p className="text-xs text-emerald-600">{item.note}</p>
                        ) : null}
                        {item.actionLabel ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                          >
                            {item.actionLabel}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Info className="h-4 w-4" />
                  <p className="text-sm font-semibold">{data.support.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.support.description}
                </p>
                <Button variant="outline" className="w-full text-xs">
                  {data.support.cta}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="permissions" className="mt-6">
        <Card className="border-border/60">
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Permissions</h3>
                <p className="text-sm text-muted-foreground">
                  Review the runtime scopes required by this plugin.
                </p>
              </div>
              <Badge variant="secondary">{data.permissions.length} scopes</Badge>
            </div>
            <Separator />
            <ScrollArea className="h-[260px] pr-2">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.permissions.map((permission) => (
                    <TableRow key={permission.scope}>
                      <TableCell className="font-medium">
                        {permission.scope}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={permissionBadgeStyles[permission.access]}
                        >
                          {permission.access}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {permission.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="changelog" className="mt-6">
        <Card className="border-border/60">
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Changelog</h3>
                <p className="text-sm text-muted-foreground">
                  Recent releases and compatibility notes.
                </p>
              </div>
              <Badge variant="secondary">Last 3 releases</Badge>
            </div>
            <Separator />
            <ScrollArea className="h-[320px] pr-3">
              <div className="relative space-y-6 pl-6">
                <div className="absolute left-2 top-0 h-full w-px bg-border" />
                {data.changelog.map((entry) => (
                  <div
                    key={entry.version}
                    className="relative rounded-xl border bg-muted/30 p-4"
                  >
                    <div className="absolute -left-6 top-6 flex h-3 w-3 items-center justify-center rounded-full border bg-background">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">v{entry.version}</p>
                        <p className="text-xs text-muted-foreground">{entry.date}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("capitalize", changelogBadgeStyles[entry.type])}
                      >
                        {entry.type}
                      </Badge>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {entry.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="border-border/60">
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure automation and integrations for this plugin.
                  </p>
                </div>
                <Badge variant="secondary">{data.settings.length} toggles</Badge>
              </div>
              <Separator />
              <div className="space-y-4">
                {data.settings.map((setting, index) => (
                  <div key={setting.id} className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                      <Switch defaultChecked={setting.enabled} />
                    </div>
                    {index < data.settings.length - 1 ? <Separator /> : null}
                  </div>
                ))}
              </div>
              <Button className="w-full">Save settings</Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                  Status
                </p>
                <p className="mt-1 text-sm font-medium text-emerald-700">
                  All checks passed
                </p>
                <p className="text-xs text-emerald-600">
                  No conflicts detected with the current core version.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Maintenance window</p>
                <p className="text-xs text-muted-foreground">
                  Updates will install on Tuesdays between 02:00 and 04:00 UTC.
                </p>
              </div>
              <Button variant="outline" className="w-full text-xs">
                Review update schedule
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
