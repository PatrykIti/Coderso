import type { ReactNode } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ImageIcon,
  Info,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard } from "@/ui/shared/SectionCard";

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

// TASK-479-24-L02: token-driven access tones (replaces the permissionBadgeStyles
// hex map).
const accessVariant: Record<
  PluginDetailsPermission["access"],
  "success" | "warning" | "destructive"
> = {
  Read: "success",
  Write: "warning",
  Admin: "destructive",
};

// TASK-479-24-L02: token-driven changelog tones (replaces the changelogBadgeStyles
// hex map).
const changelogVariant: Record<
  PluginDetailsChangelogEntry["type"],
  "destructive" | "info" | "warning"
> = {
  security: "destructive",
  feature: "info",
  fix: "warning",
};

const infoIcons: Record<string, ReactNode> = {
  Author: <User />,
  Compatibility: <ShieldCheck />,
  "Installed on": <CalendarDays />,
  License: <Lock />,
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <SectionCard title="Description" icon={<Info />}>
              <p className="text-sm leading-relaxed text-muted-foreground">{data.description}</p>
            </SectionCard>

            <SectionCard title="What's included" icon={<Check />}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Screenshots" icon={<ImageIcon />}>
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
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <SectionCard title="Information">
              <dl className="flex flex-col divide-y divide-border text-sm">
                {data.info.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
                      {infoIcons[item.label] ?? <Info />}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.label}
                      </dt>
                      <dd className="text-sm font-medium text-foreground">{item.value}</dd>
                      {item.note ? <p className="text-xs text-success">{item.note}</p> : null}
                      {item.actionLabel ? (
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                          {item.actionLabel}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </dl>
            </SectionCard>

            <SectionCard title="Permissions" icon={<Lock />}>
              <ul className="flex flex-col gap-3">
                {data.permissions.map((permission) => (
                  <li key={permission.scope} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-3.5">
                      <Lock />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{permission.scope}</span>
                        <Badge variant={accessVariant[permission.access]}>
                          {permission.access}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{permission.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title={data.support.title} icon={<Info />}>
              <p className="text-xs text-muted-foreground">{data.support.description}</p>
              <Button variant="outline" className="mt-4 w-full text-xs">
                {data.support.cta}
              </Button>
            </SectionCard>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="permissions" className="mt-6">
        <SectionCard
          title="Permissions"
          description="Review the runtime scopes required by this plugin."
          icon={<ShieldCheck />}
          action={<Badge variant="secondary">{data.permissions.length} scopes</Badge>}
        >
          <ul className="flex flex-col divide-y divide-border">
            {data.permissions.map((permission) => (
              <li
                key={permission.scope}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">{permission.scope}</p>
                  <p className="text-sm text-muted-foreground">{permission.description}</p>
                </div>
                <Badge variant={accessVariant[permission.access]}>{permission.access}</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
      </TabsContent>

      <TabsContent value="changelog" className="mt-6">
        <SectionCard
          title="Changelog"
          description="Recent releases and compatibility notes."
          icon={<CalendarDays />}
          action={<Badge variant="secondary">Last {data.changelog.length} releases</Badge>}
        >
          <div className="relative space-y-6 pl-6">
            <div className="absolute left-2 top-0 h-full w-px bg-border" />
            {data.changelog.map((entry) => (
              <div key={entry.version} className="relative rounded-xl border bg-muted/30 p-4">
                <div className="absolute -left-6 top-6 flex size-3 items-center justify-center rounded-full border bg-background">
                  <div className="size-1.5 rounded-full bg-primary" />
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">v{entry.version}</p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                  </div>
                  <Badge variant={changelogVariant[entry.type]} className="capitalize">
                    {entry.type}
                  </Badge>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {entry.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <SectionCard
            title="Settings"
            description="Configure automation and integrations for this plugin."
            icon={<Info />}
            action={<Badge variant="secondary">{data.settings.length} toggles</Badge>}
          >
            <div className="space-y-4">
              {data.settings.map((setting, index) => (
                <div key={setting.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{setting.label}</p>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    </div>
                    <Switch defaultChecked={setting.enabled} />
                  </div>
                  {index < data.settings.length - 1 ? <Separator /> : null}
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full">Save settings</Button>
          </SectionCard>

          <SectionCard title="Status" icon={<ShieldCheck />}>
            <div className="rounded-xl border border-success/30 bg-success-soft p-3">
              <p className="text-sm font-medium text-success">All checks passed</p>
              <p className="mt-1 text-xs text-success">
                No conflicts detected with the current core version.
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Maintenance window</p>
              <p className="text-xs text-muted-foreground">
                Updates will install on Tuesdays between 02:00 and 04:00 UTC.
              </p>
            </div>
            <Button variant="outline" className="mt-4 w-full text-xs">
              Review update schedule
            </Button>
          </SectionCard>
        </div>
      </TabsContent>
    </Tabs>
  );
}
