import { useMemo, useState, type CSSProperties } from "react";
import { Palette, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AdminThemeTokens } from "../../../services/adminThemes/tokenTypes";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../services/adminThemes/tokenTypes";
import { mergeAdminThemeTokens } from "../../../services/adminThemes/tokenUtils";
import { toAdminThemeCssVariableMap } from "../../../ui/theme/tokenCss";

import type { AdminThemeTemplate } from "@/services/adminThemeClient";

type ThemeTemplateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AdminThemeTemplate | null;
  isSaving?: boolean;
  onSave?: (input: {
    name: string;
    description: string;
    tokens: AdminThemeTokens;
  }) => Promise<void> | void;
};

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
};

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  placeholder?: string;
};

type PreviewPanelProps = {
  title: string;
  description?: string;
  style: CSSProperties;
  children: React.ReactNode;
};

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "#000000";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function invertHex(value: string) {
  const normalized = normalizeHex(value);
  const hex = normalized.slice(1);
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex;
  if (expanded.length !== 6) return normalized;
  const int = Number.parseInt(expanded, 16);
  if (Number.isNaN(int)) return normalized;
  const r = 255 - ((int >> 16) & 0xff);
  const g = 255 - ((int >> 8) & 0xff);
  const b = 255 - (int & 0xff);
  const result = "#" + [r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("");
  return result;
}

function ColorField({ label, value, onChange, hint }: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
        {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent"
        />
        <Input
          value={value}
          onChange={(event) => onChange(normalizeHex(event.target.value))}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, hint, placeholder }: TextFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
        {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
      </div>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="font-mono text-xs"
      />
    </div>
  );
}

function PreviewPanel({ title, description, style, children }: PreviewPanelProps) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      <div style={style} className="mt-4 rounded-lg border bg-background p-4">
        {children}
      </div>
    </div>
  );
}

function BasePreview() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-background p-3">
        <div className="text-sm font-semibold">Base background</div>
        <p className="text-xs text-muted-foreground">Primary text example</p>
      </div>
      <div className="rounded-lg border bg-muted p-3">
        <div className="text-sm font-semibold">Surface panel</div>
        <p className="text-xs text-muted-foreground">Muted surface copy</p>
      </div>
    </div>
  );
}

function ButtonsPreview() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm">Primary</Button>
      <Button size="sm" variant="secondary">
        Secondary
      </Button>
      <Button size="sm" variant="outline">
        Outline
      </Button>
      <Button size="sm" variant="ghost">
        Ghost
      </Button>
    </div>
  );
}

function InputsPreview() {
  return (
    <div className="space-y-3">
      <Input placeholder="Search by keyword" />
      <Textarea placeholder="Write a note for the admin team" rows={3} />
    </div>
  );
}

function NavigationPreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--admin-base-border)]">
      <div className="flex">
        <div className="w-24 shrink-0 space-y-3 bg-[var(--admin-sidebar-bg)] px-3 py-4 text-[var(--admin-sidebar-text)]">
          <div className="h-2 w-10 rounded-full bg-[var(--admin-sidebar-text)]/40" />
          <div className="space-y-2">
            <div className="h-2 w-12 rounded-full bg-[var(--admin-sidebar-text)]/50" />
            <div className="h-2 w-8 rounded-full bg-[var(--admin-sidebar-text)]/40" />
          </div>
          <div className="rounded-md bg-[var(--admin-sidebar-active-bg)] px-2 py-1 text-[10px] font-medium text-[var(--admin-sidebar-active-text)]">
            Active
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between border-b border-[var(--admin-topbar-border)] bg-[var(--admin-topbar-bg)] px-3 py-2 text-[10px] text-[var(--admin-topbar-text)]">
            <span>Top bar</span>
            <span>Admin</span>
          </div>
          <div className="p-3">
            <div className="h-16 rounded-md bg-[var(--admin-base-surface)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CardsPreview() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border bg-card p-3">
        <div className="text-sm font-semibold">Card A</div>
        <p className="text-xs text-muted-foreground">Short supporting copy.</p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <div className="text-sm font-semibold">Card B</div>
        <p className="text-xs text-muted-foreground">Secondary block preview.</p>
      </div>
    </div>
  );
}

function TypographyPreview() {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Admin UI typography
        </p>
        <p className="text-sm text-muted-foreground">This is muted supporting copy.</p>
      </div>
      <div className="space-y-1">
        <p className="text-base">Body text sample for general UI copy.</p>
        <p className="text-sm text-muted-foreground">Smaller meta label text (text-sm).</p>
      </div>
    </div>
  );
}

type StateSampleProps = {
  label: string;
  color: string;
};

function StateSample({ label, color }: StateSampleProps) {
  return (
    <div
      className="rounded-lg border bg-background p-3 text-sm"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      <div className="font-semibold">{label}</div>
      <p className="text-xs text-muted-foreground">Status message preview</p>
    </div>
  );
}

type SoftStateChipProps = {
  label: string;
  bg: string;
  text: string;
};

function SoftStateChip({ label, bg, text }: SoftStateChipProps) {
  return (
    <span
      className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
      style={{ background: bg, color: text }}
    >
      {label}
    </span>
  );
}

function StatesPreview() {
  return (
    <div className="space-y-2">
      <StateSample label="Success" color="var(--admin-state-success)" />
      <StateSample label="Warning" color="var(--admin-state-warning)" />
      <StateSample label="Danger" color="var(--admin-state-danger)" />
      <StateSample label="Info" color="var(--admin-state-info)" />
      <div className="flex flex-wrap gap-2 pt-1">
        <SoftStateChip
          label="Success"
          bg="var(--admin-state-success-soft)"
          text="var(--admin-state-success)"
        />
        <SoftStateChip
          label="Warning"
          bg="var(--admin-state-warning-soft)"
          text="var(--admin-state-warning)"
        />
        <SoftStateChip
          label="Info"
          bg="var(--admin-state-info-soft)"
          text="var(--admin-state-info)"
        />
      </div>
    </div>
  );
}

function SoftAccentPreview() {
  return (
    <div className="space-y-3">
      <span
        className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
        style={{
          background: "var(--admin-primary-soft)",
          color: "var(--admin-primary-soft-text)",
        }}
      >
        Soft badge
      </span>
      <div
        className="rounded-xl border bg-card p-4 text-sm"
        style={{ boxShadow: "var(--admin-shadow-card)" }}
      >
        <div className="font-semibold">Card shadow</div>
        <p className="text-xs text-muted-foreground">Soft elevation preview</p>
      </div>
    </div>
  );
}

type ThemeTemplateFormProps = {
  template?: AdminThemeTemplate | null;
  isSaving: boolean;
  onSave?: ThemeTemplateDrawerProps["onSave"];
  onClose: () => void;
};

function ThemeTemplateForm({ template, isSaving, onSave, onClose }: ThemeTemplateFormProps) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [tokens, setTokens] = useState<AdminThemeTokens>(() =>
    mergeAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS, template?.tokens ?? null)
  );

  const previewStyle = useMemo<Record<string, string>>(() => {
    const background = tokens.base.bg;
    const foreground = tokens.base.text;
    const muted = tokens.base.surface;
    const mutedForeground = tokens.typography.mutedText;
    const card = tokens.card.bg;
    const border = tokens.base.border;
    const input = tokens.inputs.border;
    const ring = tokens.inputs.focusRing;
    const primary = tokens.buttons.primary.bg;
    const primaryForeground = tokens.buttons.primary.text;
    const secondary = tokens.buttons.secondary.bg;
    const secondaryForeground = tokens.buttons.secondary.text;
    const accent = tokens.buttons.outline.hoverBg;
    const accentForeground = tokens.buttons.outline.hoverText;
    const destructive = tokens.state.danger;
    return {
      ...toAdminThemeCssVariableMap(tokens),
      "--background": background,
      "--foreground": foreground,
      "--muted": muted,
      "--muted-foreground": mutedForeground,
      "--popover": muted,
      "--popover-foreground": foreground,
      "--card": card,
      "--card-foreground": foreground,
      "--border": border,
      "--input": input,
      "--ring": ring,
      "--primary": primary,
      "--primary-foreground": primaryForeground,
      "--secondary": secondary,
      "--secondary-foreground": secondaryForeground,
      "--accent": accent,
      "--accent-foreground": accentForeground,
      "--destructive": destructive,
      "--destructive-foreground": "#ffffff",
      "--color-background": background,
      "--color-foreground": foreground,
      "--color-muted": muted,
      "--color-muted-foreground": mutedForeground,
      "--color-popover": muted,
      "--color-popover-foreground": foreground,
      "--color-card": card,
      "--color-card-foreground": foreground,
      "--color-border": border,
      "--color-input": input,
      "--color-ring": ring,
      "--color-primary": primary,
      "--color-primary-foreground": primaryForeground,
      "--color-secondary": secondary,
      "--color-secondary-foreground": secondaryForeground,
      "--color-accent": accent,
      "--color-accent-foreground": accentForeground,
      "--color-destructive": destructive,
      "--color-destructive-foreground": "#ffffff",
    };
  }, [tokens]);

  const updateToken = (path: string[], value: string) => {
    setTokens((prev) => {
      const next = structuredClone(prev) as AdminThemeTokens;
      let cursor: Record<string, unknown> = next;
      for (let index = 0; index < path.length - 1; index += 1) {
        cursor = cursor[path[index]] as Record<string, unknown>;
      }
      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const invertSection = (paths: string[][]) => {
    setTokens((prev) => {
      const next = structuredClone(prev) as AdminThemeTokens;
      for (const path of paths) {
        let cursor: Record<string, unknown> = next;
        for (let index = 0; index < path.length - 1; index += 1) {
          cursor = cursor[path[index]] as Record<string, unknown>;
        }
        const key = path[path.length - 1];
        const current = cursor[key];
        if (typeof current === "string") {
          cursor[key] = invertHex(current);
        }
      }
      return next;
    });
  };

  const invertBase = () =>
    invertSection([
      ["base", "bg"],
      ["base", "surface"],
      ["base", "border"],
    ]);
  const invertTypography = () =>
    invertSection([
      ["base", "text"],
      ["typography", "mutedText"],
    ]);
  const invertButtons = () =>
    invertSection([
      ["buttons", "primary", "bg"],
      ["buttons", "primary", "text"],
      ["buttons", "primary", "hoverBg"],
      ["buttons", "primary", "hoverText"],
      ["buttons", "secondary", "bg"],
      ["buttons", "secondary", "text"],
      ["buttons", "secondary", "hoverBg"],
      ["buttons", "secondary", "hoverText"],
      ["buttons", "outline", "border"],
      ["buttons", "outline", "text"],
      ["buttons", "outline", "hoverBg"],
      ["buttons", "outline", "hoverText"],
      ["buttons", "ghost", "hoverBg"],
      ["buttons", "ghost", "hoverText"],
    ]);
  const invertInputs = () =>
    invertSection([
      ["inputs", "bg"],
      ["inputs", "border"],
      ["inputs", "text"],
      ["inputs", "placeholder"],
      ["inputs", "focusRing"],
    ]);
  const invertNavigation = () =>
    invertSection([
      ["sidebar", "bg"],
      ["sidebar", "text"],
      ["sidebar", "activeBg"],
      ["sidebar", "activeText"],
      ["sidebar", "hoverBg"],
      ["sidebar", "muted"],
      ["sidebar", "accent"],
      ["sidebar", "accentForeground"],
      ["sidebar", "border"],
      ["topbar", "bg"],
      ["topbar", "text"],
      ["topbar", "border"],
    ]);
  const invertAccents = () =>
    invertSection([
      ["primarySoft", "bg"],
      ["primarySoft", "text"],
    ]);
  const invertCards = () =>
    invertSection([
      ["card", "bg"],
      ["card", "border"],
    ]);
  const invertStates = () =>
    invertSection([
      ["state", "success"],
      ["state", "warning"],
      ["state", "danger"],
      ["state", "info"],
      ["state", "successForeground"],
      ["state", "warningForeground"],
      ["state", "dangerForeground"],
      ["state", "infoForeground"],
      ["state", "successSoft"],
      ["state", "warningSoft"],
      ["state", "infoSoft"],
    ]);

  const handleSave = async () => {
    if (!onSave) return;
    await onSave({ name, description, tokens });
  };

  return (
    <>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-1">
          <SheetTitle>{template ? "Edit Theme Template" : "New Theme Template"}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Customize every UI element using visual pickers.
          </p>
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" aria-label="Close theme template drawer">
            <X className="h-4 w-4" />
          </Button>
        </SheetClose>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-8 px-6 py-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Template name
            </label>
            <Input
              placeholder="Admin Pro"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Description
            </label>
            <Input
              placeholder="Short summary"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Palette className="h-4 w-4 text-primary" />
              Theme tokens
            </div>
            <Tabs defaultValue="base" className="gap-6">
              <TabsList variant="line" className="flex w-full flex-wrap gap-2">
                <TabsTrigger value="base">Base</TabsTrigger>
                <TabsTrigger value="typography">Typography</TabsTrigger>
                <TabsTrigger value="buttons">Buttons</TabsTrigger>
                <TabsTrigger value="inputs">Inputs</TabsTrigger>
                <TabsTrigger value="navigation">Navigation</TabsTrigger>
                <TabsTrigger value="cards">Cards</TabsTrigger>
                <TabsTrigger value="states">States</TabsTrigger>
                <TabsTrigger value="accents">Accents</TabsTrigger>
              </TabsList>

              <TabsContent value="base">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                      <span>Base colors</span>
                      <Button variant="outline" size="xs" type="button" onClick={invertBase}>
                        Invert section
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ColorField
                        label="Background"
                        value={tokens.base.bg}
                        onChange={(value) => updateToken(["base", "bg"], value)}
                      />
                      <ColorField
                        label="Surface"
                        value={tokens.base.surface}
                        onChange={(value) => updateToken(["base", "surface"], value)}
                      />
                      <ColorField
                        label="Border"
                        value={tokens.base.border}
                        onChange={(value) => updateToken(["base", "border"], value)}
                      />
                    </div>
                  </div>
                  <PreviewPanel
                    title="Base preview"
                    description="Background, surface, text, and border examples."
                    style={previewStyle}
                  >
                    <BasePreview />
                  </PreviewPanel>
                </div>
              </TabsContent>

              <TabsContent value="typography">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                      <span>Typography</span>
                      <Button variant="outline" size="xs" type="button" onClick={invertTypography}>
                        Invert section
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <ColorField
                        label="Text"
                        value={tokens.base.text}
                        onChange={(value) => updateToken(["base", "text"], value)}
                      />
                      <ColorField
                        label="Muted Text"
                        value={tokens.typography.mutedText}
                        onChange={(value) => updateToken(["typography", "mutedText"], value)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Font families
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField
                          label="Sans"
                          value={tokens.typography.sans}
                          onChange={(value) => updateToken(["typography", "sans"], value)}
                          placeholder='"IBM Plex Sans", Arial, sans-serif'
                        />
                        <TextField
                          label="Display"
                          value={tokens.typography.display}
                          onChange={(value) => updateToken(["typography", "display"], value)}
                          placeholder='"Space Grotesk", Arial, sans-serif'
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Font sizes
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField
                          label="Text SM"
                          value={tokens.typography.sm}
                          onChange={(value) => updateToken(["typography", "sm"], value)}
                          placeholder="0.875rem"
                        />
                        <TextField
                          label="Text MD"
                          value={tokens.typography.md}
                          onChange={(value) => updateToken(["typography", "md"], value)}
                          placeholder="1rem"
                        />
                        <TextField
                          label="Text LG"
                          value={tokens.typography.lg}
                          onChange={(value) => updateToken(["typography", "lg"], value)}
                          placeholder="1.125rem"
                        />
                        <TextField
                          label="Text XL"
                          value={tokens.typography.xl}
                          onChange={(value) => updateToken(["typography", "xl"], value)}
                          placeholder="1.25rem"
                        />
                        <TextField
                          label="Text 2XL"
                          value={tokens.typography["2xl"]}
                          onChange={(value) => updateToken(["typography", "2xl"], value)}
                          placeholder="1.5rem"
                        />
                      </div>
                    </div>
                  </div>
                  <PreviewPanel
                    title="Typography preview"
                    description="Font families and text sizing preview."
                    style={previewStyle}
                  >
                    <TypographyPreview />
                  </PreviewPanel>
                </div>
              </TabsContent>

              <TabsContent value="buttons">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                        <span>Primary</span>
                        <Button variant="outline" size="xs" type="button" onClick={invertButtons}>
                          Invert section
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Background"
                          value={tokens.buttons.primary.bg}
                          onChange={(value) => updateToken(["buttons", "primary", "bg"], value)}
                        />
                        <ColorField
                          label="Text"
                          value={tokens.buttons.primary.text}
                          onChange={(value) => updateToken(["buttons", "primary", "text"], value)}
                        />
                        <ColorField
                          label="Hover BG"
                          value={tokens.buttons.primary.hoverBg}
                          onChange={(value) =>
                            updateToken(["buttons", "primary", "hoverBg"], value)
                          }
                        />
                        <ColorField
                          label="Hover Text"
                          value={tokens.buttons.primary.hoverText}
                          onChange={(value) =>
                            updateToken(["buttons", "primary", "hoverText"], value)
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Secondary
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Background"
                          value={tokens.buttons.secondary.bg}
                          onChange={(value) => updateToken(["buttons", "secondary", "bg"], value)}
                        />
                        <ColorField
                          label="Text"
                          value={tokens.buttons.secondary.text}
                          onChange={(value) => updateToken(["buttons", "secondary", "text"], value)}
                        />
                        <ColorField
                          label="Hover BG"
                          value={tokens.buttons.secondary.hoverBg}
                          onChange={(value) =>
                            updateToken(["buttons", "secondary", "hoverBg"], value)
                          }
                        />
                        <ColorField
                          label="Hover Text"
                          value={tokens.buttons.secondary.hoverText}
                          onChange={(value) =>
                            updateToken(["buttons", "secondary", "hoverText"], value)
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Outline
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Border"
                          value={tokens.buttons.outline.border}
                          onChange={(value) => updateToken(["buttons", "outline", "border"], value)}
                        />
                        <ColorField
                          label="Text"
                          value={tokens.buttons.outline.text}
                          onChange={(value) => updateToken(["buttons", "outline", "text"], value)}
                        />
                        <ColorField
                          label="Hover BG"
                          value={tokens.buttons.outline.hoverBg}
                          onChange={(value) =>
                            updateToken(["buttons", "outline", "hoverBg"], value)
                          }
                        />
                        <ColorField
                          label="Hover Text"
                          value={tokens.buttons.outline.hoverText}
                          onChange={(value) =>
                            updateToken(["buttons", "outline", "hoverText"], value)
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Ghost
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Hover BG"
                          value={tokens.buttons.ghost.hoverBg}
                          onChange={(value) => updateToken(["buttons", "ghost", "hoverBg"], value)}
                        />
                        <ColorField
                          label="Hover Text"
                          value={tokens.buttons.ghost.hoverText}
                          onChange={(value) =>
                            updateToken(["buttons", "ghost", "hoverText"], value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <PreviewPanel
                    title="Buttons preview"
                    description="Primary, secondary, outline, and ghost states."
                    style={previewStyle}
                  >
                    <ButtonsPreview />
                  </PreviewPanel>
                </div>
              </TabsContent>

              <TabsContent value="inputs">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                      <span>Inputs</span>
                      <Button variant="outline" size="xs" type="button" onClick={invertInputs}>
                        Invert section
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ColorField
                        label="Input Background"
                        value={tokens.inputs.bg}
                        onChange={(value) => updateToken(["inputs", "bg"], value)}
                      />
                      <ColorField
                        label="Input Border"
                        value={tokens.inputs.border}
                        onChange={(value) => updateToken(["inputs", "border"], value)}
                      />
                      <ColorField
                        label="Input Text"
                        value={tokens.inputs.text}
                        onChange={(value) => updateToken(["inputs", "text"], value)}
                      />
                      <ColorField
                        label="Placeholder"
                        value={tokens.inputs.placeholder}
                        onChange={(value) => updateToken(["inputs", "placeholder"], value)}
                      />
                      <ColorField
                        label="Focus Ring"
                        value={tokens.inputs.focusRing}
                        onChange={(value) => updateToken(["inputs", "focusRing"], value)}
                      />
                    </div>
                  </div>
                  <PreviewPanel
                    title="Inputs preview"
                    description="Form fields using input token values."
                    style={previewStyle}
                  >
                    <InputsPreview />
                  </PreviewPanel>
                </div>
              </TabsContent>

              <TabsContent value="navigation">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                        <span>Sidebar</span>
                        <Button
                          variant="outline"
                          size="xs"
                          type="button"
                          onClick={invertNavigation}
                        >
                          Invert section
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Sidebar Background"
                          value={tokens.sidebar.bg}
                          onChange={(value) => updateToken(["sidebar", "bg"], value)}
                        />
                        <ColorField
                          label="Sidebar Text"
                          value={tokens.sidebar.text}
                          onChange={(value) => updateToken(["sidebar", "text"], value)}
                        />
                        <ColorField
                          label="Active Background"
                          value={tokens.sidebar.activeBg}
                          onChange={(value) => updateToken(["sidebar", "activeBg"], value)}
                        />
                        <ColorField
                          label="Active Text"
                          value={tokens.sidebar.activeText}
                          onChange={(value) => updateToken(["sidebar", "activeText"], value)}
                        />
                        <ColorField
                          label="Hover Background"
                          value={tokens.sidebar.hoverBg}
                          onChange={(value) => updateToken(["sidebar", "hoverBg"], value)}
                        />
                        <ColorField
                          label="Sidebar muted"
                          value={tokens.sidebar.muted}
                          onChange={(value) => updateToken(["sidebar", "muted"], value)}
                        />
                        <ColorField
                          label="Sidebar accent"
                          value={tokens.sidebar.accent}
                          onChange={(value) => updateToken(["sidebar", "accent"], value)}
                        />
                        <ColorField
                          label="Sidebar accent text"
                          value={tokens.sidebar.accentForeground}
                          onChange={(value) => updateToken(["sidebar", "accentForeground"], value)}
                        />
                        <ColorField
                          label="Sidebar border"
                          value={tokens.sidebar.border}
                          onChange={(value) => updateToken(["sidebar", "border"], value)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Top bar
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Top Bar Background"
                          value={tokens.topbar.bg}
                          onChange={(value) => updateToken(["topbar", "bg"], value)}
                        />
                        <ColorField
                          label="Top Bar Text"
                          value={tokens.topbar.text}
                          onChange={(value) => updateToken(["topbar", "text"], value)}
                        />
                        <ColorField
                          label="Top Bar Border"
                          value={tokens.topbar.border}
                          onChange={(value) => updateToken(["topbar", "border"], value)}
                        />
                      </div>
                    </div>
                  </div>
                  <PreviewPanel
                    title="Navigation preview"
                    description="Sidebar and top bar styling preview."
                    style={previewStyle}
                  >
                    <NavigationPreview />
                  </PreviewPanel>
                </div>
              </TabsContent>

              <TabsContent value="cards">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                      <span>Cards</span>
                      <Button variant="outline" size="xs" type="button" onClick={invertCards}>
                        Invert section
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ColorField
                        label="Card Background"
                        value={tokens.card.bg}
                        onChange={(value) => updateToken(["card", "bg"], value)}
                      />
                      <ColorField
                        label="Card Border"
                        value={tokens.card.border}
                        onChange={(value) => updateToken(["card", "border"], value)}
                      />
                    </div>
                  </div>
                  <PreviewPanel
                    title="Cards preview"
                    description="Card surfaces and borders."
                    style={previewStyle}
                  >
                    <CardsPreview />
                  </PreviewPanel>
                </div>
              </TabsContent>

              <TabsContent value="states">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                        <span>States</span>
                        <Button variant="outline" size="xs" type="button" onClick={invertStates}>
                          Invert section
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Success"
                          value={tokens.state.success}
                          onChange={(value) => updateToken(["state", "success"], value)}
                        />
                        <ColorField
                          label="Warning"
                          value={tokens.state.warning}
                          onChange={(value) => updateToken(["state", "warning"], value)}
                        />
                        <ColorField
                          label="Danger"
                          value={tokens.state.danger}
                          onChange={(value) => updateToken(["state", "danger"], value)}
                        />
                        <ColorField
                          label="Info"
                          value={tokens.state.info}
                          onChange={(value) => updateToken(["state", "info"], value)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Foregrounds
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Success text"
                          value={tokens.state.successForeground}
                          onChange={(value) => updateToken(["state", "successForeground"], value)}
                        />
                        <ColorField
                          label="Warning text"
                          value={tokens.state.warningForeground}
                          onChange={(value) => updateToken(["state", "warningForeground"], value)}
                        />
                        <ColorField
                          label="Danger text"
                          value={tokens.state.dangerForeground}
                          onChange={(value) => updateToken(["state", "dangerForeground"], value)}
                        />
                        <ColorField
                          label="Info text"
                          value={tokens.state.infoForeground}
                          onChange={(value) => updateToken(["state", "infoForeground"], value)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Soft backgrounds
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Success soft"
                          value={tokens.state.successSoft}
                          onChange={(value) => updateToken(["state", "successSoft"], value)}
                        />
                        <ColorField
                          label="Warning soft"
                          value={tokens.state.warningSoft}
                          onChange={(value) => updateToken(["state", "warningSoft"], value)}
                        />
                        <ColorField
                          label="Info soft"
                          value={tokens.state.infoSoft}
                          onChange={(value) => updateToken(["state", "infoSoft"], value)}
                        />
                      </div>
                    </div>
                  </div>
                  <PreviewPanel
                    title="Status preview"
                    description="Solid, foreground, and soft status accents."
                    style={previewStyle}
                  >
                    <StatesPreview />
                  </PreviewPanel>
                </div>
              </TabsContent>

              <TabsContent value="accents">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                        <span>Soft primary</span>
                        <Button variant="outline" size="xs" type="button" onClick={invertAccents}>
                          Invert section
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <ColorField
                          label="Primary soft (bg)"
                          value={tokens.primarySoft.bg}
                          onChange={(value) => updateToken(["primarySoft", "bg"], value)}
                        />
                        <ColorField
                          label="Primary soft (text)"
                          value={tokens.primarySoft.text}
                          onChange={(value) => updateToken(["primarySoft", "text"], value)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Shadows
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField
                          label="Shadow · soft"
                          value={tokens.effects.shadowSoft}
                          onChange={(value) => updateToken(["effects", "shadowSoft"], value)}
                          placeholder="0 1px 2px rgba(28, 25, 23, 0.04)"
                        />
                        <TextField
                          label="Shadow · card"
                          value={tokens.effects.shadowCard}
                          onChange={(value) => updateToken(["effects", "shadowCard"], value)}
                          placeholder="0 1px 3px rgba(28, 25, 23, 0.05)"
                        />
                        <TextField
                          label="Shadow · pop"
                          value={tokens.effects.shadowPop}
                          onChange={(value) => updateToken(["effects", "shadowPop"], value)}
                          placeholder="0 10px 34px rgba(28, 25, 23, 0.24)"
                        />
                      </div>
                    </div>
                  </div>
                  <PreviewPanel
                    title="Soft primary &amp; shadows"
                    description="Soft accent surfaces and elevation shadows."
                    style={previewStyle}
                  >
                    <SoftAccentPreview />
                  </PreviewPanel>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ScrollArea>
      <Separator />
      <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
          {isSaving ? "Saving..." : template ? "Save Template" : "Create Template"}
        </Button>
      </div>
    </>
  );
}

export function ThemeTemplateDrawer({
  open,
  onOpenChange,
  template,
  isSaving = false,
  onSave,
}: ThemeTemplateDrawerProps) {
  const formKey = `${template?.id ?? "new"}-${open ? "open" : "closed"}`;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-2xl"
      >
        <ThemeTemplateForm
          key={formKey}
          template={template}
          isSaving={isSaving}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
