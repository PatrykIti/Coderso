import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ColorSwatchControl,
  ComboboxControl,
  FacetListControl,
  ListItemsControl,
  SegmentedControl,
  SliderControl,
  SliderStepperControl,
  ToggleSwitch,
  type ComboboxControlOption,
} from "@/ui/pages/editorControls";
import { getBlockDisplayLabel } from "@/ui/pages/editor/pageEditorLabels";
import {
  getPageEditorColorPalette,
  resolvePageEditorControlUiModel,
} from "../../../services/pages/pageEditorControlUiModel";
import type { PageEditorControlDefinition } from "../../../services/pages/pageEditorControlDefinition";
import {
  getPageEditorControlsForTarget,
  getPageBlockCapability,
} from "../../../services/pages/pageEditorBlockControlRegistry";
import {
  getPageSectionVariantControl,
  isPageSectionVariantOption,
} from "../../../services/pages/pageEditorSectionControls";
import {
  patchBlockControlForDevice,
  patchSectionControlForDevice,
} from "../../../services/pages/pageEditorMutationActions";
import type {
  PageListItemV2,
  PageSectionVariant,
  PageSectionV2,
  PageBlockV2,
} from "../../../services/pages/pageDocumentV2";
import { getCachedForms } from "@/services/formsClient";
import { getCachedContentTypes } from "@/services/contentTypesClient";
import { getCachedListingQueries, getCachedListingTemplates } from "@/services/listingsClient";
import type { PageEditorControlOptionsSource } from "../../../services/pages/pageEditorControlDefinition";

export type DetailTemplateInspectorProps = {
  section: PageSectionV2 | null;
  block: PageBlockV2 | null;
  onSectionChange: (next: PageSectionV2) => void;
  onBlockChange: (next: PageBlockV2) => void;
};

const blockPanelOrder = ["content", "typography", "style", "background", "visibility"] as const;
const sectionPanelOrder = ["layout", "style", "background", "spacing", "visibility"] as const;

const panelLabels: Record<string, string> = {
  content: "Content",
  typography: "Typography",
  style: "Style",
  background: "Background",
  visibility: "Visibility",
  layout: "Layout",
  spacing: "Spacing",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readPathValue = (source: unknown, path: readonly string[]): unknown => {
  let current = source;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
};

const stringValue = (value: unknown): string => (typeof value === "string" ? value : "");

const numberValue = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanValue = (value: unknown): boolean => Boolean(value);

/**
 * List-items seam (TASK-105-08-08-L03-L01): raw block values reach this
 * inspector untyped, while `ListItemsControl` owns the stored
 * `PageListItemV2` union (plain string, or `{ label, href }`). Adapt raw
 * entries with the owner's non-destructive read semantics
 * (`pageBlockNormalizerV2.normalizeListItems`): strings stay strings,
 * `{ label, href }` records keep their string fields, scalar legacy values
 * keep their text, and anything else defaults to an empty plain-string item.
 * Values are neither trimmed nor dropped here: trimming stays at the persist
 * boundary, so live edits round-trip untouched, and a non-array raw value
 * renders as an empty list instead of crashing.
 */
const listItemsValue = (value: unknown): PageListItemV2[] => {
  if (!Array.isArray(value)) return [];
  const items: readonly unknown[] = value;
  return items.map((item): PageListItemV2 => {
    if (typeof item === "string") return item;
    if (isRecord(item)) {
      return {
        label: typeof item.label === "string" ? item.label : "",
        href: typeof item.href === "string" ? item.href : "",
      };
    }
    return typeof item === "number" || typeof item === "boolean" ? String(item) : "";
  });
};

const comboboxSourceOptions: Record<
  PageEditorControlOptionsSource,
  () => readonly ComboboxControlOption[]
> = {
  forms: () => (getCachedForms() ?? []).map((form) => ({ value: form.id, label: form.name })),
  contentTypes: () =>
    (getCachedContentTypes() ?? []).map((type) => ({ value: type.id, label: type.name })),
  listingQueries: () =>
    (getCachedListingQueries() ?? [])
      .filter((record) => record.query.source === "entries")
      .map((record) => ({ value: record.id, label: record.name })),
  listingQueriesAll: () =>
    (getCachedListingQueries() ?? []).map((record) => ({
      value: record.id,
      label: record.name,
    })),
  listingTemplates: () =>
    (getCachedListingTemplates() ?? []).map((template) => ({
      value: template.id,
      label: template.name,
    })),
};

const DetailTemplateControlField = ({
  control,
  rawValue,
  onCommit,
}: {
  control: PageEditorControlDefinition;
  rawValue: unknown;
  onCommit: (value: unknown) => void;
}) => {
  const model = resolvePageEditorControlUiModel(control);
  const value = rawValue;
  switch (model.kind) {
    case "text":
      return (
        <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
          {control.label}
          <Input value={stringValue(value)} onChange={(event) => onCommit(event.target.value)} />
        </label>
      );
    case "toggle":
      return (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">{control.label}</span>
          <ToggleSwitch
            label={control.label}
            value={booleanValue(value)}
            onChange={(nextValue) => onCommit(nextValue)}
            tone="light"
          />
        </div>
      );
    case "segmented": {
      const active = stringValue(value) || model.options[0] || "";
      return (
        <SegmentedControl
          label={control.label}
          value={model.options.includes(active) ? active : (model.options[0] ?? "")}
          options={model.options}
          optionLabels={model.labels}
          onChange={(nextValue) => onCommit(nextValue)}
          tone="light"
        />
      );
    }
    case "select": {
      const active = stringValue(value) || model.options[0] || "";
      return (
        <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
          {control.label}
          <select
            value={model.options.includes(active) ? active : (model.options[0] ?? "")}
            onChange={(event) => onCommit(event.target.value)}
            className="h-9 w-full rounded-md border border-[var(--admin-input-border)] bg-[var(--admin-input-bg)] px-3 text-sm text-[var(--admin-input-text)] shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--admin-input-ring)]/50"
          >
            {model.options.map((option) => (
              <option key={option} value={option}>
                {model.labels[option] ?? option}
              </option>
            ))}
          </select>
        </label>
      );
    }
    case "combobox": {
      const options = comboboxSourceOptions[model.optionsSource]();
      return (
        <ComboboxControl
          label={control.label}
          value={typeof value === "string" && value.length > 0 ? value : null}
          options={options}
          placeholder={model.placeholder}
          allowNull={model.allowNull}
          loading={false}
          onChange={(nextValue) => onCommit(nextValue)}
        />
      );
    }
    case "slider":
    case "sliderStepper": {
      const sliderValue = numberValue(value, model.min);
      const props = {
        label: control.label,
        value: sliderValue,
        min: model.min,
        max: model.max,
        step: model.step,
        unit: model.unit,
        tone: "light" as const,
        onChange: (nextValue: number) => onCommit(nextValue),
      };
      return model.kind === "slider" ? (
        <SliderControl {...props} />
      ) : (
        <SliderStepperControl {...props} />
      );
    }
    case "swatch":
      return (
        <ColorSwatchControl
          label={control.label}
          value={stringValue(value)}
          palette={getPageEditorColorPalette()}
          allowCustom={model.allowCustom}
          allowTransparent={model.allowTransparent}
          onChange={(nextValue) => onCommit(nextValue)}
        />
      );
    case "media":
      return (
        <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
          {control.label}
          <Input
            value={stringValue(value)}
            placeholder="Media URL or asset id"
            onChange={(event) => onCommit(event.target.value)}
          />
        </label>
      );
    case "listItems":
      return (
        <ListItemsControl
          label={control.label}
          value={listItemsValue(value)}
          onChange={(nextItems) => onCommit(nextItems)}
          tone="light"
        />
      );
    case "facetList":
      return (
        <FacetListControl
          label={control.label}
          value={Array.isArray(value) ? value : []}
          onChange={(nextFacets) => onCommit(nextFacets)}
          tone="light"
        />
      );
    default:
      return (
        <p className="text-xs text-muted-foreground">
          {control.label}: unsupported control ({model.kind}).
        </p>
      );
  }
};

const ControlGroup = ({
  label,
  controls,
  readValue,
  onCommit,
}: {
  label: string;
  controls: readonly PageEditorControlDefinition[];
  readValue: (control: PageEditorControlDefinition) => unknown;
  onCommit: (control: PageEditorControlDefinition, value: unknown) => void;
}) => {
  if (controls.length === 0) return null;
  return (
    <section className="space-y-3" data-inspector-group={label.toLowerCase()}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {controls.map((control) => (
          <DetailTemplateControlField
            key={control.id}
            control={control}
            rawValue={readValue(control)}
            onCommit={(nextValue) => onCommit(control, nextValue)}
          />
        ))}
      </div>
    </section>
  );
};

const SectionVariantField = ({
  section,
  onChange,
}: {
  section: PageSectionV2;
  onChange: (variant: PageSectionVariant) => void;
}) => {
  const variantControl = getPageSectionVariantControl(section.type);
  if (!variantControl) return null;
  const model = resolvePageEditorControlUiModel(variantControl);
  const active = section.variant || variantControl.options?.[0] || "default";
  const options = model.kind === "select" || model.kind === "segmented" ? model.options : [];
  return (
    <section className="space-y-3" data-inspector-group="variant">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Variant
      </h3>
      {model.kind === "segmented" ? (
        <SegmentedControl
          label={variantControl.label}
          value={options.includes(active) ? active : (options[0] ?? "default")}
          options={options}
          optionLabels={model.labels}
          onChange={(nextValue) => {
            if (isPageSectionVariantOption(section.type, nextValue)) {
              onChange(nextValue);
            }
          }}
          tone="light"
        />
      ) : (
        <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
          {variantControl.label}
          <select
            value={options.includes(active) ? active : (options[0] ?? "default")}
            onChange={(event) => {
              if (isPageSectionVariantOption(section.type, event.target.value)) {
                onChange(event.target.value);
              }
            }}
            className="h-9 w-full rounded-md border border-[var(--admin-input-border)] bg-[var(--admin-input-bg)] px-3 text-sm text-[var(--admin-input-text)] shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--admin-input-ring)]/50"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {model.kind === "select" ? (model.labels[option] ?? option) : option}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
};

export function DetailTemplateInspector({
  section,
  block,
  onSectionChange,
  onBlockChange,
}: DetailTemplateInspectorProps) {
  const blockControlsByPanel = useMemo(() => {
    if (!block) return null;
    const controls = getPageEditorControlsForTarget({ kind: "block", type: block.type });
    return new Map(
      blockPanelOrder.map((panel) => [panel, controls.filter((c) => c.panel === panel)])
    );
  }, [block]);

  const sectionControlsByPanel = useMemo(() => {
    if (!section) return null;
    const controls = getPageEditorControlsForTarget({ kind: "section", type: section.type });
    return new Map(
      sectionPanelOrder.map((panel) => [panel, controls.filter((c) => c.panel === panel)])
    );
  }, [section]);

  if (!section && !block) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a section or block to configure it.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {block && blockControlsByPanel ? (
        <section className="space-y-5" data-inspector-block="true">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Block</h2>
            <Badge variant="secondary">{block.type}</Badge>
            <span className="truncate text-xs text-muted-foreground">
              {getBlockDisplayLabel(block)}
            </span>
          </div>
          {getPageBlockCapability(block.type).editorInsertable ? (
            <>
              {blockPanelOrder.map((panel) => (
                <ControlGroup
                  key={panel}
                  label={panelLabels[panel] ?? panel}
                  controls={blockControlsByPanel.get(panel) ?? []}
                  readValue={(control) => readPathValue(block, control.path)}
                  onCommit={(control, value) =>
                    onBlockChange(patchBlockControlForDevice(block, "desktop", control, value))
                  }
                />
              ))}
            </>
          ) : (
            <p className="text-xs text-muted-foreground" data-legacy-inspector-note="true">
              This block is a read-only legacy widget. Re-author it as a Page V2 block to edit its
              props here.
            </p>
          )}
        </section>
      ) : null}

      {section ? (
        <section className="space-y-5" data-inspector-section="true">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Section</h2>
            <Badge variant="secondary">{section.type}</Badge>
            <span className="truncate text-xs text-muted-foreground">{section.name}</span>
          </div>
          <SectionVariantField
            section={section}
            onChange={(variant) => onSectionChange({ ...section, variant })}
          />
          {sectionControlsByPanel
            ? sectionPanelOrder.map((panel) => (
                <ControlGroup
                  key={panel}
                  label={panelLabels[panel] ?? panel}
                  controls={sectionControlsByPanel.get(panel) ?? []}
                  readValue={(control) => readPathValue(section, control.path)}
                  onCommit={(control, value) =>
                    onSectionChange(
                      patchSectionControlForDevice(section, "desktop", control, value)
                    )
                  }
                />
              ))
            : null}
        </section>
      ) : null}
    </div>
  );
}
