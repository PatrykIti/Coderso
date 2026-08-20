// TASK-481-02-L02 facade split (Part A): registry-driven inspector fields and
// control rendering. Field components (SectionRegistryControlField,
// RegistryControlField), the control-input dispatcher (RegistryControlInput),
// dynamic option sources, the gradient field, the media-url field, and the
// palette context. Extracted verbatim from the former PageEditor.tsx body.
// Single writer: TASK-481-02-L02. No behavior change.

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCachedContentTypes, listContentTypesCached } from "@/services/contentTypesClient";
import { listEntriesCached } from "@/services/entriesClient";
import { getCachedForms, listFormsCached } from "@/services/formsClient";
import {
  getCachedListingQueries,
  getCachedListingTemplates,
  listListingQueriesCached,
  listListingTemplatesCached,
  type ListingQueryRecord,
} from "@/services/listingsClient";
import { getPageBlockRenderDefault } from "../../../../services/pages/pageBlockRenderDefaults";
import {
  hasResponsiveOverride,
  readBlockBreakpointOverride,
  readSectionBreakpointOverride,
} from "../../../../services/pages/pageEditorState";
import {
  type PageBlockV2,
  type PageBreakpoint,
  type PageSectionV2,
} from "../../../../services/pages/pageDocumentV2";
import {
  isPageEditorControlVisible,
  type PageEditorControlDefinition,
  type PageEditorControlOptionsSource,
} from "../../../../services/pages/pageEditorControlRegistry";
import {
  resolvePageEditorControlUiModel,
  type PageEditorControlUiModel,
} from "../../../../services/pages/pageEditorControlUiModel";
import { usePageEditorColorPalette } from "../../../../services/pages/pageEditorColorPaletteContext";
import {
  composeAuthoringGradientCss,
  type AuthoringGradientModel,
} from "../../../../services/pages/pageAuthoringSanitizers";
import type { PageEditorCollectionPreviewSource } from "../../../../services/pages/pageEditorCollectionPreview";
import {
  ColorSwatchControl,
  ComboboxControl,
  FacetListControl,
  GalleryCategoryTokensControl,
  GalleryItemsControl,
  ListItemsControl,
  MediaUrlControl,
  SegmentedControl,
  SliderControl,
  SliderStepperControl,
  ToggleSwitch,
  type ComboboxControlOption,
} from "../editorControls";
import {
  editorButtonClassFor,
  editorControlLabelClassFor,
  editorGhostButtonClassFor,
  editorPanelRowClass,
  useEditorControlTone,
} from "../editorControls/controlChrome";
import {
  ResponsiveControlShell,
  ToolbarSelectField,
  ToolbarTextField,
} from "./PageEditorSettingsPanel";

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readPathValue = (source: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((current, key) => {
    if (!isPlainRecord(current)) return undefined;
    return current[key];
  }, source);

const fieldValueFromControlValue = (
  control: PageEditorControlDefinition,
  value: unknown,
  renderDefault?: string | number
): string => {
  if (control.input === "switch") {
    if (typeof value === "boolean") return value ? "yes" : "no";
    return control.fallback === true ? "yes" : "no";
  }
  if (control.input === "number") {
    if (typeof value === "number") return String(value);
    if (typeof renderDefault === "number") return String(renderDefault);
    return typeof control.fallback === "number" ? String(control.fallback) : "";
  }
  if (control.input === "select" || control.input === "segmented") {
    if (typeof value === "string") return value;
    if (typeof renderDefault === "string") return renderDefault;
    return typeof control.fallback === "string" ? control.fallback : "";
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};
const coerceControlFieldValue = (control: PageEditorControlDefinition, value: string): unknown => {
  if (control.input === "switch") return value === "yes";
  if (control.input === "number") {
    const parsed = Number(value);
    const fallback = control.clamp?.min ?? 0;
    const next = Number.isFinite(parsed) ? parsed : fallback;
    if (!control.clamp) return next;
    return Math.min(control.clamp.max, Math.max(control.clamp.min, next));
  }
  return value;
};
export const SectionRegistryControlField = ({
  section,
  baseSection,
  device,
  control,
  onChange,
  onReset,
}: {
  section: PageSectionV2;
  baseSection: PageSectionV2;
  device: PageBreakpoint;
  control: PageEditorControlDefinition;
  onChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onReset: (path: readonly string[]) => void;
}) => {
  // Stable commit identity: MediaUrlControl (TASK-539-03-L02) invalidates
  // in-flight requests when its onChange identity changes. Keying the commit
  // to the control + handler (not to the parent render) keeps an unrelated
  // re-render from cancelling a legitimate media selection. The hook must run
  // unconditionally before any reachability gate can return null.
  const commitControl = useCallback(
    (nextValue: unknown) => onChange(control, nextValue),
    [onChange, control]
  );
  // TASK-539-03-L03 canonical projection: base-only controls read, display,
  // gate, and commit against the BASE section with a desktop field device,
  // never the active tablet/mobile target. Responsive controls keep the
  // effective active-device section.
  const fieldDevice: PageBreakpoint = control.responsive ? device : "desktop";
  const fieldTarget = control.responsive ? section : baseSection;
  // Reachability gates resolve on the same base/effective targets: a base-only
  // gate (e.g. parallaxIntensity on scrollEffect) can never be opened or
  // closed by a tablet/mobile override.
  if (
    !isPageEditorControlVisible(control, {
      baseTarget: baseSection,
      effectiveTarget: section,
    })
  ) {
    return null;
  }
  const value = readPathValue(fieldTarget, control.path);
  const override = hasResponsiveOverride(
    fieldDevice,
    readSectionBreakpointOverride(baseSection, fieldDevice),
    control.overridePath
  );
  return (
    <ResponsiveControlShell
      device={fieldDevice}
      override={override}
      label={control.label}
      onReset={() => onReset(control.overridePath)}
    >
      <RegistryControlInput
        control={control}
        rawValue={value}
        commitActiveOption={fieldDevice !== "desktop" && !override}
        onCommit={commitControl}
      />
    </ResponsiveControlShell>
  );
};

export const RegistryControlField = ({
  block,
  baseBlock,
  device,
  control,
  onChange,
  onReset,
}: {
  block: PageBlockV2;
  baseBlock: PageBlockV2 | undefined;
  device: PageBreakpoint;
  control: PageEditorControlDefinition;
  onChange: (control: PageEditorControlDefinition, value: unknown) => void;
  onReset: (path: readonly string[]) => void;
}) => {
  // Stable commit identity: MediaUrlControl (TASK-539-03-L02) invalidates
  // in-flight requests when its onChange identity changes. Keying the commit
  // to the control + handler (not to the parent render) keeps an unrelated
  // re-render from cancelling a legitimate media selection. The hook must run
  // unconditionally before any reachability gate can return null.
  const commitControl = useCallback(
    (nextValue: unknown) => onChange(control, nextValue),
    [onChange, control]
  );
  // TASK-539-03-L03 canonical projection: base-only controls (gallery,
  // divider, form extras) read, display, gate, and commit against the BASE
  // block with a desktop field device, never the active tablet/mobile target.
  // Responsive controls keep the effective active-device block.
  const fieldDevice: PageBreakpoint = control.responsive ? device : "desktop";
  const fieldTarget = control.responsive ? block : (baseBlock ?? block);
  // Reachability gates resolve on the same base/effective targets: a base-only
  // gate (e.g. gallery filterCategories on filterable, divider width/align on
  // gradient) can never be opened or closed by a tablet/mobile override.
  if (
    !isPageEditorControlVisible(control, {
      baseTarget: baseBlock ?? block,
      effectiveTarget: block,
    })
  ) {
    return null;
  }
  const value = readPathValue(fieldTarget, control.path);
  const override = hasResponsiveOverride(
    fieldDevice,
    readBlockBreakpointOverride(baseBlock, fieldDevice),
    control.overridePath
  );
  // Scoped combobox sources (TASK-457) read the sibling prop named by the
  // registry's `filterBy` from the SAME resolved target the value comes from.
  const filterRaw = control.filterBy
    ? readPathValue(fieldTarget, ["props", control.filterBy])
    : undefined;
  const comboboxFilterValue =
    typeof filterRaw === "string" && filterRaw.length > 0 ? filterRaw : null;
  // TASK-539-03-L03: the canonical media/gallery parent scope is the
  // collision-safe `["block", baseId, control.id]` tuple. The field is keyed
  // and remounted by it, so a target or control switch invalidates every
  // pending media-resolution request from the previous target.
  const mediaScopeKey = baseBlock ? JSON.stringify(["block", baseBlock.id, control.id]) : null;
  return (
    <ResponsiveControlShell
      device={fieldDevice}
      override={override}
      label={control.label}
      onReset={() => onReset(control.overridePath)}
    >
      <RegistryControlInput
        control={control}
        rawValue={value}
        renderDefault={getPageBlockRenderDefault(fieldTarget, control.path)}
        blockBackgroundType={fieldTarget.style?.backgroundType}
        commitActiveOption={fieldDevice !== "desktop" && !override}
        comboboxFilterValue={comboboxFilterValue}
        mediaScopeKey={mediaScopeKey}
        galleryCategoryTokens={readStringArrayValue(fieldTarget, ["props", "filterCategories"])}
        onCommit={commitControl}
      />
    </ResponsiveControlShell>
  );
};

/** Reads a stored string array (e.g. gallery `filterCategories`) defensively. */
const readStringArrayValue = (source: unknown, path: readonly string[]): readonly string[] => {
  const value = readPathValue(source, path);
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
};

/** Mime accept hints for registry media controls, keyed by control id. */
const mediaControlAccept: Record<string, readonly string[]> = {
  "block.style.backgroundImage": ["image/*"],
  "block.image.props.src": ["image/*"],
  "block.video.props.src": ["video/*"],
  "block.card.props.image": ["image/*"],
};

/**
 * Resolves one canvas collection preview source through the cached admin
 * clients (TASK-457): the content types list gives id -> slug/name, the
 * per-type entries list gives the published entries the canvas projects. A
 * missing content type resolves to `null` (the fail-closed preview binding).
 */
export const loadCollectionPreviewSource = async (
  contentTypeId: string
): Promise<PageEditorCollectionPreviewSource> => {
  const contentTypes = await listContentTypesCached();
  const contentType = contentTypes.find((candidate) => candidate.id === contentTypeId);
  if (!contentType) return null;
  const entries = await listEntriesCached(contentType.slug);
  return {
    contentType: { id: contentType.id, name: contentType.name, slug: contentType.slug },
    entries,
  };
};

/**
 * Saved listing queries are SCOPED to one content type (TASK-457): only
 * entry-sourced queries explicitly targeting the picked `contentTypeId`
 * resolve as options; with no content type picked the list is honestly empty
 * (the combobox shows the source's empty-state copy).
 */
const filterListingQueryOptions = (
  queries: readonly ListingQueryRecord[],
  contentTypeId: string | null
): ComboboxControlOption[] =>
  contentTypeId
    ? queries
        .filter(
          (record) =>
            record.query.source === "entries" &&
            record.query.sourceConfig.contentTypeId === contentTypeId
        )
        .map((record) => ({ value: record.id, label: record.name }))
    : [];

/**
 * Dynamic option sources for registry combobox controls (TASK-456/457). The
 * registry/adapter only NAME a source; this map is the editor-shell owner
 * that wires each source onto its cached admin client (cache-hydrate first,
 * cached fetch for revalidation). Values are stored ids, labels are names.
 * `filterValue` carries the sibling-prop scope for filtered sources
 * (`filterBy` in the registry); unfiltered sources ignore it.
 */
const comboboxOptionsSources: Record<
  PageEditorControlOptionsSource,
  {
    getCachedOptions: (filterValue: string | null) => ComboboxControlOption[] | null;
    listOptions: (filterValue: string | null) => Promise<ComboboxControlOption[]>;
  }
> = {
  forms: {
    getCachedOptions: () =>
      getCachedForms()?.map((form) => ({ value: form.id, label: form.name })) ?? null,
    listOptions: async () =>
      (await listFormsCached()).map((form) => ({ value: form.id, label: form.name })),
  },
  contentTypes: {
    getCachedOptions: () =>
      getCachedContentTypes()?.map((type) => ({ value: type.id, label: type.name })) ?? null,
    listOptions: async () =>
      (await listContentTypesCached()).map((type) => ({ value: type.id, label: type.name })),
  },
  listingQueries: {
    getCachedOptions: (filterValue) => {
      const cached = getCachedListingQueries();
      return cached ? filterListingQueryOptions(cached, filterValue) : null;
    },
    listOptions: async (filterValue) =>
      filterListingQueryOptions(await listListingQueriesCached(), filterValue),
  },
  // Unscoped saved-query list (TASK-459-02): the filters block has no
  // contentTypeId sibling, so it binds to any saved listing query directly.
  listingQueriesAll: {
    getCachedOptions: () =>
      getCachedListingQueries()?.map((record) => ({ value: record.id, label: record.name })) ??
      null,
    listOptions: async () =>
      (await listListingQueriesCached()).map((record) => ({
        value: record.id,
        label: record.name,
      })),
  },
  listingTemplates: {
    getCachedOptions: () =>
      getCachedListingTemplates()?.map((template) => ({
        value: template.id,
        label: template.name,
      })) ?? null,
    listOptions: async () =>
      (await listListingTemplatesCached()).map((template) => ({
        value: template.id,
        label: template.name,
      })),
  },
};

/**
 * Registry combobox field: hydrates options synchronously from the admin
 * cache when available and revalidates through the cached list call. Commits
 * the picked id (or `null` from the "None" row) straight through the normal
 * control write path — stored value shapes stay schema-owned. Filtered
 * sources (TASK-457, e.g. listing queries scoped by `contentTypeId`) key the
 * resolved lists by filter value so a scope switch never shows the previous
 * scope's options.
 */
const ToolbarComboboxField = ({
  label,
  model,
  rawValue,
  filterValue = null,
  onCommit,
}: {
  label: string;
  model: Extract<PageEditorControlUiModel, { kind: "combobox" }>;
  rawValue: unknown;
  /** Current value of the registry `filterBy` sibling prop, if any. */
  filterValue?: string | null;
  onCommit: (value: string | null) => void;
}) => {
  const source = comboboxOptionsSources[model.optionsSource];
  const filterKey = filterValue ?? "";
  const [resolvedByFilter, setResolvedByFilter] = useState<Record<string, ComboboxControlOption[]>>(
    {}
  );
  useEffect(() => {
    let active = true;
    source
      .listOptions(filterKey.length > 0 ? filterKey : null)
      .then((items) => {
        if (active) {
          setResolvedByFilter((current) => ({ ...current, [filterKey]: items }));
        }
      })
      .catch(() => {
        // Load failures keep the cached (or empty) list; the stored value
        // stays untouched and surfaces as dangling until options resolve.
        if (active) {
          setResolvedByFilter((current) =>
            filterKey in current ? current : { ...current, [filterKey]: [] }
          );
        }
      });
    return () => {
      active = false;
    };
  }, [source, filterKey]);
  const options =
    resolvedByFilter[filterKey] ?? source.getCachedOptions(filterKey.length > 0 ? filterKey : null);
  return (
    <ComboboxControl
      label={label}
      value={typeof rawValue === "string" && rawValue.length > 0 ? rawValue : null}
      options={options ?? []}
      placeholder={model.placeholder}
      allowNull={model.allowNull}
      loading={options === null || options === undefined}
      {...(model.emptyMessage ? { emptyMessage: model.emptyMessage } : {})}
      onChange={onCommit}
    />
  );
};

type ToolbarGradientStopDraft = {
  id: string;
  color: string;
  position: number;
};

type ToolbarGradientDraft = {
  kind: AuthoringGradientModel["kind"];
  angle: number;
  stops: ToolbarGradientStopDraft[];
};

let toolbarGradientStopId = 0;

const createToolbarGradientStopDraft = (
  color: string,
  position: number
): ToolbarGradientStopDraft => {
  toolbarGradientStopId += 1;
  return { id: `gradient-stop-${toolbarGradientStopId}`, color, position };
};

const clampToolbarGradientNumber = (value: number, min: number, max: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
};

const createDefaultToolbarGradientDraft = (): ToolbarGradientDraft => ({
  kind: "linear",
  angle: 135,
  stops: [
    createToolbarGradientStopDraft("var(--color-primary)", 0),
    createToolbarGradientStopDraft("var(--color-accent)", 100),
  ],
});

const splitTopLevelCssList = (value: string): string[] => {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      items.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items;
};

const parseToolbarGradientStop = (value: string): ToolbarGradientStopDraft | null => {
  const match = /^(.*)\s+(-?\d+(?:\.\d+)?)%$/.exec(value.trim());
  if (!match?.[1] || !match[2]) return null;
  const position = Number(match[2]);
  return createToolbarGradientStopDraft(
    match[1].trim(),
    clampToolbarGradientNumber(position, 0, 100, 0)
  );
};

const parseToolbarGradientDraft = (value: string): ToolbarGradientDraft => {
  const trimmed = value.trim();
  const match = /^(linear|radial)-gradient\((.*)\)$/i.exec(trimmed);
  if (!match?.[1] || !match[2]) return createDefaultToolbarGradientDraft();
  const kind: AuthoringGradientModel["kind"] =
    match[1].toLowerCase() === "radial" ? "radial" : "linear";
  const parts = splitTopLevelCssList(match[2]);
  const angleMatch = kind === "linear" ? /^(-?\d+(?:\.\d+)?)deg$/i.exec(parts[0] ?? "") : null;
  const angle = angleMatch?.[1]
    ? clampToolbarGradientNumber(Number(angleMatch[1]), 0, 360, 135)
    : 135;
  const stopParts = kind === "linear" && angleMatch ? parts.slice(1) : parts;
  const stops = stopParts
    .map(parseToolbarGradientStop)
    .filter((stop): stop is ToolbarGradientStopDraft => Boolean(stop))
    .sort((left, right) => left.position - right.position);
  return stops.length >= 2 ? { kind, angle, stops } : createDefaultToolbarGradientDraft();
};

const normalizeToolbarGradientDraft = (draft: ToolbarGradientDraft): ToolbarGradientDraft => ({
  kind: draft.kind === "radial" ? "radial" : "linear",
  angle: clampToolbarGradientNumber(draft.angle, 0, 360, 135),
  stops: draft.stops
    .slice(0, 6)
    .map((stop) => ({
      ...stop,
      position: clampToolbarGradientNumber(stop.position, 0, 100, 0),
    }))
    .sort((left, right) => left.position - right.position),
});

const ToolbarGradientField = ({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) => {
  const tone = useEditorControlTone();
  const colorPalette = usePageEditorColorPalette();
  const sourceValue = value.trim();
  const [draftState, setDraftState] = useState(() => ({
    source: sourceValue,
    draft: parseToolbarGradientDraft(sourceValue),
  }));
  const draft =
    draftState.source === sourceValue ? draftState.draft : parseToolbarGradientDraft(sourceValue);
  const commitDraft = (nextDraft: ToolbarGradientDraft) => {
    const normalized = normalizeToolbarGradientDraft(nextDraft);
    setDraftState({ source: sourceValue, draft: normalized });
    const css = composeAuthoringGradientCss(normalized);
    if (css) onCommit(css);
  };
  const updateStop = (
    stopId: string,
    updater: (stop: ToolbarGradientStopDraft) => ToolbarGradientStopDraft
  ) => {
    commitDraft({
      ...draft,
      stops: draft.stops.map((stop) => (stop.id === stopId ? updater(stop) : stop)),
    });
  };
  return (
    <div className="grid gap-2" data-page-editor-control="gradient">
      <SegmentedControl
        label="Gradient type"
        value={draft.kind}
        options={["linear", "radial"]}
        optionLabels={{ linear: "Linear", radial: "Radial" }}
        onChange={(kind) =>
          commitDraft({ ...draft, kind: kind === "radial" ? "radial" : "linear" })
        }
      />
      {draft.kind === "linear" ? (
        <SliderStepperControl
          label="Angle"
          value={draft.angle}
          min={0}
          max={360}
          step={15}
          unit="deg"
          onChange={(angle) => commitDraft({ ...draft, angle })}
        />
      ) : null}
      <div className="grid gap-2" data-page-editor-gradient-stops="true">
        {draft.stops.map((stop, index) => (
          <div
            key={stop.id}
            className={`grid gap-2 rounded-md p-2 ${
              tone === "light" ? editorPanelRowClass : "border border-white/10 bg-white/5"
            }`}
            data-page-editor-gradient-stop={index + 1}
          >
            <div className="flex items-start justify-between gap-2">
              <ColorSwatchControl
                label={`Stop ${index + 1}`}
                value={stop.color}
                palette={colorPalette}
                allowTransparent={false}
                onChange={(color) => {
                  if (color) updateStop(stop.id, (current) => ({ ...current, color }));
                }}
              />
              {draft.stops.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={editorGhostButtonClassFor(tone)}
                  onClick={() =>
                    commitDraft({
                      ...draft,
                      stops: draft.stops.filter((current) => current.id !== stop.id),
                    })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <SliderControl
              label={`Stop ${index + 1} position`}
              value={stop.position}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(position) => updateStop(stop.id, (current) => ({ ...current, position }))}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={editorButtonClassFor(tone)}
        disabled={draft.stops.length >= 6}
        onClick={() => {
          const lastPosition = draft.stops.at(-1)?.position ?? 100;
          commitDraft({
            ...draft,
            stops: [
              ...draft.stops,
              createToolbarGradientStopDraft(
                "var(--color-surface)",
                clampToolbarGradientNumber(lastPosition + 10, 0, 100, 100)
              ),
            ],
          });
        }}
      >
        <Plus className="h-4 w-4" />
        Add stop
      </Button>
    </div>
  );
};

/**
 * Maps a registry control through the pure UI-model adapter onto the dedicated
 * floating-inspector primitives. Stored value shapes are preserved: segmented
 * and select emit the stored option token, toggles emit booleans, sliders emit
 * clamped numbers, swatches emit color strings, and media emits the resolved
 * library URL (or null). Raw text inputs remain only for free-form strings.
 */
const RegistryControlInput = ({
  control,
  rawValue,
  renderDefault,
  blockBackgroundType,
  commitActiveOption = false,
  comboboxFilterValue = null,
  mediaScopeKey = null,
  galleryCategoryTokens = [],
  onCommit,
}: {
  control: PageEditorControlDefinition;
  rawValue: unknown;
  blockBackgroundType?: string | null;
  /**
   * Current value of the registry `filterBy` sibling prop for combobox
   * controls with a scoped source (TASK-457); `null` when unscoped or unset.
   */
  comboboxFilterValue?: string | null;
  /**
   * Effective render default for the field when the document stores no value
   * (`pageBlockRenderDefaults`, owner finding #9 round 3). Display-only: the
   * control presents it as the active value, but committing it writes the
   * explicit value through the normal path.
   */
  renderDefault?: string | number;
  /**
   * Tablet/mobile fields without an override yet set this so an explicit
   * click on the inherited segmented value still commits — pinning it as a
   * breakpoint override instead of silently no-opping.
   */
  commitActiveOption?: boolean;
  /**
   * TASK-539-03-L03 canonical media/gallery parent scope:
   * `["block", baseId, control.id]`. `null` renders no media/gallery control:
   * there is no canonical registry block target to receive a write.
   */
  mediaScopeKey?: string | null;
  /** Stored gallery `filterCategories` tokens used as row suggestions. */
  galleryCategoryTokens?: readonly string[];
  onCommit: (value: unknown) => void;
}) => {
  const model = resolvePageEditorControlUiModel(control);
  const colorPalette = usePageEditorColorPalette();
  const fieldValue = fieldValueFromControlValue(control, rawValue, renderDefault);
  const hasStoredValue =
    control.input === "number" ? typeof rawValue === "number" : typeof rawValue === "string";
  if (control.id === "block.style.background" && blockBackgroundType === "gradient") {
    return (
      <ToolbarGradientField
        value={typeof rawValue === "string" ? rawValue : ""}
        onCommit={onCommit}
      />
    );
  }
  switch (model.kind) {
    case "segmented":
      // When the active option is only the DISPLAYED default of an unset
      // field (render default or registry fallback), an explicit click on it
      // must still commit — writing the explicit value instead of silently
      // no-opping (owner finding #9 round 3: acceptable and honest).
      return (
        <SegmentedControl
          label={control.label}
          value={fieldValue}
          options={model.options}
          optionLabels={model.labels}
          commitActiveOption={commitActiveOption || (!hasStoredValue && fieldValue.length > 0)}
          onChange={(nextValue) => onCommit(coerceControlFieldValue(control, nextValue))}
        />
      );
    case "select":
      return (
        <ToolbarSelectField
          label={control.label}
          value={fieldValue}
          options={model.options}
          optionLabels={model.labels}
          onChange={(nextValue) => onCommit(coerceControlFieldValue(control, nextValue))}
        />
      );
    case "combobox":
      // Dynamic reference picker (TASK-456): emits the stored id, or the
      // explicit `null` the nullable schema stores for "no selection".
      return (
        <ToolbarComboboxField
          label={control.label}
          model={model}
          rawValue={rawValue}
          filterValue={comboboxFilterValue}
          onCommit={(nextValue) => onCommit(nextValue)}
        />
      );
    case "toggle":
      // fieldValue carries the effective boolean (stored value or the schema
      // fallback for unset fields), so the switch never lies "off" for an
      // unset field that renders as enabled.
      return (
        <ToggleSwitch
          label={control.label}
          value={fieldValue === "yes"}
          onChange={(nextValue) => onCommit(nextValue)}
        />
      );
    case "slider":
    case "sliderStepper": {
      // An empty field value means "unset without a render default or schema
      // fallback": rest at the model minimum explicitly. `Number("")` is 0,
      // which would otherwise silently display 0 for values that render
      // differently when unset.
      const parsed = fieldValue.length > 0 ? Number(fieldValue) : Number.NaN;
      const sliderValue = Number.isFinite(parsed) ? parsed : model.min;
      const sliderProps = {
        label: control.label,
        value: sliderValue,
        min: model.min,
        max: model.max,
        step: model.step,
        unit: model.unit,
        onChange: (nextValue: number) =>
          onCommit(coerceControlFieldValue(control, String(nextValue))),
      };
      return model.kind === "slider" ? (
        <SliderControl {...sliderProps} />
      ) : (
        <SliderStepperControl {...sliderProps} />
      );
    }
    case "swatch":
      return (
        <ColorSwatchControl
          label={control.label}
          value={typeof rawValue === "string" ? rawValue : ""}
          palette={colorPalette}
          allowCustom={model.allowCustom}
          allowTransparent={model.allowTransparent}
          // "Transparent" commits the explicit cleared value (null) that the
          // pageDocumentV2 nullable block color normalizers store.
          onChange={(nextValue) => onCommit(nextValue)}
        />
      );
    case "media":
      // TASK-539-03-L03: the extracted MediaUrlControl owns the URL-storage
      // contract and stale-write protection; keying it by the canonical scope
      // remounts it when the target or control changes so a pending media
      // resolution can never commit to the replacement target. `onCommit` is
      // the field's stable commit identity, so an unrelated re-render never
      // invalidates a legitimate in-flight selection.
      return mediaScopeKey ? (
        <MediaUrlControl
          key={mediaScopeKey}
          label={control.label}
          value={typeof rawValue === "string" ? rawValue : ""}
          scopeKey={mediaScopeKey}
          accept={mediaControlAccept[control.id]}
          onChange={onCommit}
        />
      ) : null;
    case "listItems":
      // Structured list items (footer link columns): commits the owner
      // `PageListItemV2` shapes — plain strings stay plain, link rows store
      // `{ label, href }` — through the normal control write path.
      return (
        <ListItemsControl
          label={control.label}
          value={Array.isArray(rawValue) ? rawValue : []}
          onChange={(nextItems) => onCommit(nextItems)}
        />
      );
    case "galleryItems":
      // TASK-539 gallery rows: the dedicated canonical control, never
      // `ListItemsControl`. Malformed stored values display as an empty list
      // and are never committed until an explicit user edit; the control
      // reads only the known row keys and never truncates stored values.
      return mediaScopeKey ? (
        <GalleryItemsControl
          key={mediaScopeKey}
          label={control.label}
          value={Array.isArray(rawValue) ? rawValue : []}
          categoryTokens={galleryCategoryTokens}
          parentScopeKey={mediaScopeKey}
          onChange={onCommit}
        />
      ) : null;
    case "galleryCategoryTokens":
      // TASK-539 category-token builder behind `props.filterCategories`;
      // commits the ordered deduplicated token stack in the owner contract.
      return (
        <GalleryCategoryTokensControl
          label={control.label}
          value={
            Array.isArray(rawValue)
              ? rawValue.filter((entry): entry is string => typeof entry === "string")
              : []
          }
          onChange={onCommit}
        />
      );
    case "facetList":
      // Generic facet builder (TASK-459-02): commits the canonical
      // `ListingFacetConfig[]` shapes the pageDocumentV2 facet normalizer
      // owns, through the normal control write path.
      return (
        <FacetListControl
          label={control.label}
          value={Array.isArray(rawValue) ? rawValue : []}
          onChange={(nextFacets) => onCommit(nextFacets)}
        />
      );
    case "text":
      return (
        <ToolbarTextField
          label={control.label}
          value={fieldValue}
          onChange={(nextValue) => onCommit(coerceControlFieldValue(control, nextValue))}
        />
      );
    default:
      return <UnsupportedControlNotice label={control.label} model={model} />;
  }
};

const UnsupportedControlNotice = ({
  label,
  model,
}: {
  label: string;
  model: Extract<PageEditorControlUiModel, { kind: "unsupported" }>;
}) => {
  const tone = useEditorControlTone();
  return (
    <div
      className="grid gap-1"
      data-page-editor-control="unsupported"
      data-page-editor-control-reason={model.reason}
    >
      <span className={editorControlLabelClassFor(tone)}>{label}</span>
      <p className={`text-xs ${tone === "light" ? "text-muted-foreground" : "text-slate-400"}`}>
        This value cannot be edited here.
      </p>
    </div>
  );
};
