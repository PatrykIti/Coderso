import { ChevronDown, Lock, Search, RotateCcw } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import {
  CATEGORIES,
  CONTROLS,
  ESSENTIALS_ORDER,
  type BlockType,
  type CategoryId,
  type ControlSpec,
  type DeviceId,
} from "@/pages/content/panelSpec";

/**
 * Restructured Page Editor v2 OPTIONS panel — a static mockup that shows the
 * proposed UX: an ICON-RAIL of categories + two-tier progressive disclosure
 * (Essentials → All options) + per-device filtering. Reuses the prototype's
 * soft/violet primitives; nothing is wired to real data.
 */

type OptionsPanelProps = {
  type: BlockType;
  device: DeviceId;
};

const OVERRIDDEN = new Set(["block.style.fontSize", "section.spacing.padding"]);

// ── One representative control row ───────────────────────────────────────────
function ControlRow({ ctrl, device }: { ctrl: ControlSpec; device: DeviceId }) {
  const isMobileCtx = device !== "desktop";
  const dimmed = isMobileCtx && !ctrl.responsive;
  const overridden = isMobileCtx && ctrl.responsive && OVERRIDDEN.has(ctrl.id);

  return (
    <div className={cn("flex items-center justify-between gap-3 py-1.5", dimmed && "opacity-45")}>
      <div className="flex min-w-0 items-center gap-1.5">
        {overridden ? (
          <Tooltip label="Overridden on this device">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
          </Tooltip>
        ) : null}
        <span className="truncate text-xs font-medium text-muted-foreground">{ctrl.label}</span>
        {ctrl.isNew ? (
          <span className="rounded-full bg-primary-soft px-1 text-[9px] font-semibold uppercase leading-4 text-primary-soft-foreground">
            new
          </span>
        ) : null}
        {dimmed ? (
          <Tooltip label="Desktop-only — no per-device override">
            <Lock className="size-3 shrink-0 text-muted-foreground/70" />
          </Tooltip>
        ) : null}
      </div>
      <div className="w-[128px] shrink-0">
        <ControlWidget ctrl={ctrl} disabled={dimmed} />
      </div>
    </div>
  );
}

// ── Representative widget per control kind ───────────────────────────────────
function ControlWidget({ ctrl, disabled }: { ctrl: ControlSpec; disabled?: boolean }) {
  switch (ctrl.kind) {
    case "switch":
      return (
        <div className="flex justify-end">
          <Switch
            defaultChecked={ctrl.value === "On"}
            disabled={disabled}
            aria-label={ctrl.label}
          />
        </div>
      );
    case "select":
      return (
        <Select defaultValue={ctrl.value} disabled={disabled} className="h-8 text-xs">
          {(ctrl.options ?? [ctrl.value ?? ""]).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    case "segmented":
      return <Segmented options={ctrl.options ?? []} value={ctrl.value} disabled={disabled} />;
    case "color":
      return <ColorSwatch value={ctrl.value ?? "#ffffff"} disabled={disabled} />;
    case "slider":
      return <SliderMock value={ctrl.value ?? "0"} unit={ctrl.unit} disabled={disabled} />;
    case "number":
      return (
        <div className="flex items-center gap-1">
          <Input defaultValue={ctrl.value} disabled={disabled} className="h-8 px-2 text-xs" />
          {ctrl.unit ? (
            <span className="text-[10px] text-muted-foreground">{ctrl.unit}</span>
          ) : null}
        </div>
      );
    case "text":
    default:
      return <Input defaultValue={ctrl.value} disabled={disabled} className="h-8 px-2 text-xs" />;
  }
}

function Segmented({
  options,
  value,
  disabled,
}: {
  options: string[];
  value?: string;
  disabled?: boolean;
}) {
  const [active, setActive] = useState(value ?? options[0]);
  return (
    <div
      className={cn(
        "flex items-center overflow-x-auto rounded-lg border border-border bg-muted/50 p-0.5",
        disabled && "pointer-events-none"
      )}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => setActive(o)}
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
            o === active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ColorSwatch({ value, disabled }: { value: string; disabled?: boolean }) {
  const transparent = value === "transparent";
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-lg border border-input bg-card px-2 py-1.5 text-xs shadow-soft disabled:opacity-50"
    >
      <span
        className={cn(
          "size-4 shrink-0 rounded border border-border",
          transparent &&
            "bg-[conic-gradient(#0000_90deg,#e5e7eb_0_180deg,#0000_0_270deg,#e5e7eb_0)] bg-[length:8px_8px]"
        )}
        style={transparent ? undefined : { background: value }}
      />
      <span className="truncate font-mono text-[10px] text-muted-foreground">{value}</span>
    </button>
  );
}

function SliderMock({
  value,
  unit,
  disabled,
}: {
  value: string;
  unit?: string;
  disabled?: boolean;
}) {
  const pct = Math.min(100, Number(value) || 0);
  return (
    <div className={cn("flex items-center gap-2", disabled && "opacity-50")}>
      <div className="relative h-1.5 flex-1 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 size-3 -translate-y-1/2 -translate-x-1/2 rounded-full border border-primary bg-card shadow-soft"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
        {value}
        {unit}
      </span>
    </div>
  );
}

// ── Accordion cluster inside an "All options" category ───────────────────────
function Accordion({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="rounded-xl border border-border bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold">{title}</span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
            {count}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </span>
      </button>
      {open ? <div className="border-t border-border px-3 py-1.5">{children}</div> : null}
    </div>
  );
}

// ── Tier 2: the icon-rail + accordion tree over the full control set ─────────
function AllOptions({ type, device, query }: { type: BlockType; device: DeviceId; query: string }) {
  const applicable = useMemo(() => CONTROLS.filter((c) => c.appliesTo.includes(type)), [type]);
  const relevantCats = useMemo(
    () => CATEGORIES.filter((cat) => applicable.some((c) => c.category === cat.id)),
    [applicable]
  );
  const [active, setActive] = useState<CategoryId>(relevantCats[0]?.id ?? "layout");

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  // When searching, flatten across every category; else scope to the active rail item.
  const shown = applicable.filter((c) => {
    if (searching) return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    return c.category === active;
  });

  const primary = shown.filter((c) => !c.cluster);
  const clustered = new Map<string, ControlSpec[]>();
  for (const c of shown) {
    if (!c.cluster) continue;
    clustered.set(c.cluster, [...(clustered.get(c.cluster) ?? []), c]);
  }

  const activeCat = CATEGORIES.find((c) => c.id === active);

  return (
    <div className="flex gap-2">
      {/* Icon rail — never scrolls, caps at 8 */}
      {!searching ? (
        <div className="flex w-11 shrink-0 flex-col gap-1">
          {relevantCats.map((cat) => {
            const Icon = cat.icon;
            const isActive = cat.id === active;
            const n = applicable.filter((c) => c.category === cat.id).length;
            return (
              <Tooltip key={cat.id} label={`${cat.label} · ${n}`} side="top">
                <button
                  type="button"
                  onClick={() => setActive(cat.id)}
                  aria-label={cat.label}
                  aria-pressed={isActive}
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-xl border transition-colors [&_svg]:size-4",
                    isActive
                      ? "border-transparent bg-primary text-primary-foreground shadow-soft"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon />
                </button>
              </Tooltip>
            );
          })}
        </div>
      ) : null}

      {/* Category content */}
      <div className="min-w-0 flex-1">
        {!searching && activeCat ? (
          <div className="mb-2">
            <div className="text-xs font-semibold">{activeCat.label}</div>
            <div className="text-[10px] text-muted-foreground">{activeCat.blurb}</div>
          </div>
        ) : null}
        {searching ? (
          <div className="mb-2 text-[10px] text-muted-foreground">
            {shown.length} control{shown.length === 1 ? "" : "s"} match “{query}”
          </div>
        ) : null}

        <div className="flex flex-col divide-y divide-border/70">
          {primary.map((c) => (
            <ControlRow key={c.id} ctrl={c} device={device} />
          ))}
        </div>

        {[...clustered.entries()].length > 0 ? (
          <div className="mt-2 flex flex-col gap-1.5">
            {[...clustered.entries()].map(([name, list], i) => (
              <Accordion
                key={name}
                title={name}
                count={list.length}
                defaultOpen={searching || i === 0}
              >
                <div className="flex flex-col divide-y divide-border/70">
                  {list.map((c) => (
                    <ControlRow key={c.id} ctrl={c} device={device} />
                  ))}
                </div>
              </Accordion>
            ))}
          </div>
        ) : null}

        {shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            No controls in this category for this element.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function OptionsPanel({ type, device }: OptionsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  const essentials = useMemo(() => {
    const order = ESSENTIALS_ORDER[type] ?? [];
    return order
      .map((id) => CONTROLS.find((c) => c.id === id))
      .filter((c): c is ControlSpec => Boolean(c));
  }, [type]);

  const applicableCount = useMemo(
    () => CONTROLS.filter((c) => c.appliesTo.includes(type)).length,
    [type]
  );

  return (
    <div className="flex flex-col">
      {/* Tier 1 — Essentials */}
      <div className="px-3 pb-2 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Essentials
          </span>
          <Tooltip label="Reset element to defaults" side="top">
            <button
              type="button"
              aria-label="Reset to defaults"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground [&_svg]:size-3"
            >
              <RotateCcw /> Reset
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-col divide-y divide-border/70">
          {essentials.map((c) => (
            <ControlRow key={c.id} ctrl={c} device={device} />
          ))}
        </div>
      </div>

      {/* Tier 2 toggle */}
      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-left transition-colors hover:bg-accent/60"
        aria-expanded={showAll}
      >
        <span className="flex items-center gap-2 text-xs font-semibold">
          All options
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {applicableCount}
          </Badge>
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            showAll && "rotate-180"
          )}
        />
      </button>

      {showAll ? (
        <div className="border-t border-border bg-muted/20 p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search controls…"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <AllOptions type={type} device={device} query={query} />
        </div>
      ) : null}
    </div>
  );
}
