import { useEffect, useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import { listEntries, type EntrySummary } from "@/services/entriesClient";
import { MediaPicker } from "@/ui/media/MediaPicker";

import type { ContentField } from "../content-types/SchemaBuilder";

type FieldRendererProps = {
  field: ContentField;
  value: unknown;
  onChange: (value: unknown) => void;
  relationTargets?: Array<{ slug: string; name: string }>;
};

type RelationSelectProps = {
  targetSlug: string;
  targetName?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  multiple?: boolean;
  helpText?: string;
};

function RelationSelect({
  targetSlug,
  targetName,
  value,
  onChange,
  multiple = false,
  helpText,
}: RelationSelectProps) {
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    listEntries(targetSlug)
      .then((result) => {
        if (!active) return;
        setEntries(result);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load related items.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [targetSlug]);

  const selectedValues = Array.isArray(value)
    ? value.map(String)
    : value
      ? [String(value)]
      : [];
  const helperLabel = targetName ? targetName : "related content";
  const filteredEntries = entries.filter((entry) => {
    if (!query) return true;
    const normalized = query.toLowerCase();
    return (
      entry.title.toLowerCase().includes(normalized) ||
      entry.slug.toLowerCase().includes(normalized)
    );
  });
  const handleToggle = (entryId: string) => {
    if (multiple) {
      const next = selectedValues.includes(entryId)
        ? selectedValues.filter((id) => id !== entryId)
        : [...selectedValues, entryId];
      onChange(next);
      return;
    }
    onChange(entryId);
  };

  const fallbackHelp = multiple
    ? `Pick one or more ${helperLabel} items to link here.`
    : `Pick a ${helperLabel} item to link here.`;

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${helperLabel}...`}
        disabled={isLoading}
      />
      <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-2">
        {entries.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No items found yet.
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No matches for <span className="font-medium">{query}</span>.
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = selectedValues.includes(entry.id);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleToggle(entry.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent bg-muted/30 text-foreground hover:bg-muted/50"
                }`}
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">/{entry.slug}</p>
                </div>
                {multiple ? (
                  <Checkbox checked={isSelected} aria-label="Select relation" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {helpText ?? fallbackHelp}
        </p>
      )}
    </div>
  );
}

export function FieldRenderer({
  field,
  value,
  onChange,
  relationTargets = [],
}: FieldRendererProps) {
  const relationTarget = field.relation?.target ?? "";
  const relationLabel = useMemo(() => {
    if (!relationTarget) return undefined;
    const match = relationTargets.find((target) => target.slug === relationTarget);
    return match?.name ?? relationTarget;
  }, [relationTarget, relationTargets]);

  const customHelp = field.help?.trim();
  const defaultHelp = {
    text: "Short text value for titles or labels.",
    richtext: "Long-form content with formatting.",
    number: "Numeric value (use for ordering or stats).",
    boolean: "Toggle on/off.",
    select: "Choose one option from the list.",
    media: "Pick media from the library.",
    relation: "Link this entry to related content.",
  } as const;

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-2">
          <Input
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
          <p className="text-xs text-muted-foreground">
            {customHelp || defaultHelp.text}
          </p>
        </div>
      );
    case "richtext":
      return (
        <div className="space-y-2">
          <Textarea
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
            rows={10}
            className="min-h-[240px] resize-none bg-muted/30"
            placeholder="Start writing..."
          />
          <p className="text-xs text-muted-foreground">
            {customHelp || defaultHelp.richtext}
          </p>
        </div>
      );
    case "number":
      return (
        <div className="space-y-2">
          <Input
            type="number"
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(event) => {
              const next = event.target.value;
              onChange(next === "" ? null : Number(next));
            }}
          />
          <p className="text-xs text-muted-foreground">
            {customHelp || defaultHelp.number}
          </p>
        </div>
      );
    case "boolean":
      return (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            {field.label}
          </label>
          <p className="text-xs text-muted-foreground">
            {customHelp || defaultHelp.boolean}
          </p>
        </div>
      );
    case "select":
      return (
        <div className="space-y-2">
          <Select
            value={value ? String(value) : undefined}
            onValueChange={(next) => onChange(next)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {customHelp || defaultHelp.select}
          </p>
        </div>
      );
    case "media":
      {
        const mediaHint = (() => {
          if (customHelp) return customHelp;
          if (field.media?.multiple) {
            return field.media.maxItems
              ? `Select up to ${field.media.maxItems} assets from the library.`
              : "Select one or more assets from the library.";
          }
          return defaultHelp.media;
        })();

      return (
        <div className="space-y-2">
          <MediaPicker
            value={value}
            onChange={onChange}
            multiple={field.media?.multiple}
            accept={field.media?.accept}
            maxItems={field.media?.maxItems}
          />
          <p className="text-xs text-muted-foreground">{mediaHint}</p>
        </div>
      );
      }
    case "relation":
      if (relationTarget) {
        return (
          <RelationSelect
            key={relationTarget}
            targetSlug={relationTarget}
            targetName={relationLabel}
            value={value}
            onChange={onChange}
            multiple={field.relation?.multiple}
            helpText={customHelp || defaultHelp.relation}
          />
        );
      }
      return (
        <div className="space-y-2">
          <Input
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Add a relation target in the content type first"
          />
          <p className="text-xs text-muted-foreground">
            Choose a related content type in the Content Type editor to enable picker.
          </p>
        </div>
      );
    default:
      return null;
  }
}
