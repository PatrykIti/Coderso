import { Check, Moon, Palette } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { SettingsField } from "@/components/patterns/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

const PRESETS = [
  { name: "Default", active: true, swatches: ["#7c3aed", "#ede9fe", "#faf5ff"] },
  { name: "Midnight", swatches: ["#6366f1", "#1e1b4b", "#0f172a"] },
  { name: "Forest", swatches: ["#0f766e", "#d1fae5", "#f0fdf4"] },
  { name: "Sunset", swatches: ["#ea580c", "#ffedd5", "#fff7ed"] },
  { name: "Mono", swatches: ["#111827", "#e5e7eb", "#f9fafb"] },
];

// Color swatches are the only place inline style colors are allowed.
const ACCENTS = ["#7c3aed", "#6366f1", "#2563eb", "#0ea5e9", "#0f766e", "#16a34a", "#db2777", "#ea580c", "#dc2626", "#111827"];

export function ThemesPage() {
  return (
    <div>
      <PageHeader
        icon={<Palette />}
        title="Admin UI theme"
        description="Customize the look of your admin."
        actions={<Button>Save theme</Button>}
      />

      {/* Presets */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PRESETS.map((preset) => (
          <Card
            key={preset.name}
            className={cn(
              "flex cursor-pointer flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card",
              preset.active && "ring-2 ring-ring",
            )}
          >
            <div className="flex items-center gap-1.5">
              {preset.swatches.map((color, index) => (
                <span
                  key={index}
                  className="size-6 rounded-full border border-border"
                  style={{ background: color }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{preset.name}</span>
              {preset.active ? (
                <Badge variant="success">
                  <Check className="size-3" /> Active
                </Badge>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Live preview */}
        <SectionCard title="Live preview" description="A snapshot of how your admin will look." icon={<Palette />}>
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex">
              {/* mini sidebar */}
              <div className="flex w-28 flex-col gap-2 border-r border-border bg-muted/40 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="size-5 rounded-md bg-primary" />
                  <span className="h-2 w-12 rounded-full bg-muted-foreground/30" />
                </div>
                <span className="flex h-6 items-center rounded-lg bg-primary-soft px-2">
                  <span className="h-1.5 w-12 rounded-full bg-primary/60" />
                </span>
                <span className="flex h-6 items-center px-2">
                  <span className="h-1.5 w-14 rounded-full bg-muted-foreground/25" />
                </span>
                <span className="flex h-6 items-center px-2">
                  <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
                </span>
              </div>

              {/* mini main */}
              <div className="flex-1 p-3">
                {/* topbar */}
                <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                  <span className="h-2 w-20 rounded-full bg-muted-foreground/30" />
                  <span className="size-5 rounded-full bg-muted" />
                </div>

                {/* mini stat cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map((index) => (
                    <div key={index} className="rounded-lg border border-border bg-card p-3 shadow-soft">
                      <span className="block h-1.5 w-10 rounded-full bg-muted-foreground/30" />
                      <span className="mt-2 block h-3 w-14 rounded-full bg-foreground/80" />
                      <span className="mt-3 block h-6 rounded-md bg-primary-soft" />
                    </div>
                  ))}
                </div>

                {/* button */}
                <div className="mt-3 flex justify-end">
                  <span className="flex h-7 items-center rounded-lg bg-primary px-4">
                    <span className="h-1.5 w-10 rounded-full bg-primary-foreground/80" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Controls */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Accent color" description="The highlight used across the admin.">
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENTS.map((color, index) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Accent ${color}`}
                  className={cn(
                    "size-8 rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-105",
                    index === 0 ? "ring-2 ring-ring" : "ring-1 ring-border",
                  )}
                  style={{ background: color }}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Theme options" description="Palette, shape, and typography.">
            <div className="flex flex-col gap-4">
              <SettingsField label="Base palette" hint="Sets the neutral tones behind your accent.">
                <Select defaultValue="warm">
                  <option value="warm">Warm</option>
                  <option value="cool">Cool</option>
                  <option value="neutral">Neutral</option>
                </Select>
              </SettingsField>
              <SettingsField label="Radius">
                <Select defaultValue="md">
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </Select>
              </SettingsField>
              <SettingsField label="Font">
                <Select defaultValue="inter">
                  <option value="inter">Inter</option>
                  <option value="system">System</option>
                  <option value="geist">Geist</option>
                </Select>
              </SettingsField>
              <SettingsField label="Density">
                <Select defaultValue="comfortable">
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </Select>
              </SettingsField>
            </div>
          </SectionCard>

          <SectionCard title="Appearance" description="Light and dark presentation.">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Moon className="size-4" />
                </span>
                <div>
                  <div className="text-sm font-medium">Dark mode</div>
                  <div className="text-sm text-muted-foreground">Use the dark palette by default.</div>
                </div>
              </div>
              <Switch />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
