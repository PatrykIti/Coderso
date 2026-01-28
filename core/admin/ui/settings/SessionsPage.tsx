import { Info, Laptop, LogOut, Monitor, ShieldCheck, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { SessionsTable, type SessionItem } from "./SessionsTable";
import { SettingsSidebar } from "./SettingsSidebar";

const tabs = [
  { id: "general", label: "General" },
  { id: "sessions", label: "Active Sessions" },
  { id: "audit", label: "Audit Log" },
  { id: "two-factor", label: "Two-Factor Auth" },
];

const sessions: SessionItem[] = [
  {
    id: "session-1",
    device: "Chrome on macOS",
    deviceDetail: "Apple MacBook Pro 14\"",
    location: "San Francisco, USA",
    ipAddress: "192.168.1.1",
    lastActive: "Just now",
    status: "current",
    canRevoke: false,
    icon: Monitor,
  },
  {
    id: "session-2",
    device: "Safari on iPhone 13",
    deviceDetail: "iOS 16.2",
    location: "London, UK",
    ipAddress: "82.12.34.120",
    lastActive: "2 hours ago",
    status: "inactive",
    canRevoke: true,
    icon: Smartphone,
  },
  {
    id: "session-3",
    device: "Edge on Windows 11",
    deviceDetail: "Dell XPS 15",
    location: "Berlin, Germany",
    ipAddress: "144.92.11.5",
    lastActive: "3 days ago",
    status: "inactive",
    canRevoke: true,
    icon: Laptop,
  },
];

export function SessionsPage() {
  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="security" />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span>Security</span>
          <span>/</span>
          <span className="text-foreground">Sessions</span>
        </div>
      }
      topbarActions={
        <Button variant="destructive" size="sm" className="gap-2">
          <LogOut className="h-4 w-4" />
          Revoke All Other Sessions
        </Button>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-4">
          <h1 className="text-2xl font-semibold">Security Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Account Security / Monitoring
          </p>
        </div>
        <div className="border-b bg-background px-6">
          <div className="flex flex-wrap gap-6 text-sm font-medium">
            {tabs.map((tab) => {
              const isActive = tab.id === "sessions";
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "border-b-2 py-3 transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Where you&apos;re signed in</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your active sessions on other devices and locations.
                </p>
              </div>
              <Badge
                variant="secondary"
                className="gap-2 rounded-lg bg-muted/60 text-xs font-medium text-muted-foreground"
              >
                <Info className="h-3 w-3" />
                {sessions.length} Active Sessions
              </Badge>
            </div>
            <SessionsTable sessions={sessions} />
            <div className="rounded-xl border border-blue-200/60 bg-blue-50/60 p-6 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Noticing something strange?
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      If you don&apos;t recognize a session, revoke it immediately and
                      change your password to keep your account secure.
                    </p>
                  </div>
                  <Separator className="bg-blue-200/70 dark:bg-blue-500/30" />
                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 py-0 text-blue-700 dark:text-blue-300"
                    >
                      Change Password
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 py-0 text-blue-700 dark:text-blue-300"
                    >
                      Security Settings
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
