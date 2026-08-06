import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EntryData, EntryDataValue } from "@/services/entriesClient";

import { FieldRenderer } from "./FieldRenderer";
import type { EntryFieldSection } from "./entryFieldGroups";
import type { EntryRelationTarget } from "./useEntryRelationTargets";

/**
 * Renders the authored sections of ONE field group: the optional section heading, the
 * 12-column width/display layout from `field.layout`, the required badge and the
 * missing-required-field callout around each `FieldRenderer`. Purely presentational —
 * every value and every change comes from `EntryEditor`, which mounts this once for
 * the Content card and once per additional group.
 */
type EntryFieldSectionsProps = {
  sections: EntryFieldSection[];
  values: EntryData;
  relationTargets: EntryRelationTarget[];
  missingRequiredNames: ReadonlySet<string>;
  onFieldChange: (name: string, value: EntryDataValue) => void;
};

export function EntryFieldSections({
  sections,
  values,
  relationTargets,
  missingRequiredNames,
  onFieldChange,
}: EntryFieldSectionsProps) {
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section, index) => (
        <div key={`${section.label ?? "default"}-${index}`} className="space-y-4">
          {section.label ? (
            <div className="flex items-center gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h4>
              <div className="h-px flex-1 bg-border" />
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-12">
            {section.fields.map((field) => {
              const width = field.layout?.width ?? "full";
              const colSpan = width === "half" ? "md:col-span-6" : "md:col-span-12";
              const isCompact = field.layout?.display === "compact";
              const isMissing = missingRequiredNames.has(field.name);
              return (
                <div
                  key={field.id}
                  className={cn(
                    colSpan,
                    "flex flex-col gap-1.5 rounded-xl border p-4",
                    isMissing ? "border-destructive/40 bg-destructive/5" : "border-border",
                    isCompact ? "border-dashed" : null
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{field.label}</p>
                    {field.required ? (
                      <Badge
                        variant="outline"
                        className={
                          isMissing
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : undefined
                        }
                      >
                        Required
                      </Badge>
                    ) : null}
                  </div>
                  {field.help ? (
                    <p className="text-xs text-muted-foreground">{field.help}</p>
                  ) : null}
                  {isMissing ? (
                    <p className="text-xs font-semibold text-destructive">
                      Required field missing.
                    </p>
                  ) : null}
                  <FieldRenderer
                    field={field}
                    value={values[field.name]}
                    onChange={(value) => onFieldChange(field.name, value)}
                    relationTargets={relationTargets}
                    display={field.layout?.display}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
