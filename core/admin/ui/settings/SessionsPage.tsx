import { Info, Laptop, LogOut, Monitor, ShieldCheck, Smartphone, Tablet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import {
  listSessions,
  revokeAllSessions,
  revokeSession,
  type SessionRecord,
} from "@/services/sessionsClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { useOptionalAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";

import { SessionsTable, type SessionItem } from "./SessionsTable";
import { SettingsSidebar } from "./SettingsSidebar";

const accountSecurityLinksUnavailableReason =
  "Account security links are not wired yet. TASK-359-07 owns navigation targets.";
const sessionTabsUnavailableReason =
  "Only Active Sessions is wired on this screen. TASK-359-07 owns the remaining session tabs.";

const tabs = [
  { id: "general", label: "General", available: false },
  { id: "sessions", label: "Active Sessions", available: true },
  { id: "audit", label: "Audit Log", available: false },
  { id: "two-factor", label: "Two-Factor Auth", available: false },
];

type DeviceMeta = {
  device: string;
  detail: string;
  icon: typeof Monitor;
};

const resolveDeviceMeta = (userAgent: string | null): DeviceMeta => {
  if (!userAgent) {
    return { device: "Unknown device", detail: "Unknown OS", icon: Monitor };
  }

  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone")) {
    return { device: "iPhone", detail: "iOS", icon: Smartphone };
  }
  if (ua.includes("android")) {
    return { device: "Android phone", detail: "Android", icon: Smartphone };
  }
  if (ua.includes("ipad")) {
    return { device: "iPad", detail: "iPadOS", icon: Tablet };
  }
  if (ua.includes("windows")) {
    return { device: "Windows PC", detail: "Windows", icon: Monitor };
  }
  if (ua.includes("mac os") || ua.includes("macintosh")) {
    return { device: "Mac", detail: "macOS", icon: Laptop };
  }
  if (ua.includes("linux")) {
    return { device: "Linux", detail: "Linux", icon: Monitor };
  }
  return { device: "Desktop", detail: "Unknown OS", icon: Monitor };
};

const formatRelative = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

const mapSessionItem = (session: SessionRecord): SessionItem => {
  const meta = resolveDeviceMeta(session.userAgent ?? null);
  return {
    id: session.id,
    device: meta.device,
    deviceDetail: meta.detail,
    location: "Unknown",
    ipAddress: session.ip ?? "—",
    lastActive: formatRelative(session.createdAt),
    status: session.current ? "current" : "active",
    canRevoke: !session.current,
    icon: meta.icon,
  };
};

const readSessionSelection = (path: string) => {
  if (!path) return { selectedSessionId: null, selectedUserId: null };
  const params = new URL(path, "https://admin.local").searchParams;
  return {
    selectedSessionId: params.get("sessionId"),
    selectedUserId: params.get("userId"),
  };
};

export function SessionsPage() {
  const adminRouter = useOptionalAdminRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRevokeSession, setPendingRevokeSession] = useState<SessionItem | null>(null);
  const [pendingRevokeAll, setPendingRevokeAll] = useState(false);

  const { selectedSessionId, selectedUserId } = useMemo(() => {
    const path =
      adminRouter?.path ??
      (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "");
    return readSessionSelection(path);
  }, [adminRouter?.path]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await listSessions(selectedUserId ?? undefined);
      setSessions(items.map(mapSessionItem));
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load sessions.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    let active = true;
    listSessions(selectedUserId ?? undefined)
      .then((items) => {
        if (active) setSessions(items.map(mapSessionItem));
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load sessions.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedUserId]);

  const selectedSessionAvailable = useMemo(
    () =>
      Boolean(selectedSessionId && sessions.some((session) => session.id === selectedSessionId)),
    [selectedSessionId, sessions]
  );

  const activeCount = useMemo(() => sessions.length, [sessions.length]);
  const revokableSessionCount = useMemo(
    () => sessions.filter((session) => session.canRevoke).length,
    [sessions]
  );

  const handleRevoke = (session: SessionItem) => {
    if (!session.canRevoke) return;
    setPendingRevokeSession(session);
  };

  const confirmRevoke = async () => {
    const session = pendingRevokeSession;
    if (!session?.canRevoke) return;
    setIsRevoking(true);
    setError(null);
    try {
      await revokeSession(session.id);
      setPendingRevokeSession(null);
      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to revoke session.");
      }
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeAll = () => {
    if (revokableSessionCount === 0) return;
    setPendingRevokeAll(true);
  };

  const confirmRevokeAll = async () => {
    setIsRevoking(true);
    setError(null);
    try {
      await revokeAllSessions(selectedUserId ?? undefined);
      setPendingRevokeAll(false);
      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to revoke sessions.");
      }
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="sessions" />}
      breadcrumbs={["Settings", "Security", "Sessions"]}
      topbarActions={
        <Button
          variant="destructive"
          size="sm"
          className="gap-2"
          onClick={handleRevokeAll}
          disabled={isRevoking || isLoading || revokableSessionCount === 0}
        >
          <LogOut className="h-4 w-4" />
          Revoke All Other Sessions
        </Button>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-4">
          <h1 className="text-2xl font-semibold">Security Sessions</h1>
          <p className="text-sm text-muted-foreground">Account Security / Monitoring</p>
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
                      : tab.available
                        ? "border-transparent text-muted-foreground hover:text-foreground"
                        : "cursor-not-allowed border-transparent text-muted-foreground opacity-60"
                  )}
                  disabled={!tab.available}
                  title={!tab.available ? sessionTabsUnavailableReason : undefined}
                  data-no-op-control={
                    !tab.available ? `settings-sessions-tab-${tab.id}` : undefined
                  }
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
                {activeCount} Active Sessions
              </Badge>
            </div>
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {selectedSessionId && !isLoading ? (
              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                {selectedSessionAvailable
                  ? "Showing the active session selected from access logs."
                  : "The session selected from access logs is not active or is no longer available."}
              </div>
            ) : null}
            <SessionsTable
              sessions={sessions}
              isLoading={isLoading}
              isRevoking={isRevoking}
              selectedSessionId={selectedSessionId}
              onRevoke={handleRevoke}
            />
            <div className="rounded-xl border border-blue-200/60 bg-blue-50/60 p-6 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Noticing something strange?</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      If you don&apos;t recognize a session, revoke it immediately and change your
                      password to keep your account secure.
                    </p>
                  </div>
                  <Separator className="bg-blue-200/70 dark:bg-blue-500/30" />
                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 py-0 text-blue-700 dark:text-blue-300"
                      disabled
                      title={accountSecurityLinksUnavailableReason}
                      data-no-op-control="settings-sessions-change-password"
                    >
                      Change Password
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 py-0 text-blue-700 dark:text-blue-300"
                      disabled
                      title={accountSecurityLinksUnavailableReason}
                      data-no-op-control="settings-sessions-security-settings"
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
      <ConfirmActionDialog
        open={Boolean(pendingRevokeSession)}
        onOpenChange={(open) => {
          if (!open) setPendingRevokeSession(null);
        }}
        title="Revoke session"
        description="This will end the selected active session and require that device to sign in again."
        confirmLabel="Revoke session"
        confirmingLabel="Revoking..."
        isConfirming={isRevoking}
        targetLabel={
          pendingRevokeSession
            ? `${pendingRevokeSession.device} · ${pendingRevokeSession.ipAddress}`
            : undefined
        }
        onConfirm={confirmRevoke}
      >
        Review the device and location before revoking. Your current session remains protected.
      </ConfirmActionDialog>
      <ConfirmActionDialog
        open={pendingRevokeAll}
        onOpenChange={setPendingRevokeAll}
        title="Revoke all other sessions"
        description="This will end every revokable session except the current session."
        confirmLabel="Revoke all other sessions"
        confirmingLabel="Revoking..."
        isConfirming={isRevoking}
        targetLabel={`${revokableSessionCount} other ${
          revokableSessionCount === 1 ? "session" : "sessions"
        }`}
        onConfirm={confirmRevokeAll}
      >
        Your current session remains protected. Other devices will need to sign in again.
      </ConfirmActionDialog>
    </SettingsShell>
  );
}
