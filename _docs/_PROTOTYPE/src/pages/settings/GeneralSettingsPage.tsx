import { Upload } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { SettingsSection, SettingsField } from "@/components/patterns/SettingsSection";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const ACCENTS = ["#7c3aed", "#2563eb", "#0f766e", "#db2777", "#ea580c", "#111827"];

export function GeneralSettingsPage() {
  return (
    <SettingsLayout title="General" description="Basic information about your workspace.">
      <div className="divide-y divide-border">
        <SettingsSection title="Workspace" description="How your workspace appears across the admin.">
          <div className="flex flex-col gap-4">
            <SettingsField label="Workspace name" htmlFor="ws-name">
              <Input id="ws-name" defaultValue="Acme Studio" />
            </SettingsField>
            <SettingsField label="Tagline" htmlFor="ws-tag" hint="A short description used in metadata and previews.">
              <Input id="ws-tag" defaultValue="Design & content, beautifully managed." />
            </SettingsField>
            <SettingsField label="Logo">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
                  A
                </div>
                <Button variant="outline" className="gap-1.5">
                  <Upload className="size-4" /> Upload logo
                </Button>
                <span className="text-xs text-muted-foreground">PNG or SVG, up to 2&nbsp;MB</span>
              </div>
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Localization" description="Language, timezone, and formatting defaults.">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField label="Language">
              <Select defaultValue="en">
                <option value="en">English (US)</option>
                <option value="pl">Polski</option>
                <option value="de">Deutsch</option>
              </Select>
            </SettingsField>
            <SettingsField label="Timezone">
              <Select defaultValue="cet">
                <option value="cet">(GMT+1) Central European</option>
                <option value="utc">(GMT+0) UTC</option>
                <option value="est">(GMT-5) Eastern</option>
              </Select>
            </SettingsField>
            <SettingsField label="Date format">
              <Select defaultValue="dmy">
                <option value="dmy">DD/MM/YYYY</option>
                <option value="mdy">MM/DD/YYYY</option>
                <option value="iso">YYYY-MM-DD</option>
              </Select>
            </SettingsField>
            <SettingsField label="Week starts on">
              <Select defaultValue="mon">
                <option value="mon">Monday</option>
                <option value="sun">Sunday</option>
              </Select>
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Branding" description="The accent color used across your admin UI.">
          <SettingsField label="Accent color" hint="Applied to buttons, highlights, and active states.">
            <div className="flex items-center gap-2.5">
              {ACCENTS.map((color, index) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "size-9 rounded-full border-2 transition-transform hover:scale-105",
                    index === 0 ? "border-foreground" : "border-transparent",
                  )}
                  style={{ background: color }}
                  aria-label={`Accent ${color}`}
                />
              ))}
            </div>
          </SettingsField>
        </SettingsSection>

        <SettingsSection title="Behavior" description="Workspace-wide toggles.">
          <div className="divide-y divide-border">
            {[
              { label: "Maintenance mode", desc: "Show a holding page to visitors while you work." },
              { label: "Public sign-ups", desc: "Allow new users to request access." },
              { label: "Weekly summary email", desc: "Send a digest of activity every Monday." },
            ].map((row, index) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <div className="text-sm font-medium">{row.label}</div>
                  <div className="text-sm text-muted-foreground">{row.desc}</div>
                </div>
                <Switch defaultChecked={index === 2} />
              </div>
            ))}
          </div>
          <Separator className="my-1" />
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
