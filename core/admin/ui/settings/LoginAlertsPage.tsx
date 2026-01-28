import {
  BellRing,
  Mail,
  Share2,
  ShieldAlert,
  Users,
  Webhook,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { LoginAlertsCard } from "./LoginAlertsCard";
import { SettingsSidebar } from "./SettingsSidebar";

const tabTriggerClassName = "after:bg-primary data-[state=active]:text-primary";

export function LoginAlertsPage() {
  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="security" />}
      showSearch={false}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Security</span>
          <span>/</span>
          <span className="text-foreground">Login Alerts</span>
        </div>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="border-b bg-background px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Login Alerts
              </h1>
              <p className="text-sm text-muted-foreground">
                Security • Notifications &amp; Protection
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              System Status: Active
            </span>
          </div>
        </div>

        <Tabs
          defaultValue="login-alerts"
          className="flex flex-1 flex-col"
        >
          <div className="border-b bg-background px-6">
            <TabsList variant="line" className="h-12 gap-6">
              <TabsTrigger value="general" className={tabTriggerClassName}>
                General
              </TabsTrigger>
              <TabsTrigger value="active-sessions" className={tabTriggerClassName}>
                Active Sessions
              </TabsTrigger>
              <TabsTrigger
                value="login-alerts"
                className={tabTriggerClassName}
              >
                Login Alerts
              </TabsTrigger>
              <TabsTrigger value="audit-log" className={tabTriggerClassName}>
                Audit Log
              </TabsTrigger>
              <TabsTrigger value="two-factor" className={tabTriggerClassName}>
                Two-Factor Auth
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="login-alerts" className="flex-1 pb-28 pt-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6">
              <LoginAlertsCard
                title="Suspicious Login Alerts"
                description="Get notified whenever someone logs in from a new device, browser, or location."
                icon={<BellRing className="h-5 w-5" />}
                iconWrapperClassName="bg-primary/10 text-primary"
                checked
              />

              <Card className="border-border/60 shadow-sm">
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold">
                        Brute Force Protection
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Protect your account from automated login attempts by
                        setting a lockout threshold.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 pl-14">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Failed attempts threshold
                      </span>
                      <span className="font-semibold text-primary">
                        5 attempts
                      </span>
                    </div>
                    <Slider
                      defaultValue={[5]}
                      min={3}
                      max={15}
                      step={1}
                      aria-label="Failed attempts threshold"
                    />
                    <p className="text-xs text-muted-foreground italic">
                      User will be temporarily locked out for 30 minutes after
                      reaching the threshold.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold">Recipients</h2>
                      <p className="text-sm text-muted-foreground">
                        Choose who receives the security alerts and system
                        warnings.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4 pl-14">
                    <LoginAlertsCard
                      title="Admin-only alerts"
                      description="Send notifications only to account administrators."
                      checked
                      switchSize="sm"
                      className="border-muted/60 bg-muted/40 py-4 shadow-none"
                      contentClassName="px-4"
                    />
                    <Separator className="bg-border/60" />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Custom Email List
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="security@company.com, admin@company.com"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Comma separated list of email addresses.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold">
                        Notification Channels
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Select the platforms where you want to receive security
                        events.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 pl-14 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Email</span>
                      </div>
                      <Switch size="sm" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Webhook className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Webhook</span>
                      </div>
                      <Switch size="sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 mt-auto border-t bg-background/80 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Unsaved changes in Security settings
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost">Discard</Button>
              <Button>Save Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
