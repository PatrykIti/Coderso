import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import {
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { listEntriesCached, type EntrySummary } from "@/services/entriesClient";

import {
  normalizeEntryTeaserData,
  resolveEntryTeaserVariant,
  type EntryTeaserCtaHrefMode,
  type EntryTeaserData,
  type EntryTeaserSourceMode,
  type EntryTeaserVariantId,
  type EntryTeaserRadius,
  type EntryTeaserSpacing,
} from "../../../../widgets/core/entryTeaser";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions: Array<{
  id: EntryTeaserVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "horizontal",
    label: "Horizontal",
    description: "Media and text side by side.",
  },
  {
    id: "vertical",
    label: "Vertical",
    description: "Stacked card teaser layout.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Compact teaser for tighter sections.",
  },
];

const sourceModeOptions: Array<{ id: EntryTeaserSourceMode; label: string }> = [
  { id: "latest", label: "Latest entry" },
  { id: "featured", label: "Featured entry" },
  { id: "manual", label: "Manual entry" },
];

const hrefModeOptions: Array<{ id: EntryTeaserCtaHrefMode; label: string }> = [
  { id: "auto", label: "Auto entry URL" },
  { id: "custom", label: "Custom URL" },
];

const radiusOptions: Array<{ id: EntryTeaserRadius; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const spacingOptions: Array<{ id: EntryTeaserSpacing; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
];

const NO_CONTENT_TYPE_VALUE = "__no_content_type__";
const NO_ENTRY_VALUE = "__no_entry__";

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: EntryTeaserVariantId;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function useContentTypeEntries(types: ContentTypeSummary[]) {
  const [entriesByTypeSlug, setEntriesByTypeSlug] = useState<Record<string, EntrySummary[]>>(
    {}
  );
  const [entryLoadError, setEntryLoadError] = useState<string | null>(null);

  const ensureEntriesLoaded = useCallback(
    async (typeSlug: string) => {
      if (!typeSlug) return;
      if (entriesByTypeSlug[typeSlug]) return;
      try {
        const rows = await listEntriesCached(typeSlug, { force: true });
        setEntriesByTypeSlug((current) => ({
          ...current,
          [typeSlug]: rows,
        }));
      } catch (err) {
        if (isApiClientError(err)) {
          setEntryLoadError(err.message);
        } else {
          setEntryLoadError("Failed to load entries.");
        }
      }
    },
    [entriesByTypeSlug]
  );

  const getEntriesForTypeId = (typeId: string | undefined) => {
    if (!typeId) return [];
    const type = types.find((entry) => entry.id === typeId);
    if (!type) return [];
    return entriesByTypeSlug[type.slug] ?? [];
  };

  return {
    ensureEntriesLoaded,
    getEntriesForTypeId,
    entryLoadError,
  };
}

function normalizeValue(value: EntryTeaserData): EntryTeaserData {
  return normalizeEntryTeaserData(value);
}

function updateValue(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  updater: (current: EntryTeaserData) => EntryTeaserData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

type SourceData = NonNullable<EntryTeaserData["source"]>;
type FieldData = NonNullable<EntryTeaserData["fields"]>;
type CtaData = NonNullable<EntryTeaserData["cta"]>;
type StyleData = NonNullable<EntryTeaserData["style"]>;
type FallbackData = NonNullable<EntryTeaserData["fallback"]>;

function updateSource(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<SourceData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    source: {
      ...current.source,
      ...patch,
    },
  }));
}

function updateFields(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<FieldData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    fields: {
      ...current.fields,
      ...patch,
    },
  }));
}

function updateCta(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<CtaData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    cta: {
      ...current.cta,
      ...patch,
    },
  }));
}

function updateStyle(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateFallback(
  value: EntryTeaserData,
  onChange: (next: EntryTeaserData) => void,
  patch: Partial<FallbackData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    fallback: {
      ...current.fallback,
      ...patch,
    },
  }));
}

function SourcePickerFields({
  value,
  onChange,
  sourceMode,
  compact,
}: {
  value: EntryTeaserData;
  onChange: (next: EntryTeaserData) => void;
  sourceMode: EntryTeaserSourceMode;
  compact?: boolean;
}) {
  const [types, setTypes] = useState<ContentTypeSummary[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const normalized = normalizeValue(value);
  const selectedTypeId = normalized.source?.contentTypeId ?? "";
  const selectedEntryId = normalized.source?.entryId ?? "";

  useEffect(() => {
    let active = true;
    listContentTypesCached({ force: true })
      .then((items) => {
        if (!active) return;
        setTypes(items);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setTypesError(err.message);
        } else {
          setTypesError("Failed to load content types.");
        }
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingTypes(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const { ensureEntriesLoaded, getEntriesForTypeId, entryLoadError } =
    useContentTypeEntries(types);

  const selectedType = types.find((entry) => entry.id === selectedTypeId);
  const selectedTypeSlug = selectedType?.slug ?? "";
  const entries = getEntriesForTypeId(selectedTypeId);

  useEffect(() => {
    if (sourceMode !== "manual") return;
    if (!selectedTypeSlug) return;
    void ensureEntriesLoaded(selectedTypeSlug);
  }, [sourceMode, selectedTypeSlug, ensureEntriesLoaded]);

  const selectedTypeValue =
    selectedTypeId.trim().length > 0 ? selectedTypeId : NO_CONTENT_TYPE_VALUE;
  const selectedTypeLabel =
    selectedTypeValue === NO_CONTENT_TYPE_VALUE
      ? "No content type selected"
      : selectedType?.name ?? "Selected content type";

  const selectedEntryValue =
    selectedEntryId.trim().length > 0 ? selectedEntryId : NO_ENTRY_VALUE;
  const selectedEntryLabel =
    selectedEntryValue === NO_ENTRY_VALUE
      ? "No entry selected"
      : entries.find((entry) => entry.id === selectedEntryValue)?.title ??
        "Selected entry";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm font-medium">Content type</p>
        <Select
          value={selectedTypeValue}
          onValueChange={(next) =>
            updateSource(value, onChange, {
              contentTypeId: next === NO_CONTENT_TYPE_VALUE ? "" : next,
              entryId: "",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select content type">{selectedTypeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CONTENT_TYPE_VALUE}>No content type selected</SelectItem>
            {types.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLoadingTypes ? (
          <p className="text-xs text-muted-foreground">Loading content types...</p>
        ) : null}
        {typesError ? <p className="text-xs text-destructive">{typesError}</p> : null}
      </div>

      {sourceMode === "manual" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Manual entry</p>
          <Select
            value={selectedEntryValue}
            onValueChange={(next) =>
              updateSource(value, onChange, {
                entryId: next === NO_ENTRY_VALUE ? "" : next,
              })
            }
            disabled={!selectedTypeSlug}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select entry">{selectedEntryLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ENTRY_VALUE}>No entry selected</SelectItem>
              {entries.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.title}
                  {compact ? "" : ` (${entry.status})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTypeSlug && entries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No entries loaded yet for selected content type.
            </p>
          ) : null}
          {entryLoadError ? <p className="text-xs text-destructive">{entryLoadError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function EntryTeaserWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<EntryTeaserData>) {
  const normalized = normalizeValue(value);
  const sourceMode = normalized.sourceMode ?? "latest";
  const resolvedVariant = resolveEntryTeaserVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection title="Source mode" description="Choose where teaser content comes from.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Mode</p>
          <Select
            value={sourceMode}
            onValueChange={(next) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                sourceMode: next as EntryTeaserSourceMode,
                source: {
                  ...current.source,
                  entryId: next === "manual" ? current.source?.entryId ?? "" : "",
                },
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source mode" />
            </SelectTrigger>
            <SelectContent>
              {sourceModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SourcePickerFields
          value={value}
          onChange={onChange}
          sourceMode={sourceMode}
          compact
        />
      </EditorSection>

      <EditorSection title="Variant" description="Pick teaser card orientation.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Layout variant</p>
          <Select value={resolvedVariant} onValueChange={(next) => onVariantChange?.(next)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose variant" />
            </SelectTrigger>
            <SelectContent>
              {variantOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>
    </div>
  );
}

export function EntryTeaserVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<EntryTeaserData>) {
  const normalized = normalizeValue(value);
  const sourceMode = normalized.sourceMode ?? "latest";
  const resolvedVariant = resolveEntryTeaserVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection title="Variant and structure" description="Control teaser layout direction.">
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
      </EditorSection>

      <EditorSection title="Source configuration" description="Choose source mode and content.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Source mode</p>
          <Select
            value={sourceMode}
            onValueChange={(next) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                sourceMode: next as EntryTeaserSourceMode,
                source: {
                  ...current.source,
                  entryId: next === "manual" ? current.source?.entryId ?? "" : "",
                },
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source mode" />
            </SelectTrigger>
            <SelectContent>
              {sourceModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SourcePickerFields value={value} onChange={onChange} sourceMode={sourceMode} />
      </EditorSection>

      <EditorSection
        title="Teaser content fields"
        description="Toggle visible entry properties in teaser card."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show image</span>
            <Switch
              checked={normalized.fields?.showImage ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showImage: checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show excerpt</span>
            <Switch
              checked={normalized.fields?.showExcerpt ?? true}
              onCheckedChange={(checked) =>
                updateFields(value, onChange, { showExcerpt: checked })
              }
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show meta</span>
            <Switch
              checked={normalized.fields?.showMeta ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showMeta: checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <span className="text-sm">Show tags</span>
            <Switch
              checked={normalized.fields?.showTags ?? true}
              onCheckedChange={(checked) => updateFields(value, onChange, { showTags: checked })}
            />
          </label>
        </div>
      </EditorSection>

      <EditorSection title="CTA behavior" description="Configure teaser action link.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">CTA label</p>
            <Input
              value={normalized.cta?.label ?? "Read more"}
              onChange={(event) => updateCta(value, onChange, { label: event.target.value })}
              placeholder="Read more"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Href mode</p>
            <Select
              value={normalized.cta?.hrefMode ?? "auto"}
              onValueChange={(next) =>
                updateCta(value, onChange, { hrefMode: next as EntryTeaserCtaHrefMode })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select href mode" />
              </SelectTrigger>
              <SelectContent>
                {hrefModeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {(normalized.cta?.hrefMode ?? "auto") === "custom" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Custom URL</p>
            <Input
              value={normalized.cta?.href ?? ""}
              onChange={(event) => updateCta(value, onChange, { href: event.target.value })}
              placeholder="/blog/entry-slug or https://..."
            />
          </div>
        ) : null}
      </EditorSection>

      <EditorSection title="Empty state copy" description="Text for unresolved teaser source.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Fallback title</p>
          <Input
            value={normalized.fallback?.title ?? ""}
            onChange={(event) =>
              updateFallback(value, onChange, { title: event.target.value })
            }
            placeholder="No entry selected"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Fallback description</p>
          <Textarea
            value={normalized.fallback?.description ?? ""}
            onChange={(event) =>
              updateFallback(value, onChange, { description: event.target.value })
            }
            rows={3}
            placeholder="Choose a source mode and content type."
          />
        </div>
      </EditorSection>
    </div>
  );
}

export function EntryTeaserAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<EntryTeaserData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <EditorSection title="Style tokens" description="Direct style tokens for teaser surface.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Surface color</p>
            <Input
              value={normalized.style?.surface ?? ""}
              onChange={(event) => updateStyle(value, onChange, { surface: event.target.value })}
              placeholder="var(--color-bg)"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Border color</p>
            <Input
              value={normalized.style?.border ?? ""}
              onChange={(event) => updateStyle(value, onChange, { border: event.target.value })}
              placeholder="var(--color-border)"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Radius token</p>
            <Select
              value={normalized.style?.radius ?? "lg"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { radius: next as EntryTeaserRadius })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select radius" />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Spacing token</p>
            <Select
              value={normalized.style?.spacing ?? "md"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { spacing: next as EntryTeaserSpacing })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select spacing" />
              </SelectTrigger>
              <SelectContent>
                {spacingOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Fallback behavior"
        description="Technical fallback logic for featured source mode."
      >
        <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
          <span className="text-sm">Fallback to latest when featured is missing</span>
          <Switch
            checked={normalized.fallback?.fallbackToLatest ?? true}
            onCheckedChange={(checked) =>
              updateFallback(value, onChange, { fallbackToLatest: checked })
            }
          />
        </label>
      </EditorSection>

      <EditorSection
        title="Runtime payload snapshot"
        description="Read-only resolved payload from runtime preview/public rendering."
      >
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed">
          {JSON.stringify(normalized.resolved ?? { item: null }, null, 2)}
        </pre>
      </EditorSection>
    </div>
  );
}
