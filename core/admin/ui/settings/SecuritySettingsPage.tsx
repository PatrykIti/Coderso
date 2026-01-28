import { BellRing, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { IpAllowlistTable } from "./IpAllowlistTable";
import { LoginAlertsCard } from "./LoginAlertsCard";
import { SecurityPolicyCard } from "./SecurityPolicyCard";
import { SettingsSidebar } from "./SettingsSidebar";

const sessionOptions = [
  { value: "2h", label: "2 Hours" },
  { value: "8h", label: "8 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
];

export function SecuritySettingsPage() {
  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="security" />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">Security</span>
        </div>
      }
      topbarActions={
        <Button size="sm" className="px-4">
          Save changes
        </Button>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-4">
          <h1 className="text-2xl font-semibold">Security Settings</h1>
          <p className="text-sm text-muted-foreground">
            Define password rules, session policies, and login alerts.
          </p>
        </div>
        <div className="flex-1">
          <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 pb-10">
            <SecurityPolicyCard
              title="Password Policy"
              description="Set the baseline for secure admin credentials."
              icon={<LockKeyhole className="h-4 w-4" />}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Minimum Length</p>
                  <p className="text-xs text-muted-foreground">
                    Set the minimum character count for user passwords.
                  </p>
                </div>
                <Input
                  type="number"
                  min={8}
                  defaultValue={12}
                  className="w-20"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Require Special Characters</p>
                  <p className="text-xs text-muted-foreground">
                    Must include symbols like !, @, #, etc.
                  </p>
                </div>
                <Switch defaultChecked aria-label="Require special characters" />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Require Numbers</p>
                  <p className="text-xs text-muted-foreground">
                    Must include at least one numerical digit.
                  </p>
                </div>
                <Switch defaultChecked aria-label="Require numbers" />
              </div>
            </SecurityPolicyCard>

            <SecurityPolicyCard
              title="Two-Factor Authentication"
              description="Enforce multi-factor authentication for admins."
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enforce Globally</p>
                  <p className="text-xs text-muted-foreground">
                    Require all administrative accounts to use 2FA.
                  </p>
                </div>
                <Switch aria-label="Enforce two-factor authentication" />
              </div>
            </SecurityPolicyCard>

            <SecurityPolicyCard
              title="Session Management"
              description="Control session longevity and concurrency."
              icon={<Clock3 className="h-4 w-4" />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Session TTL</p>
                    <Badge variant="secondary" className="text-xs">
                      Recommended
                    </Badge>
                  </div>
                  <Select defaultValue="8h">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select session TTL" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Concurrent Sessions</p>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={3}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
            </SecurityPolicyCard>

            <IpAllowlistTable />
            <LoginAlertsCard
              title="Suspicious Login Alerts"
              description="Get notified whenever someone logs in from a new device, browser, or location."
              icon={<BellRing className="h-4 w-4" />}
              iconWrapperClassName="bg-primary/10 text-primary"
            />

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline">Discard</Button>
              <Button>Save changes</Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
