import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  type ContentTypeConfig,
  resolveDraftsEnabled,
  resolveVersioning,
} from "@/services/contentTypesClient";

/**
 * TASK-513-03: prototype "Type settings" card (right column of the Fields tab).
 *
 * Presentational / controlled — the editor owns `slug` + `config` state and this card only
 * emits intent. Layout mirrors the prototype `ContentTypeEditorPreview.tsx:101-132`
 * (API ID mono input · Singular · Plural · Enable drafts · Versioning). Config helpers
 * (`resolveDraftsEnabled`/`resolveVersioning`) are imported from the client-safe
 * `@/services/contentTypesClient` (513-01) — NOT from `typeService.ts` (server-only db/drizzle,
 * would break the admin bundle boundary).
 *
 * Present-only: the two toggles never write a value equal to its resolved default
 * (`draftsEnabled:true` / `versioning:false`) — they drop the key instead, so a type with no
 * custom config serializes to `{}` (the server normalizer also drops defaults, this keeps the
 * client payload minimal + byte-clean).
 */
export interface ContentTypeSettingsCardProps {
  slug: string;
  config: ContentTypeConfig | undefined;
  onSlugChange: (next: string) => void;
  onConfigChange: (next: ContentTypeConfig) => void;
  disabled?: boolean;
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-1">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        disabled={disabled}
      />
    </div>
  );
}

export function ContentTypeSettingsCard({
  slug,
  config,
  onSlugChange,
  onConfigChange,
  disabled,
}: ContentTypeSettingsCardProps) {
  const cfg: ContentTypeConfig = config ?? {};

  const setName = (key: "singularName" | "pluralName", value: string) => {
    const next: ContentTypeConfig = { ...cfg };
    // present-only: drop empty strings (server normalizer also drops them)
    if (value.trim() === "") delete next[key];
    else next[key] = value;
    onConfigChange(next);
  };

  const setDrafts = (value: boolean) => {
    const next: ContentTypeConfig = { ...cfg };
    // resolved default is TRUE → omit when enabled, persist explicit `false`
    if (value) delete next.draftsEnabled;
    else next.draftsEnabled = false;
    onConfigChange(next);
  };

  const setVersioning = (value: boolean) => {
    const next: ContentTypeConfig = { ...cfg };
    // resolved default is FALSE → omit when off, persist explicit `true`
    if (value) next.versioning = true;
    else delete next.versioning;
    onConfigChange(next);
  };

  return (
    <Card className="h-fit p-5">
      <div className="mb-4 text-sm font-semibold">Type settings</div>

      <div className="space-y-3">
        <SettingRow label="API ID">
          <Input
            value={slug}
            onChange={(event) => onSlugChange(event.target.value)}
            className="font-mono text-xs"
            disabled={disabled}
            aria-label="API ID"
          />
        </SettingRow>
        <SettingRow label="Singular name">
          <Input
            value={cfg.singularName ?? ""}
            onChange={(event) => setName("singularName", event.target.value)}
            disabled={disabled}
            aria-label="Singular name"
          />
        </SettingRow>
        <SettingRow label="Plural name">
          <Input
            value={cfg.pluralName ?? ""}
            onChange={(event) => setName("pluralName", event.target.value)}
            disabled={disabled}
            aria-label="Plural name"
          />
        </SettingRow>
      </div>

      <div className="mt-4 divide-y divide-border border-t border-border">
        <ToggleRow
          title="Enable drafts"
          description="Save unpublished changes."
          checked={resolveDraftsEnabled(config)}
          onChange={setDrafts}
          disabled={disabled}
        />
        <ToggleRow
          title="Versioning"
          description="Keep a history of edits."
          checked={resolveVersioning(config)}
          onChange={setVersioning}
          disabled={disabled}
        />
      </div>
    </Card>
  );
}
