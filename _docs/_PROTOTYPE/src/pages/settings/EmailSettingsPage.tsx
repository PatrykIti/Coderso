import { CheckCircle2, Send } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { SettingsSection, SettingsField } from "@/components/patterns/SettingsSection";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EmailSettingsPage() {
  return (
    <SettingsLayout title="Email" description="Transactional email / SMTP.">
      <div className="divide-y divide-border">
        <SettingsSection title="Sender" description="How outgoing messages are signed.">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField label="From name" htmlFor="from-name">
              <Input id="from-name" defaultValue="Acme Studio" />
            </SettingsField>
            <SettingsField label="From email" htmlFor="from-email">
              <Input id="from-email" type="email" defaultValue="hello@acme.studio" />
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="SMTP" description="Connect your delivery server.">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Host" htmlFor="smtp-host">
              <Input id="smtp-host" defaultValue="smtp.mailgun.org" />
            </SettingsField>
            <SettingsField label="Port" htmlFor="smtp-port">
              <Input id="smtp-port" type="number" defaultValue="587" />
            </SettingsField>
            <SettingsField label="Username" htmlFor="smtp-user">
              <Input id="smtp-user" defaultValue="postmaster@acme.studio" />
            </SettingsField>
            <SettingsField label="Password" htmlFor="smtp-pass">
              <Input id="smtp-pass" type="password" defaultValue="••••••••••••" />
            </SettingsField>
            <SettingsField label="Encryption">
              <Select defaultValue="tls">
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </Select>
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Test" description="Verify your configuration end to end.">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Send a sample message to confirm delivery works with the settings above.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="gap-1.5">
                <Send className="size-4" /> Send test email
              </Button>
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3" /> Last test passed
              </Badge>
            </div>
          </div>
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
