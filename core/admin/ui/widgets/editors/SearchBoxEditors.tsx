import { useMemo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
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

import {
  normalizeSearchBoxData,
  searchBoxDefaults,
  type SearchBoxDisplayMode,
  type SearchBoxData,
} from "../../../../widgets/core/searchBox";
import type { WidgetEditorProps, WidgetEditorSectionRole } from "../../../../widgets/types";
import { useListingQueries } from "../../listings/hooks/useListingQueries";
import { ClearableInputField } from "./ClearableFields";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const NO_LISTING_QUERY_VALUE = "__no_listing_query__";
const displayModeOptions: SearchBoxDisplayMode[] = ["full", "compact"];

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id: string;
  mode: "wizard" | "visual" | "advanced";
  role: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
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

function SearchMode({
  value,
  onChange,
}: {
  value: SearchBoxData;
  onChange: (next: SearchBoxData) => void;
}) {
  const normalized = normalizeSearchBoxData(value);
  const { items, isLoading, error, refresh } = useListingQueries({ retryAuthOnce: true });
  const mode = normalized.mode ?? "listing";
  const listingLoadState = isLoading
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
    <EditorSection
      id="search-box.wizard.source-setup"
      mode="wizard"
      role="source"
      title="Search source"
      description="Choose listing search, global public search, or route-submit setup."
    >
      <WidgetControlRow id="search-box.wizard.mode" label="Search mode" path="mode">
        {(fieldProps) => (
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
            <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="listing">Listing runtime search</SelectItem>
              <SelectItem value="global">Global public search</SelectItem>
              <SelectItem value="route-submit">Route submit search</SelectItem>
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>

      {mode === "listing" ? (
        <WidgetControlRow
          id="search-box.wizard.listing-query"
          label="Listing query"
          path="listingQueryId"
        >
          {(fieldProps) => (
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
                <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
                <p className="text-xs text-muted-foreground">
                  No listing queries are available yet.
                </p>
              ) : null}
              {listingLoadState === "error" && error ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-destructive">{error}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void refresh({ force: true, retryAuthOnce: true });
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </WidgetControlRow>
      ) : mode === "global" ? (
        <div className="space-y-3">
          <WidgetControlRow id="search-box.wizard.endpoint" label="Search endpoint" path="endpoint">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={normalized.endpoint ?? ""}
                onChange={(event) =>
                  updateValue(value, onChange, (current) => ({
                    ...current,
                    endpoint: event.target.value,
                  }))
                }
                placeholder="/api/search"
              />
            )}
          </WidgetControlRow>
          <p className="text-xs text-muted-foreground">
            Endpoint should return <code>{"{ items: [...] }"}</code>.
          </p>
          <div className="space-y-2 rounded-md border border-border/70 bg-background/60 p-3">
            <p className="text-sm font-medium">Global search sources</p>
            <WidgetControlRow
              id="search-box.wizard.sources-pages"
              label="Pages"
              path="sources.pages"
            >
              {() => (
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
              )}
            </WidgetControlRow>
            <WidgetControlRow
              id="search-box.wizard.sources-entries"
              label="Entries"
              path="sources.entries"
            >
              {() => (
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
              )}
            </WidgetControlRow>
            <WidgetControlRow
              id="search-box.wizard.sources-posts"
              label="Posts"
              path="sources.posts"
            >
              {() => (
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
              )}
            </WidgetControlRow>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <WidgetControlRow
            id="search-box.wizard.target-route"
            label="Target route"
            path="targetRoute"
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={normalized.targetRoute ?? "/search"}
                onChange={(event) =>
                  updateValue(value, onChange, (current) => ({
                    ...current,
                    targetRoute: event.target.value,
                  }))
                }
                placeholder="/search"
              />
            )}
          </WidgetControlRow>
          <WidgetControlRow
            id="search-box.wizard.query-param"
            label="Query param"
            path="queryParam"
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={normalized.queryParam ?? "q"}
                onChange={(event) =>
                  updateValue(value, onChange, (current) => ({
                    ...current,
                    queryParam: event.target.value,
                  }))
                }
                placeholder="q"
              />
            )}
          </WidgetControlRow>
        </div>
      )}
    </EditorSection>
  );
}

function SearchCopyEditor({
  value,
  onChange,
}: {
  value: SearchBoxData;
  onChange: (next: SearchBoxData) => void;
}) {
  const normalized = normalizeSearchBoxData(value);

  return (
    <EditorSection
      id="search-box.visual.search-copy"
      mode="visual"
      role="content"
      title="Search copy"
      description="Labels and helper text shown to visitors."
    >
      <WidgetControlRow id="search-box.visual.title" label="Title" path="title">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={normalized.title ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Search"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow id="search-box.visual.description" label="Description" path="description">
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
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
        )}
      </WidgetControlRow>
      <div className="grid gap-2 sm:grid-cols-2">
        <WidgetControlRow id="search-box.visual.placeholder" label="Placeholder" path="placeholder">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={normalized.placeholder ?? ""}
              onChange={(event) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  placeholder: event.target.value,
                }))
              }
              placeholder="Type to search..."
            />
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="search-box.visual.submit-label"
          label="Submit label"
          path="submitLabel"
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={normalized.submitLabel ?? ""}
              onChange={(event) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  submitLabel: event.target.value,
                }))
              }
              placeholder="Search"
            />
          )}
        </WidgetControlRow>
      </div>
    </EditorSection>
  );
}

function SearchInteractionEditor({
  value,
  onChange,
}: {
  value: SearchBoxData;
  onChange: (next: SearchBoxData) => void;
}) {
  const normalized = normalizeSearchBoxData(value);
  const mode = normalized.mode ?? "listing";

  return (
    <EditorSection
      id="search-box.visual.search-interaction"
      mode="visual"
      role="visual"
      title="Search interaction"
      description="Visible layout and visitor interaction behavior."
    >
      <WidgetControlRow id="search-box.visual.display-mode" label="Display mode" path="displayMode">
        {(fieldProps) => (
          <Select
            value={normalized.displayMode ?? "full"}
            onValueChange={(next) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                displayMode: next as SearchBoxDisplayMode,
              }))
            }
          >
            <SelectTrigger id={fieldProps.id} aria-labelledby={fieldProps["aria-labelledby"]}>
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
        )}
      </WidgetControlRow>
      {mode === "listing" ? (
        <WidgetControlRow
          id="search-box.visual.auto-apply"
          label="Auto apply on input"
          path="autoApply"
        >
          {() => (
            <Switch
              checked={normalized.autoApply !== false}
              onCheckedChange={(checked) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  autoApply: checked,
                }))
              }
            />
          )}
        </WidgetControlRow>
      ) : (
        <p className="text-xs text-muted-foreground">
          {mode === "global"
            ? "Global search runs against the setup sources selected in Wizard."
            : "Route-submit mode forwards the query to a public page route using the configured parameter name."}
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
    <EditorSection
      id="search-box.advanced.runtime-payload"
      mode="advanced"
      role="diagnostics"
      title="Runtime payload"
      description="Read-only runtime data from SSR."
    >
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
    <EditorSection
      id="search-box.visual.search-surface"
      mode="visual"
      role="visual"
      title="Search surface"
      description="Decorative search shell and action color."
    >
      <WidgetControlRow
        id="search-box.visual.frame-background"
        label="Frame background"
        path="style.frameBackground"
      >
        {() => (
          <ClearableInputField
            label="Frame background"
            value={normalized.style?.frameBackground}
            onChange={(next) => updateStyle(value, onChange, { frameBackground: next })}
            onClear={() => clearStyle(value, onChange, "frameBackground")}
            placeholder="var(--color-bg)"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="search-box.visual.frame-border"
        label="Frame border"
        path="style.frameBorderColor"
      >
        {() => (
          <ClearableInputField
            label="Frame border"
            value={normalized.style?.frameBorderColor}
            onChange={(next) => updateStyle(value, onChange, { frameBorderColor: next })}
            onClear={() => clearStyle(value, onChange, "frameBorderColor")}
            placeholder="var(--color-border)"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="search-box.visual.action-background"
        label="Action background"
        path="style.actionBackground"
      >
        {() => (
          <ClearableInputField
            label="Action background"
            value={normalized.style?.actionBackground}
            onChange={(next) => updateStyle(value, onChange, { actionBackground: next })}
            onClear={() => clearStyle(value, onChange, "actionBackground")}
            placeholder="var(--color-primary)"
          />
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

export function SearchBoxWizardEditor({ value, onChange }: WidgetEditorProps<SearchBoxData>) {
  return <SearchMode value={value} onChange={onChange} />;
}

export function SearchBoxVisualEditor({ value, onChange }: WidgetEditorProps<SearchBoxData>) {
  return (
    <>
      <SearchCopyEditor value={value} onChange={onChange} />
      <SearchInteractionEditor value={value} onChange={onChange} />
      <SurfaceEditor value={value} onChange={onChange} />
    </>
  );
}

export function SearchBoxAdvancedEditor({ value }: WidgetEditorProps<SearchBoxData>) {
  const normalized = normalizeSearchBoxData(value);

  return (
    <>
      <EditorSection
        id="search-box.advanced.runtime-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Runtime diagnostics"
        description="Read-only source and routing state."
      >
        <ReadonlyWidgetSummaryRow
          id="search-box.advanced.mode"
          label="Mode"
          path="mode"
          value={normalized.mode}
        />
        <ReadonlyWidgetSummaryRow
          id="search-box.advanced.listing-query"
          label="Listing query"
          path="listingQueryId"
          value={normalized.listingQueryId || "Not selected"}
        />
        <ReadonlyWidgetSummaryRow
          id="search-box.advanced.endpoint"
          label="Endpoint"
          path="endpoint"
          value={normalized.endpoint || "Not configured"}
        />
        <ReadonlyWidgetSummaryRow
          id="search-box.advanced.route-target"
          label="Route target"
          path="targetRoute"
          value={normalized.targetRoute || "Not configured"}
        />
        <ReadonlyWidgetSummaryRow
          id="search-box.advanced.query-param"
          label="Query parameter"
          path="queryParam"
          value={normalized.queryParam || "q"}
        />
      </EditorSection>
      <RuntimeSnapshot value={value} />
      <EditorSection
        id="search-box.advanced.contract-summary"
        mode="advanced"
        role="summary"
        title="Contract summary"
        description="Listing mode uses lq.<queryId>.__q, global mode keeps /api/search, and route-submit forwards q-like params to a public page route."
      >
        <p className="text-xs text-muted-foreground">
          Defaults come from <code>searchBoxDefaults</code>.
        </p>
      </EditorSection>
    </>
  );
}

export const searchBoxEditorDefaults = searchBoxDefaults;
