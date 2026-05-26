import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listPagesCached, type PageSummary } from "@/services/pagesClient";

const EMPTY_DESTINATION_VALUE = "__coderso_link_empty__";
const CUSTOM_DESTINATION_VALUE = "__coderso_link_custom__";
const NO_PAGES_VALUE = "__coderso_link_no_pages__";

type LinkDestinationFieldProps = {
  fieldId: string;
  label: string;
  value?: string;
  onChange: (next: string) => void;
  controlPath?: string;
  disabled?: boolean;
  emptyLabel?: string;
  helpText?: string;
  feedback?: string | null;
  feedbackTone?: "destructive" | "warning";
};

function normalizeComparableHref(value: string) {
  const trimmed = value.trim();
  if (trimmed === "/") return "/";
  return trimmed.replace(/\/+$/g, "") || "";
}

export function resolvePageDestinationHref(page: Pick<PageSummary, "slug">) {
  const slug = page.slug.trim().replace(/^\/+|\/+$/g, "");
  return slug ? `/${slug}` : "/";
}

function findPageForHref(pages: PageSummary[], value: string) {
  const normalizedValue = normalizeComparableHref(value);
  if (!normalizedValue) return null;
  return (
    pages.find(
      (page) => normalizeComparableHref(resolvePageDestinationHref(page)) === normalizedValue
    ) ?? null
  );
}

export function LinkDestinationField({
  fieldId,
  label,
  value,
  onChange,
  controlPath,
  disabled = false,
  emptyLabel = "No destination",
  helpText = "Choose an existing site page. Custom destinations stay read-only in Wizard and Visual modes.",
  feedback,
  feedbackTone = "warning",
}: LinkDestinationFieldProps) {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loadError, setLoadError] = useState(false);
  const trimmedValue = value?.trim() ?? "";
  const selectedPage = findPageForHref(pages, trimmedValue);
  const selectedValue =
    selectedPage?.id ?? (trimmedValue ? CUSTOM_DESTINATION_VALUE : EMPTY_DESTINATION_VALUE);

  useEffect(() => {
    let cancelled = false;

    listPagesCached()
      .then((nextPages) => {
        if (cancelled) return;
        setPages(nextPages.filter((page) => page.status === "published"));
        setLoadError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectionChange = (next: string) => {
    if (next === EMPTY_DESTINATION_VALUE) {
      onChange("");
      return;
    }
    if (next === CUSTOM_DESTINATION_VALUE || next === NO_PAGES_VALUE) return;
    const page = pages.find((candidate) => candidate.id === next);
    if (!page) return;
    onChange(resolvePageDestinationHref(page));
  };

  return (
    <div
      className="space-y-2"
      data-link-destination-field={fieldId}
      data-widget-control={fieldId}
      data-widget-control-path={controlPath}
      data-widget-control-ownership={controlPath ? "writable" : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {trimmedValue ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange("")}
          >
            Clear destination
          </Button>
        ) : null}
      </div>

      <Select value={selectedValue} disabled={disabled} onValueChange={handleSelectionChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choose page" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_DESTINATION_VALUE}>{emptyLabel}</SelectItem>
          {pages.length === 0 ? (
            <SelectItem value={NO_PAGES_VALUE} disabled>
              No pages available
            </SelectItem>
          ) : null}
          {pages.map((page) => (
            <SelectItem key={page.id} value={page.id}>
              {page.title}
            </SelectItem>
          ))}
          {trimmedValue && !selectedPage ? (
            <SelectItem value={CUSTOM_DESTINATION_VALUE} disabled>
              Saved custom destination
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>

      {selectedPage ? (
        <p className="text-xs text-muted-foreground">
          Links to selected site page: {selectedPage.title}.
        </p>
      ) : trimmedValue ? (
        <p className="text-xs text-muted-foreground">
          A custom destination is already configured. Choose a site page to replace it or clear the
          destination.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
      {loadError ? (
        <p className="text-xs text-amber-700">
          Pages could not be loaded. Existing destinations stay unchanged.
        </p>
      ) : null}
      {feedback ? (
        <p
          className={
            feedbackTone === "destructive" ? "text-xs text-destructive" : "text-xs text-amber-700"
          }
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
