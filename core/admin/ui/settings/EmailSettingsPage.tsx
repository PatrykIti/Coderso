import {
  CheckCircle2,
  History,
  Info,
  KeyRound,
  Save,
  Send,
  User,
  Wifi,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { SettingsSidebar } from "./SettingsSidebar";
import { SmtpCard } from "./SmtpCard";

const statusItems = [
  {
    title: "Host Reachable",
    description: "Last checked 4s ago",
    icon: Wifi,
  },
  {
    title: "Authentication Verified",
    description: "Valid credentials provided",
    icon: KeyRound,
  },
];

export function EmailSettingsPage() {
  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="email" />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground">Email</span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="gap-2 border-emerald-200 bg-emerald-50 text-emerald-600"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Connected
          </Badge>
          <Button size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Save Config
          </Button>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Email Settings</h1>
            <p className="text-sm text-muted-foreground">
              System configuration - SMTP outbound
            </p>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <SmtpCard />
                <Card className="border-muted/60">
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4 text-primary" />
                      Default Sender Info
                    </CardTitle>
                    <CardDescription>
                      Set the name and address used for outgoing emails.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          htmlFor="from-name"
                          className="text-xs font-semibold uppercase text-muted-foreground"
                        >
                          From Name
                        </label>
                        <Input
                          id="from-name"
                          placeholder="Company name"
                          defaultValue="Nextless CMS"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="from-email"
                          className="text-xs font-semibold uppercase text-muted-foreground"
                        >
                          From Email
                        </label>
                        <Input
                          id="from-email"
                          type="email"
                          placeholder="hello@nextless.io"
                          defaultValue="hello@nextless.io"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card className="border-muted/60">
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Send className="h-4 w-4 text-primary" />
                      Test Email
                    </CardTitle>
                    <CardDescription>
                      Send a test email to verify your SMTP settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="test-recipient"
                        className="text-xs font-semibold uppercase text-muted-foreground"
                      >
                        Recipient Address
                      </label>
                      <Input
                        id="test-recipient"
                        type="email"
                        placeholder="dev@example.com"
                      />
                    </div>
                    <Button variant="secondary" className="w-full gap-2">
                      <Send className="h-4 w-4" />
                      Send Test Email
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-muted/60">
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Connection Status
                        </p>
                        <p className="text-sm font-semibold">Operational</p>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-emerald-200 text-emerald-600"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Operational
                      </Badge>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-full w-full rounded-full bg-emerald-500" />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      {statusItems.map(({ title, description, icon: Icon }) => (
                        <div key={title} className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{title}</p>
                            <p className="text-xs text-muted-foreground">
                              {description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center gap-2 text-primary"
                    >
                      <History className="h-4 w-4" />
                      View delivery logs
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-blue-200/60 bg-blue-50/70">
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-blue-900">
                      <Info className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Security Note</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      For production environments, we recommend using dedicated providers
                      like Postmark or Resend rather than generic SMTP servers for better
                      deliverability.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
