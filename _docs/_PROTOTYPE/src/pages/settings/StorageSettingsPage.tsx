import { Check, Cloud, HardDrive, Server } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { SettingsSection, SettingsField } from "@/components/patterns/SettingsSection";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

const PROVIDERS = [
  { id: "local", name: "Local disk", desc: "Store media on this server.", icon: HardDrive },
  { id: "s3", name: "Amazon S3", desc: "Scalable object storage.", icon: Cloud },
  { id: "azure", name: "Azure Blob", desc: "Microsoft cloud storage.", icon: Server },
];

export function StorageSettingsPage() {
  return (
    <SettingsLayout title="Storage" description="Where uploaded media is stored.">
      <div className="divide-y divide-border">
        <SettingsSection title="Provider" description="Choose where uploads are stored.">
          <div className="grid gap-3 sm:grid-cols-3">
            {PROVIDERS.map((provider, index) => {
              const selected = index === 0;
              return (
                <Card
                  key={provider.id}
                  className={cn(
                    "relative cursor-pointer p-4 transition-all hover:shadow-card",
                    selected ? "ring-2 ring-primary" : "hover:-translate-y-0.5",
                  )}
                >
                  {selected ? (
                    <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      selected ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <provider.icon className="size-5" />
                  </span>
                  <div className="mt-3 text-sm font-medium">{provider.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{provider.desc}</div>
                </Card>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection title="Credentials" description="Access details for your storage bucket.">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Bucket" htmlFor="st-bucket">
              <Input id="st-bucket" defaultValue="acme-studio-media" />
            </SettingsField>
            <SettingsField label="Region" htmlFor="st-region">
              <Select defaultValue="eu-central-1">
                <option value="eu-central-1">EU (Frankfurt)</option>
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </Select>
            </SettingsField>
            <SettingsField label="Access key" htmlFor="st-access">
              <Input id="st-access" defaultValue="AKIA4F9A2C7DEXAMPLE" />
            </SettingsField>
            <SettingsField label="Secret key" htmlFor="st-secret">
              <Input id="st-secret" type="password" defaultValue="supersecretvalue" />
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="CDN" description="Serve media through a content delivery network.">
          <div className="flex flex-col gap-4">
            <SettingsField label="CDN base URL" htmlFor="st-cdn" hint="Media URLs are rewritten to this host.">
              <Input id="st-cdn" defaultValue="https://cdn.acme.studio" />
            </SettingsField>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Serve media via CDN</div>
                <div className="text-sm text-muted-foreground">Deliver uploads from the edge for faster loads.</div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Usage" description="Current storage consumption.">
          <div className="flex flex-col gap-2">
            <Progress value={12.4} />
            <p className="text-sm text-muted-foreground">6.2 GB of 50 GB used</p>
          </div>
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
