import { useEffect, useMemo, useState, type ReactNode } from "react";

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
import { isApiClientError } from "@/services/apiClient";
import { listListingQueriesCached, type ListingQueryRecord } from "@/services/listingsClient";

import {
  normalizeSearchBoxData,
  searchBoxDefaults,
  type SearchBoxDisplayMode,
  type SearchBoxData,
} from "../../../../widgets/core/searchBox";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableInputField } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

const NO_LISTING_QUERY_VALUE = "__no_listing_query__";
const displayModeOptions: SearchBoxDisplayMode[] = ["full", "compact"];

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function updateValue(
  value: SearchBoxData,
  onChange: (next: SearchBoxData) => void,
  updater: (current: SearchBoxData) => SearchBoxData
) {
  const current = normalizeSearchBoxData(value);
  const next = updater(current);
  onChange(normalizeSearchBoxData(next));
}

function updateStyle(
  value: SearchBoxData,
  onChange: (next: SearchBoxData) => void,
  patch: Partial<NonNullable<SearchBoxData["style"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function clearStyle(
  value: SearchBoxData,
  onChange: (next: SearchBoxData) => void,
  key: keyof NonNullable<SearchBoxData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

function useListingQueries() {
  const [items, setItems] = useState<ListingQueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listListingQueriesCached({ force: true })
      .then((next) => {
        if (!active) return;
        setItems(next);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load listing queries.");
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { items, loading, error };
}

function SearchMode({
  value,
  onChange,
}: {
  value: SearchBoxData;
  onChange: (next: SearchBoxData) => void;
}) {
  const normalized = normalizeSearchBoxData(value);
  const { items, loading, error } = useListingQueries();
  const mode = normalized.mode ?? "listing";
  const listingLoadState = loading
    ? "loading"
    : error
      ? "error"
      : items.length === 0
        ? "empty"
        : "ready";
  const selectedListingQuery = normalized.listingQueryId || NO_LISTING_QUERY_VALUE;
  const selectedLabel =
    selectedListingQuery === NO_LISTING_QUERY_VALUE
      ? "No listing query selected"
      : (items.find((item) => item.id === selectedListingQuery)?.name ?? "Selected listing query");

  return (
    <EditorSection title="Mode" description="Choose listing search or global public search.">
      <Select
        value={mode}
        onValueChange={(nextMode) => {
          updateValue(value, onChange, (current) => ({
            ...current,
            mode:
              nextMode === "global"
                ? "global"
                : nextMode === "route-submit"
                  ? "route-submit"
                  : "listing",
          }));
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="listing">Listing runtime search</SelectItem>
          <SelectItem value="global">Global public search</SelectItem>
          <SelectItem value="route-submit">Route submit search</SelectItem>
        </SelectContent>
      </Select>

      {mode === "listing" ? (
        <div className="space-y-2">
          <Select
            value={selectedListingQuery}
            onValueChange={(next) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                listingQueryId: next === NO_LISTING_QUERY_VALUE ? "" : next,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select listing query">{selectedLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LISTING_QUERY_VALUE}>No listing query selected</SelectItem>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {listingLoadState === "loading" ? (
            <p className="text-xs text-muted-foreground">Loading listing queries...</p>
          ) : null}
          {listingLoadState === "empty" ? (
            <p className="text-xs text-muted-foreground">No listing queries are available yet.</p>
          ) : null}
          {listingLoadState === "error" && error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
        </div>
      ) : mode === "global" ? (
        <div className="space-y-2">
          <Input
            value={normalized.endpoint ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                endpoint: event.target.value,
              }))
            }
            placeholder="/api/search"
          />
          <p className="text-xs text-muted-foreground">
            Endpoint should return <code>{"{ items: [...] }"}</code>.
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={normalized.targetRoute ?? "/search"}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                targetRoute: event.target.value,
              }))
            }
            placeholder="/search"
          />
          <Input
            value={normalized.queryParam ?? "q"}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                queryParam: event.target.value,
              }))
            }
            placeholder="q"
          />
        </div>
      )}
    </EditorSection>
  );
}

function CopyAndBehavior({
  value,
  onChange,
}: {
  value: SearchBoxData;
  onChange: (next: SearchBoxData) => void;
}) {
  const normalized = normalizeSearchBoxData(value);
  const mode = normalized.mode ?? "listing";

  return (
    <EditorSection title="Copy and behavior" description="Labels and interaction controls.">
      <Input
        value={normalized.title ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            title: event.target.value,
          }))
        }
        placeholder="Search"
      />
      <Textarea
        value={normalized.description ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            description: event.target.value,
          }))
        }
        rows={2}
        placeholder="Optional helper text."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={normalized.placeholder ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              placeholder: event.target.value,
            }))
          }
          placeholder="Type to search..."
        />
        <Input
          value={normalized.submitLabel ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              submitLabel: event.target.value,
            }))
          }
          placeholder="Search"
        />
        <Select
          value={normalized.displayMode ?? "full"}
          onValueChange={(next) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              displayMode: next as SearchBoxDisplayMode,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Display mode" />
          </SelectTrigger>
          <SelectContent>
            {displayModeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {mode === "listing" ? (
        <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
          <span>Auto apply on input</span>
          <Switch
            checked={normalized.autoApply !== false}
            onCheckedChange={(checked) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                autoApply: checked,
              }))
            }
          />
        </label>
      ) : mode === "global" ? (
        <div className="space-y-2 rounded-md border border-border/70 bg-background/60 p-3">
          <p className="text-sm font-medium">Global search sources</p>
          <label className="flex items-center justify-between text-sm">
            <span>Pages</span>
            <Switch
              checked={normalized.sources?.pages !== false}
              onCheckedChange={(checked) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  sources: {
                    ...current.sources,
                    pages: checked,
                  },
                }))
              }
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Entries</span>
            <Switch
              checked={normalized.sources?.entries !== false}
              onCheckedChange={(checked) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  sources: {
                    ...current.sources,
                    entries: checked,
                  },
                }))
              }
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Posts</span>
            <Switch
              checked={normalized.sources?.posts === true}
              onCheckedChange={(checked) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  sources: {
                    ...current.sources,
                    posts: checked,
                  },
                }))
              }
            />
          </label>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Route-submit mode forwards the query to a public page route using the configured parameter
          name.
        </p>
      )}
    </EditorSection>
  );
}

function RuntimeSnapshot({ value }: { value: SearchBoxData }) {
  const normalized = normalizeSearchBoxData(value);
  const snapshot = useMemo(
    () =>
      JSON.stringify(
        {
          resolved: normalized.resolved,
        },
        null,
        2
      ),
    [normalized]
  );

  return (
    <EditorSection title="Runtime payload" description="Read-only runtime data from SSR.">
      <Textarea value={snapshot} readOnly rows={8} className="font-mono text-xs" />
    </EditorSection>
  );
}

function SurfaceEditor({
  value,
  onChange,
}: {
  value: SearchBoxData;
  onChange: (next: SearchBoxData) => void;
}) {
  const normalized = normalizeSearchBoxData(value);

  return (
    <EditorSection title="Surface" description="Decorative search shell and action color.">
      <ClearableInputField
        label="Frame background"
        value={normalized.style?.frameBackground}
        onChange={(next) => updateStyle(value, onChange, { frameBackground: next })}
        onClear={() => clearStyle(value, onChange, "frameBackground")}
        placeholder="var(--color-bg)"
      />
      <ClearableInputField
        label="Frame border"
        value={normalized.style?.frameBorderColor}
        onChange={(next) => updateStyle(value, onChange, { frameBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "frameBorderColor")}
        placeholder="var(--color-border)"
      />
      <ClearableInputField
        label="Action background"
        value={normalized.style?.actionBackground}
        onChange={(next) => updateStyle(value, onChange, { actionBackground: next })}
        onClear={() => clearStyle(value, onChange, "actionBackground")}
        placeholder="var(--color-primary)"
      />
    </EditorSection>
  );
}

export function SearchBoxWizardEditor({ value, onChange }: WidgetEditorProps<SearchBoxData>) {
  return (
    <div className="space-y-3">
      <SearchMode value={value} onChange={onChange} />
      <CopyAndBehavior value={value} onChange={onChange} />
      <SurfaceEditor value={value} onChange={onChange} />
    </div>
  );
}

export function SearchBoxVisualEditor({ value, onChange }: WidgetEditorProps<SearchBoxData>) {
  return (
    <div className="space-y-3">
      <SearchMode value={value} onChange={onChange} />
      <CopyAndBehavior value={value} onChange={onChange} />
      <SurfaceEditor value={value} onChange={onChange} />
    </div>
  );
}

export function SearchBoxAdvancedEditor({ value, onChange }: WidgetEditorProps<SearchBoxData>) {
  return (
    <div className="space-y-3">
      <CopyAndBehavior value={value} onChange={onChange} />
      <RuntimeSnapshot value={value} />
      <EditorSection
        title="Contract"
        description="Listing mode uses lq.<queryId>.__q, global mode keeps /api/search, and route-submit forwards q-like params to a public page route."
      >
        <p className="text-xs text-muted-foreground">
          Defaults come from <code>searchBoxDefaults</code>.
        </p>
      </EditorSection>
    </div>
  );
}

export const searchBoxEditorDefaults = searchBoxDefaults;
