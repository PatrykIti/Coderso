import {
  AlignLeft,
  Eye,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  LayoutGrid,
  Monitor,
  MousePointerClick,
  Rocket,
  Smartphone,
  Sparkles,
  Square,
  Tablet,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { CanvasEditor } from "@/components/patterns/CanvasEditor";
import { OptionsPanel } from "@/components/patterns/OptionsPanel";
import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { Link } from "@/lib/router";
import {
  CATEGORIES,
  CONTROLS,
  DEVICES,
  PAGE_SETTING_CATEGORIES,
  PAGE_SETTINGS,
  PAGE_SETTINGS_ESSENTIALS,
  SELECTABLE,
  TOTAL_CONTROLS,
  type BlockType,
  type DeviceId,
  type PageSettingControl,
} from "@/pages/content/panelSpec";

const TYPE_ICONS: Record<string, LucideIcon> = {
  LayoutGrid,
  Type,
  AlignLeft,
  Square,
  Image: ImageIcon,
  GalleryHorizontalEnd,
};
const DEVICE_ICONS: Record<string, LucideIcon> = { Monitor, Tablet, Smartphone };

// ── Header device-context segmented control (pill Tabs) ──────────────────────
function DeviceContext({ value, onChange }: { value: DeviceId; onChange: (d: DeviceId) => void }) {
  return (
    <Tabs
      variant="pill"
      value={value}
      onValueChange={(v) => onChange(v as DeviceId)}
      items={DEVICES.map((d) => {
        const Icon = DEVICE_ICONS[d.icon];
        return {
          value: d.id,
          label: (
            <span className="flex items-center gap-1.5">
              <Icon className="size-3.5" /> {d.label}
            </span>
          ),
        };
      })}
    />
  );
}

// ── Element picker (which block/section is "selected") ───────────────────────
function ElementPicker({
  value,
  onChange,
}: {
  value: BlockType;
  onChange: (t: BlockType) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 p-3">
      {SELECTABLE.map((s) => {
        const Icon = TYPE_ICONS[s.icon] ?? Square;
        const active = s.type === value;
        return (
          <button
            key={s.type}
            type="button"
            onClick={() => onChange(s.type)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-medium transition-colors [&_svg]:size-4",
              active
                ? "border-primary bg-primary-soft text-primary-soft-foreground [&_svg]:text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground [&_svg]:text-muted-foreground"
            )}
          >
            <Icon />
            {s.label.split(" ")[0]}
          </button>
        );
      })}
    </div>
  );
}

function BeforeAfter() {
  const legacy = [
    ["style", 31],
    ["layout", 18],
    ["background", 8],
    ["typography", 8],
    ["spacing", 5],
    ["visibility", 3],
    ["content", 2],
    ["responsive", 1],
  ] as const;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Before · 8 flat panels
        </div>
        <div className="flex flex-wrap gap-1.5">
          {legacy.map(([name, n]) => (
            <span
              key={name}
              className={cn(
                "rounded-lg border border-border px-2 py-1 text-[11px]",
                n >= 18 ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground"
              )}
            >
              {name} · {n}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          The <span className="font-mono">style=31</span> bucket dumps fill, border, shadow & every
          522–530 effect into one wall of controls — “naciukane opcji”.
        </p>
      </div>
      <div className="rounded-2xl border border-primary/40 bg-primary-soft/40 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3.5" /> After · 8 icon categories + 2 tiers
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const n = CONTROLS.filter((x) => x.category === c.id).length;
            return (
              <span
                key={c.id}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] text-foreground [&_svg]:size-3 [&_svg]:text-primary"
              >
                <Icon /> {c.label} · {n}
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Essentials shows 5–8 relevant controls first; the icon-rail + accordions hold all{" "}
          {TOTAL_CONTROLS} behind “All options”. Only device-relevant controls stay active.
        </p>
      </div>
    </div>
  );
}

// ── Page Settings panel (same icon-rail language, document-level fields) ─────
function PageSettingWidget({ ctrl }: { ctrl: PageSettingControl }) {
  if (ctrl.kind === "switch") {
    return (
      <div className="flex justify-end">
        <Switch defaultChecked={ctrl.value === "On"} aria-label={ctrl.label} />
      </div>
    );
  }
  if (ctrl.kind === "select") {
    return (
      <Select defaultValue={ctrl.value} className="h-8 text-xs">
        {(ctrl.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }
  return <Input defaultValue={ctrl.value} className="h-8 text-xs" />;
}

function PageSettingRow({ ctrl }: { ctrl: PageSettingControl }) {
  const isSwitch = ctrl.kind === "switch";
  return (
    <div
      className={cn("gap-2 py-2", isSwitch ? "flex items-center justify-between" : "grid gap-1.5")}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{ctrl.label}</span>
        {ctrl.essential ? (
          <span className="rounded-full bg-primary-soft px-1 text-[9px] font-semibold uppercase leading-4 text-primary-soft-foreground">
            key
          </span>
        ) : null}
      </div>
      <div className={isSwitch ? "" : "w-full"}>
        <PageSettingWidget ctrl={ctrl} />
      </div>
      {ctrl.hint && !isSwitch ? (
        <span className="font-mono text-[10px] text-muted-foreground">{ctrl.hint}</span>
      ) : null}
    </div>
  );
}

function PageSettings() {
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState(PAGE_SETTING_CATEGORIES[0].id);

  const essentials = PAGE_SETTINGS_ESSENTIALS.map((id) => PAGE_SETTINGS.find((c) => c.id === id)!);
  const activeCat = PAGE_SETTING_CATEGORIES.find((c) => c.id === active)!;
  const scoped = PAGE_SETTINGS.filter((c) => c.category === active);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="text-sm font-medium">Page settings</span>
        <Badge variant="soft">
          <Eye className="size-3" /> Same icon language
        </Badge>
      </div>
      <div className="grid gap-0 md:grid-cols-[1fr_320px]">
        {/* Essentials column */}
        <div className="border-b border-border p-4 md:border-b-0 md:border-r">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Essentials
          </div>
          <div className="flex flex-col divide-y divide-border/70">
            {essentials.map((c) => (
              <PageSettingRow key={c.id} ctrl={c} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 text-xs font-medium text-primary hover:underline"
            aria-expanded={showAll}
          >
            {showAll ? "Hide all settings" : `All settings (${PAGE_SETTINGS.length}) →`}
          </button>
        </div>

        {/* Icon-rail column (mirrors the block/section panel) */}
        <div className={cn("p-4", !showAll && "hidden md:block")}>
          <div className="flex gap-2">
            <div className="flex w-11 shrink-0 flex-col gap-1">
              {PAGE_SETTING_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = cat.id === active;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActive(cat.id)}
                    aria-label={cat.label}
                    aria-pressed={isActive}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl border transition-colors [&_svg]:size-4",
                      isActive
                        ? "border-transparent bg-primary text-primary-foreground shadow-soft"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon />
                  </button>
                );
              })}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-xs font-semibold">{activeCat.label}</div>
              <div className="mb-2 text-[10px] text-muted-foreground">{activeCat.blurb}</div>
              <div className="flex flex-col divide-y divide-border/70">
                {scoped.map((c) => (
                  <PageSettingRow key={c.id} ctrl={c} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const chips: { swatch: ReactNode; label: string }[] = [
    {
      swatch: <span className="size-2.5 rounded-full bg-primary" />,
      label: "Overridden on this device",
    },
    {
      swatch: (
        <span className="rounded-full bg-primary-soft px-1 text-[8px] font-semibold uppercase text-primary-soft-foreground">
          new
        </span>
      ),
      label: "Added in TASK 522–530",
    },
    {
      swatch: <span className="size-2.5 rounded bg-muted-foreground/40" />,
      label: "Dimmed + lock = desktop-only on tablet/mobile",
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
      {chips.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {c.swatch}
          {c.label}
        </span>
      ))}
    </div>
  );
}

export function PageEditorOptionsV2() {
  const [type, setType] = useState<BlockType>("heading");
  const [device, setDevice] = useState<DeviceId>("desktop");

  const selected = useMemo(() => SELECTABLE.find((s) => s.type === type)!, [type]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Pages", to: "/pages" }, { label: "Home" }, { label: "Options v2" }]}
        title="Page editor — options v2"
        description="Restructured per-block / per-section options: icon categories + progressive disclosure. A mockup to review the UX before it ships."
        actions={
          <>
            <DeviceContext value={device} onChange={setDevice} />
            <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <Button variant="ghost">Save draft</Button>
            <Button className="gap-1.5">
              <Rocket className="size-4" /> Publish
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <BeforeAfter />
      </div>

      <div className="mb-3">
        <Legend />
      </div>

      <CanvasEditor
        title="Page builder"
        badge={<Badge variant="soft">Options v2</Badge>}
        toolbar={<Badge variant="outline">Home · draft</Badge>}
        panelTitle={
          <span className="flex items-center gap-1.5">
            <MousePointerClick className="size-3.5 text-primary" />
            {selected.label}
            <span className="text-muted-foreground">· {device}</span>
          </span>
        }
        panelPosition="right"
        panelClassName="w-[300px]"
        device={false}
        canvas={
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="mb-2 flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Selected element (click to switch)
              </span>
              <Badge variant="outline">{selected.target}</Badge>
            </div>
            <ElementPicker value={type} onChange={setType} />

            <div className="rounded-2xl border-2 border-primary bg-card p-10 text-center shadow-soft">
              <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-foreground">
                New · v2.0
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight">
                Build beautiful sites, faster
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                A modern CMS for teams who care about content and craft.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button>Get started</Button>
                <Button variant="outline">Live demo</Button>
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                The floating panel on the right is the sole control surface. It adapts to the{" "}
                <span className="font-medium text-foreground">{selected.label}</span> and the{" "}
                <span className="font-medium text-foreground">{device}</span> viewport.
              </p>
            </div>
          </div>
        }
        panel={<OptionsPanel type={type} device={device} />}
      />

      <div className="mt-4">
        <PageSettings />
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Mockup for TASK options-panel restructure · icon categories + Essentials/All-options tiers ·
        non-functional preview.{" "}
        <Link to="/pages" className="text-primary hover:underline">
          Back to pages
        </Link>
      </p>
    </div>
  );
}
