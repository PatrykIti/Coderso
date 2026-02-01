import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
};

function RelationSelect({
  targetSlug,
  targetName,
  value,
  onChange,
}: RelationSelectProps) {
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
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

  const selectedValue = value ? String(value) : "";
  const helperLabel = targetName ? targetName : "related content";

  return (
    <div className="space-y-2">
      <Select
        value={selectedValue}
        onValueChange={(next) => onChange(next)}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={`Select ${helperLabel}`} />
        </SelectTrigger>
        <SelectContent>
          {entries.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No items found yet.
            </div>
          ) : (
            entries.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.title}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Pick a {helperLabel} item to link here.
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

  switch (field.type) {
    case "text":
      return (
        <Input
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      );
    case "richtext":
      return (
        <Textarea
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          rows={10}
          className="min-h-[240px] resize-none bg-muted/30"
          placeholder="Start writing..."
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={value !== null && value !== undefined ? String(value) : ""}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next === "" ? null : Number(next));
          }}
        />
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {field.label}
        </label>
      );
    case "select":
      return (
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
      );
    case "media":
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="sm">
              Select media
            </Button>
            <Badge variant="outline" className="text-xs">
              {value ? "1 asset selected" : "No asset selected"}
            </Badge>
          </div>
          <div className="flex h-44 items-center justify-center rounded-xl border border-dashed bg-muted/30">
            <div className="text-center">
              <p className="text-xs font-medium">Drop a file or browse</p>
              <p className="text-[11px] text-muted-foreground">
                Recommended size 1600x900
              </p>
            </div>
          </div>
        </div>
      );
    case "relation":
      if (relationTarget) {
        return (
          <RelationSelect
            targetSlug={relationTarget}
            targetName={relationLabel}
            value={value}
            onChange={onChange}
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
