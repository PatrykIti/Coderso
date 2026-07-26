// TASK-516-02: Form Design Inspector Panel — the primary "style the WHOLE FORM"
// surface. A self-contained, props-in / callback-out inspector (no data fetching)
// that edits `FormSettings.theme`. 516-03 mounts it as a new `Design` tab in the
// form inspector.
//
// Follows the visual idioms of FormSettingsPanel.tsx (bordered `section` groups,
// `[10px] uppercase tracking` micro-labels, `ScrollArea`, shared `Select` /
// `Switch` / `Input`). Colors reuse the EXPORTED reusable `SharedColorControl`
// primitive the widget editors compose (NOT the private `ColorField` wrapper).
//
// The theme vocabulary (enum unions, `FORM_THEME_*` Sets, `resolveFormTheme`) is
// owned by 516-01 and imported READ-ONLY here — never redefined or drifted.

import { type ReactNode } from "react";

import { Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SharedColorControl } from "@/ui/widgets/editors/SharedColorControl";

import {
  FORM_THEME_ALIGNS,
  FORM_THEME_BORDER_WIDTHS,
  FORM_THEME_BUTTON_ALIGNS,
  FORM_THEME_FONT_FAMILIES,
  FORM_THEME_GAPS,
  FORM_THEME_INPUT_SIZES,
  FORM_THEME_PADDINGS,
  FORM_THEME_RADII,
  FORM_THEME_SHADOWS,
  FORM_THEME_TITLE_SIZES,
  FORM_THEME_TITLE_WEIGHTS,
  FORM_THEME_WIDTHS,
  resolveFormTheme,
  type FormFormTheme,
} from "../../../services/forms/formTheme";

// -----------------------------------------------------------------------------
// Props (authoritative shape = TASK-516-02).
// -----------------------------------------------------------------------------
type FormDesignPanelProps = {
  theme: FormFormTheme | undefined;
  // GROUP-LEVEL REPLACE: each emitted group value fully replaces theme[group] in
  // 516-03's `{ ...theme, ...updates }`; then normalizeFormSettings makes it
  // present-only. `{ [group]: undefined }` clears a group; `undefined` = reset the
  // whole theme.
  onThemeChange: (updates: Partial<FormFormTheme> | undefined) => void;
  disabled?: boolean;
};

// -----------------------------------------------------------------------------
// LOCAL resolved-default hint (single-writer, re-implemented per the TASK-506 F2
// mandate — this is NOT the incompatible MenuDesignEditor private helper). Used
// ONLY for enum/bool/number tokens whose resolved default is concrete. Color
// tokens are NOT passed here — SharedColorControl owns their cleared-state UI.
// -----------------------------------------------------------------------------
function ControlDefaultHint({
  value,
  resolved,
  onReset,
}: {
  value: unknown; // raw token from theme[group][key] (undefined = unset)
  resolved: unknown; // effective value from resolveFormTheme
  onReset: () => void;
}) {
  // MIRRORS TASK-507 FIX B (never render "Default: undefined"): a resolved default
  // of `undefined` means the token inherits the ambient theme (no concrete value
  // to show) — hide the hint entirely.
  if (resolved === undefined) return null;
  if (value === undefined) {
    return (
      <span className="text-[10px] font-medium text-muted-foreground">
        Default: {String(resolved)}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onReset}
      className="text-[10px] font-medium text-muted-foreground transition hover:text-foreground"
    >
      Reset (default: {String(resolved)})
    </button>
  );
}

// -----------------------------------------------------------------------------
// Small presentational helpers (local to this single-writer file).
// -----------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      {children}
    </section>
  );
}

function ControlRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}

type EnumOption = { value: string; label: string };

const optionLabels: Record<string, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
  xl: "Extra large",
  full: "Full width",
  none: "None",
  soft: "Soft",
  left: "Left",
  center: "Center",
  right: "Right",
  normal: "Normal",
  medium: "Medium",
  semibold: "Semibold",
  bold: "Bold",
  display: "Display",
  inherit: "Inherit",
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
};

const optionsFrom = (set: Iterable<string>): EnumOption[] =>
  Array.from(set, (value) => ({ value, label: optionLabels[value] ?? value }));

function EnumSelect({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string;
  options: EnumOption[];
  onChange: (next: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// -----------------------------------------------------------------------------
// The panel.
// -----------------------------------------------------------------------------
export function FormDesignPanel({ theme, onThemeChange, disabled }: FormDesignPanelProps) {
  const resolved = resolveFormTheme(theme); // concrete effective tokens for hints
  const submitSupportingText = theme?.submit?.supportingText;

  // set/override a single token: build the complete next group (merge over the
  // current group) and emit it as a GROUP-LEVEL REPLACE (516-03 replaces the whole
  // group object at its key, so this must produce the full next group).
  const patchGroup = <G extends keyof FormFormTheme>(group: G, patch: Record<string, unknown>) =>
    onThemeChange({
      [group]: { ...(theme?.[group] ?? {}), ...patch },
    } as Partial<FormFormTheme>);

  // per-control reset: DELETE one key from a copy and emit the reduced group
  // DIRECTLY (NOT via patchGroup, whose shallow merge would re-add the key). An
  // emptied group is emitted as `undefined` so 516-03's normalize drops it
  // (present-only).
  const clearKey = <G extends keyof FormFormTheme>(group: G, key: string) => {
    const next: Record<string, unknown> = { ...(theme?.[group] ?? {}) };
    delete next[key];
    onThemeChange({
      [group]: Object.keys(next).length ? next : undefined,
    } as Partial<FormFormTheme>);
  };

  // Color swatch factory — 8 opaque, 2 transparent-capable (surface/input
  // background). The transparent affordance ONLY renders inside SharedColorControl's
  // showValueInput===false branch, so those two pass BOTH flags.
  const colorSwatch = (
    label: string,
    group: keyof FormFormTheme,
    key: string,
    options?: { transparent?: boolean }
  ) => (
    <SharedColorControl
      label={label}
      controlId={`form-theme-${String(group)}-${key}`}
      controlPath={`theme.${String(group)}.${key}`}
      value={(theme?.[group] as Record<string, unknown> | undefined)?.[key] as string | undefined}
      onChange={(next) => patchGroup(group, { [key]: next })}
      onClear={() => clearKey(group, key)}
      colorProfile="inherited-render"
      {...(options?.transparent ? { allowTransparent: true, showValueInput: false } : {})}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 p-1 text-primary">
            <Palette className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Form Design</p>
            <p className="text-xs text-muted-foreground">
              Style the whole form — layout, container, typography, inputs, and submit.
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-5">
        <div className="space-y-5 pb-4">
          {/* -------------------------------------------------------------- */}
          <Section title="Layout">
            <ControlRow
              label="Width"
              hint={
                <ControlDefaultHint
                  value={theme?.layout?.width}
                  resolved={resolved.layout.width}
                  onReset={() => clearKey("layout", "width")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Form width"
                value={resolved.layout.width}
                options={optionsFrom(FORM_THEME_WIDTHS)}
                onChange={(v) => patchGroup("layout", { width: v })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Alignment"
              hint={
                <ControlDefaultHint
                  value={theme?.layout?.align}
                  resolved={resolved.layout.align}
                  onReset={() => clearKey("layout", "align")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Form alignment"
                value={resolved.layout.align}
                options={optionsFrom(FORM_THEME_ALIGNS)}
                onChange={(v) => patchGroup("layout", { align: v })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Columns"
              hint={
                <ControlDefaultHint
                  value={theme?.layout?.columns}
                  resolved={resolved.layout.columns}
                  onReset={() => clearKey("layout", "columns")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Form columns"
                value={String(resolved.layout.columns)}
                options={[
                  { value: "1", label: "1 column" },
                  { value: "2", label: "2 columns" },
                ]}
                onChange={(v) => patchGroup("layout", { columns: Number(v) as 1 | 2 })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Field gap"
              hint={
                <ControlDefaultHint
                  value={theme?.layout?.fieldGap}
                  resolved={resolved.layout.fieldGap}
                  onReset={() => clearKey("layout", "fieldGap")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Field gap"
                value={resolved.layout.fieldGap}
                options={optionsFrom(FORM_THEME_GAPS)}
                onChange={(v) => patchGroup("layout", { fieldGap: v })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Button alignment"
              hint={
                <ControlDefaultHint
                  value={theme?.layout?.buttonAlignment}
                  resolved={resolved.layout.buttonAlignment}
                  onReset={() => clearKey("layout", "buttonAlignment")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Button alignment"
                value={resolved.layout.buttonAlignment}
                options={optionsFrom(FORM_THEME_BUTTON_ALIGNS)}
                onChange={(v) => patchGroup("layout", { buttonAlignment: v })}
                disabled={disabled}
              />
            </ControlRow>
          </Section>

          {/* -------------------------------------------------------------- */}
          <Section title="Container">
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Card container</p>
                <p className="text-xs text-muted-foreground">
                  Wrap the form in a bordered card surface.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ControlDefaultHint
                  value={theme?.surface?.card}
                  resolved={resolved.surface.card}
                  onReset={() => clearKey("surface", "card")}
                />
                <Switch
                  aria-label="Card container"
                  checked={resolved.surface.card}
                  onCheckedChange={(checked) => patchGroup("surface", { card: checked === true })}
                  disabled={disabled}
                />
              </div>
            </div>
            {colorSwatch("Background", "surface", "background", { transparent: true })}
            {colorSwatch("Border color", "surface", "borderColor")}
            <ControlRow
              label="Border width"
              hint={
                <ControlDefaultHint
                  value={theme?.surface?.borderWidth}
                  resolved={resolved.surface.borderWidth}
                  onReset={() => clearKey("surface", "borderWidth")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Border width"
                value={resolved.surface.borderWidth}
                options={optionsFrom(FORM_THEME_BORDER_WIDTHS)}
                onChange={(v) => patchGroup("surface", { borderWidth: v })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Corner radius"
              hint={
                <ControlDefaultHint
                  value={theme?.surface?.radius}
                  resolved={resolved.surface.radius}
                  onReset={() => clearKey("surface", "radius")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Container radius"
                value={resolved.surface.radius}
                options={optionsFrom(FORM_THEME_RADII)}
                onChange={(v) => patchGroup("surface", { radius: v })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Padding"
              hint={
                <ControlDefaultHint
                  value={theme?.surface?.padding}
                  resolved={resolved.surface.padding}
                  onReset={() => clearKey("surface", "padding")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Container padding"
                value={resolved.surface.padding}
                options={optionsFrom(FORM_THEME_PADDINGS)}
                onChange={(v) => patchGroup("surface", { padding: v })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Shadow"
              hint={
                <ControlDefaultHint
                  value={theme?.surface?.shadow}
                  resolved={resolved.surface.shadow}
                  onReset={() => clearKey("surface", "shadow")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Container shadow"
                value={resolved.surface.shadow}
                options={optionsFrom(FORM_THEME_SHADOWS)}
                onChange={(v) => patchGroup("surface", { shadow: v })}
                disabled={disabled}
              />
            </ControlRow>
          </Section>

          {/* -------------------------------------------------------------- */}
          <Section title="Typography">
            <ControlRow
              label="Title size"
              hint={
                <ControlDefaultHint
                  value={theme?.typography?.titleSize}
                  resolved={resolved.typography.titleSize}
                  onReset={() => clearKey("typography", "titleSize")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Title size"
                value={resolved.typography.titleSize}
                options={optionsFrom(FORM_THEME_TITLE_SIZES)}
                onChange={(v) => patchGroup("typography", { titleSize: v })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Title weight"
              hint={
                <ControlDefaultHint
                  value={theme?.typography?.titleWeight}
                  resolved={resolved.typography.titleWeight}
                  onReset={() => clearKey("typography", "titleWeight")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Title weight"
                value={resolved.typography.titleWeight}
                options={optionsFrom(FORM_THEME_TITLE_WEIGHTS)}
                onChange={(v) => patchGroup("typography", { titleWeight: v })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Font family"
              hint={
                <ControlDefaultHint
                  value={theme?.typography?.fontFamily}
                  resolved={resolved.typography.fontFamily}
                  onReset={() => clearKey("typography", "fontFamily")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Font family"
                value={resolved.typography.fontFamily}
                options={optionsFrom(FORM_THEME_FONT_FAMILIES)}
                onChange={(v) => patchGroup("typography", { fontFamily: v })}
                disabled={disabled}
              />
            </ControlRow>
            {colorSwatch("Title color", "typography", "titleColor")}
            {colorSwatch("Label color", "typography", "labelColor")}
            {colorSwatch("Helper color", "typography", "helperColor")}
          </Section>

          {/* -------------------------------------------------------------- */}
          <Section title="Inputs">
            <ControlRow
              label="Input size"
              hint={
                <ControlDefaultHint
                  value={theme?.input?.size}
                  resolved={resolved.input.size}
                  onReset={() => clearKey("input", "size")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Input size"
                value={resolved.input.size}
                options={optionsFrom(FORM_THEME_INPUT_SIZES)}
                onChange={(v) => patchGroup("input", { size: v })}
                disabled={disabled}
              />
            </ControlRow>
            <ControlRow
              label="Input radius"
              hint={
                <ControlDefaultHint
                  value={theme?.input?.radius}
                  resolved={resolved.input.radius}
                  onReset={() => clearKey("input", "radius")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Input radius"
                value={resolved.input.radius}
                options={optionsFrom(FORM_THEME_RADII)}
                onChange={(v) => patchGroup("input", { radius: v })}
                disabled={disabled}
              />
            </ControlRow>
            {colorSwatch("Border color", "input", "borderColor")}
            {colorSwatch("Background", "input", "background", { transparent: true })}
            {colorSwatch("Text color", "input", "textColor")}
          </Section>

          {/* -------------------------------------------------------------- */}
          <Section title="Submit">
            {colorSwatch("Background", "submit", "background")}
            {colorSwatch("Text color", "submit", "textColor")}
            <ControlRow
              label="Button radius"
              hint={
                <ControlDefaultHint
                  value={theme?.submit?.radius}
                  resolved={resolved.submit.radius}
                  onReset={() => clearKey("submit", "radius")}
                />
              }
            >
              <EnumSelect
                ariaLabel="Submit radius"
                value={resolved.submit.radius}
                options={optionsFrom(FORM_THEME_RADII)}
                onChange={(v) => patchGroup("submit", { radius: v })}
                disabled={disabled}
              />
            </ControlRow>
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Full-width button</p>
                <p className="text-xs text-muted-foreground">
                  Stretch the submit button across the form.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ControlDefaultHint
                  value={theme?.submit?.fullWidth}
                  resolved={resolved.submit.fullWidth}
                  onReset={() => clearKey("submit", "fullWidth")}
                />
                <Switch
                  aria-label="Full-width button"
                  checked={resolved.submit.fullWidth}
                  onCheckedChange={(checked) =>
                    patchGroup("submit", { fullWidth: checked === true })
                  }
                  disabled={disabled}
                />
              </div>
            </div>
            <ControlRow label="Submit label">
              <Input
                aria-label="Submit label"
                value={resolved.submit.label ?? ""}
                placeholder="Submit"
                disabled={disabled}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next.trim().length > 0) {
                    patchGroup("submit", { label: next });
                  } else {
                    clearKey("submit", "label");
                  }
                }}
              />
            </ControlRow>
            <ControlRow
              label="Supporting text"
              hint={
                submitSupportingText === undefined ? undefined : (
                  <button
                    type="button"
                    aria-label="Reset submit supporting text"
                    className="text-[10px] font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => clearKey("submit", "supportingText")}
                  >
                    Reset
                  </button>
                )
              }
            >
              <Textarea
                aria-label="Submit supporting text"
                data-form-theme-control="submit.supportingText"
                value={submitSupportingText ?? ""}
                maxLength={2_000}
                rows={3}
                disabled={disabled}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next.trim().length > 0) {
                    patchGroup("submit", { supportingText: next });
                  } else {
                    clearKey("submit", "supportingText");
                  }
                }}
              />
            </ControlRow>
          </Section>
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={disabled}
          onClick={() => onThemeChange(undefined)}
        >
          Reset to default theme
        </Button>
      </div>
    </div>
  );
}
