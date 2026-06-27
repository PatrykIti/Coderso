import { LogOut, Monitor, Smartphone, Tablet, type LucideIcon } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RELATIVE_TIMES, pick } from "@/lib/mock";

type Session = {
  icon: LucideIcon;
  device: string;
  location: string;
  ip: string;
  current?: boolean;
};

const SESSIONS: Session[] = [
  {
    icon: Monitor,
    device: "Chrome on macOS",
    location: "Warsaw, Poland",
    ip: "203.0.113.24",
    current: true,
  },
  {
    icon: Smartphone,
    device: "Safari on iOS",
    location: "Kraków, Poland",
    ip: "198.51.100.12",
  },
  {
    icon: Tablet,
    device: "Chrome on Android",
    location: "Berlin, Germany",
    ip: "192.0.2.88",
  },
  {
    icon: Monitor,
    device: "Firefox on Windows",
    location: "Amsterdam, Netherlands",
    ip: "203.0.113.140",
  },
];

export function SessionsPage() {
  return (
    <SettingsLayout
      title="Active sessions"
      description="Devices currently signed in."
      saveBar={false}
    >
      <div className="flex flex-col gap-5">
        <div className="flex justify-end">
          <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
            <LogOut className="size-4" /> Sign out all other sessions
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {SESSIONS.map((session, index) => (
            <Card key={index} className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3.5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <session.icon className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{session.device}</span>
                    {session.current ? <Badge variant="success">This device</Badge> : null}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {session.location} · <span className="font-mono text-xs">{session.ip}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Last active {pick(RELATIVE_TIMES, index)}
                  </div>
                </div>
              </div>
              {session.current ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  Revoke
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </SettingsLayout>
  );
}
