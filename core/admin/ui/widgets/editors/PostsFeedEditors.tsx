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
import { listPostsCached, type PostSummary } from "@/services/postsClient";

import {
  normalizePostsFeedData,
  postsFeedDefaults,
  type PostsFeedData,
  type PostsFeedSourceMode,
} from "../../../../widgets/core/postsFeed";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableInputField } from "./ClearableFields";
import { WidgetEditorSection } from "./WidgetEditorControls";

type EditorMode = "wizard" | "visual" | "advanced";

const sourceModeOptions: Array<{ id: PostsFeedSourceMode; label: string; hint: string }> = [
  {
    id: "latest",
    label: "Latest posts",
    hint: "Newest published posts (or all statuses in preview).",
  },
  {
    id: "featured",
    label: "Featured posts",
    hint: "Posts tagged as featured or with featured flag.",
  },
  {
    id: "category",
    label: "Category/tag filter",
    hint: "Match posts by tag/category keyword.",
  },
  {
    id: "manual",
    label: "Manual selection",
    hint: "Pick exact posts to display in chosen order.",
  },
];

const sortOptions = [
  { id: "published-desc", label: "Newest published first" },
  { id: "published-asc", label: "Oldest published first" },
  { id: "updated-desc", label: "Recently updated first" },
  { id: "updated-asc", label: "Oldest update first" },
  { id: "title-asc", label: "Title A-Z" },
  { id: "title-desc", label: "Title Z-A" },
] as const;

const variantOptions = [
  { id: "cards", label: "Cards" },
  { id: "list", label: "List" },
  { id: "compact", label: "Compact" },
] as const;

const columnsOptions = [
  { id: "1", label: "1 column" },
  { id: "2", label: "2 columns" },
  { id: "3", label: "3 columns" },
] as const;

const gapOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
] as const;

const cardStyleOptions = [
  { id: "outlined", label: "Outlined" },
  { id: "elevated", label: "Elevated" },
  { id: "minimal", label: "Minimal" },
] as const;

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
  value: PostsFeedData,
  onChange: (next: PostsFeedData) => void,
  updater: (current: PostsFeedData) => PostsFeedData
) {
  const current = normalizePostsFeedData(value);
  const next = updater(current);
  onChange(normalizePostsFeedData(next));
}

function updateStyle(
  value: PostsFeedData,
  onChange: (next: PostsFeedData) => void,
  patch: Partial<NonNullable<PostsFeedData["style"]>>
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
  value: PostsFeedData,
  onChange: (next: PostsFeedData) => void,
  key: keyof NonNullable<PostsFeedData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...nextStyle } = current.style ?? {};
    return {
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    };
  });
}

function usePostOptions() {
  const [items, setItems] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    listPostsCached({ force: true })
      .then((next) => {
        if (!active) return;
        setItems(next);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load posts.");
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

  return {
    items,
    loading,
    error,
  };
}

function SourceSetup({
  value,
  onChange,
}: {
  value: PostsFeedData;
  onChange: (next: PostsFeedData) => void;
}) {
  const normalized = normalizePostsFeedData(value);
  const mode = normalized.source?.mode ?? "latest";
  const { items: posts, loading, error } = usePostOptions();
  const selectedManualIds = normalized.source?.manualPostIds ?? [];

  const postsById = useMemo(() => new Map(posts.map((item) => [item.id, item])), [posts]);

  const selectedPosts = selectedManualIds
    .map((id) => postsById.get(id))
    .filter((item): item is PostSummary => Boolean(item));

  return (
    <EditorSection
      title="Source setup"
      description="Choose how posts are selected for this widget."
    >
      <Select
        value={mode}
        onValueChange={(next) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            source: {
              ...current.source,
              mode: sourceModeOptions.some((item) => item.id === next)
                ? (next as PostsFeedSourceMode)
                : "latest",
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
      <p className="text-xs text-muted-foreground">
        {sourceModeOptions.find((item) => item.id === mode)?.hint}
      </p>

      {mode === "category" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Category/tag filter</p>
          <Input
            value={normalized.source?.category ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                source: {
                  ...current.source,
                  category: event.target.value,
                },
              }))
            }
            placeholder="e.g. news, updates, automotive"
          />
        </div>
      ) : null}

      {mode === "manual" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Manual posts</p>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border/70 bg-background/60 p-2">
            {posts.map((post) => {
              const checked = selectedManualIds.includes(post.id);
              return (
                <label
                  key={post.id}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 px-2 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      updateValue(value, onChange, (current) => {
                        const currentIds = current.source?.manualPostIds ?? [];
                        const nextIds = checked
                          ? currentIds.filter((id) => id !== post.id)
                          : [...currentIds, post.id];
                        return {
                          ...current,
                          source: {
                            ...current.source,
                            manualPostIds: nextIds,
                          },
                        };
                      });
                    }}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{post.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      /{post.slug}
                    </span>
                  </span>
                </label>
              );
            })}
            {!loading && posts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No posts available.</p>
            ) : null}
          </div>
          {selectedPosts.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedPosts.map((item) => item.title).join(", ")}
            </p>
          ) : null}
          {loading ? <p className="text-xs text-muted-foreground">Loading posts...</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Limit</p>
          <Input
            type="number"
            min={1}
            max={24}
            value={String(normalized.source?.limit ?? postsFeedDefaults.source?.limit ?? 6)}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              updateValue(value, onChange, (current) => ({
                ...current,
                source: {
                  ...current.source,
                  limit: Number.isFinite(parsed) ? parsed : (postsFeedDefaults.source?.limit ?? 6),
                },
              }));
            }}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Sort</p>
          <Select
            value={normalized.source?.sort ?? "published-desc"}
            onValueChange={(next) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                source: {
                  ...current.source,
                  sort: sortOptions.some((item) => item.id === next)
                    ? (next as (typeof sortOptions)[number]["id"])
                    : "published-desc",
                },
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sort" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </EditorSection>
  );
}

function DisplayOptions({
  value,
  onChange,
}: {
  value: PostsFeedData;
  onChange: (next: PostsFeedData) => void;
}) {
  const normalized = normalizePostsFeedData(value);
  const fields = normalized.fields ?? postsFeedDefaults.fields!;

  const renderToggle = (
    label: string,
    checked: boolean,
    key: "showExcerpt" | "showAuthor" | "showDate" | "showCta"
  ) => (
    <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={(next) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            fields: {
              ...current.fields,
              [key]: next,
            },
          }))
        }
      />
    </label>
  );

  return (
    <EditorSection title="Display" description="Toggle visible post metadata and actions.">
      {renderToggle("Show excerpt", Boolean(fields.showExcerpt), "showExcerpt")}
      {renderToggle("Show author", Boolean(fields.showAuthor), "showAuthor")}
      {renderToggle("Show publish date", Boolean(fields.showDate), "showDate")}
      {renderToggle("Show CTA link", Boolean(fields.showCta), "showCta")}
    </EditorSection>
  );
}

function LayoutOptions({
  value,
  variant,
  onChange,
  onVariantChange,
}: {
  value: PostsFeedData;
  variant: string;
  onChange: (next: PostsFeedData) => void;
  onVariantChange?: (next: string) => void;
}) {
  const normalized = normalizePostsFeedData(value);
  const resolvedVariant = variantOptions.some((item) => item.id === variant) ? variant : "cards";
  const supportsColumns = resolvedVariant === "cards";

  return (
    <EditorSection title="Layout and style" description="Card density and basic style tokens.">
      <div className="space-y-2">
        <p className="text-sm font-medium">Variant</p>
        <Select
          value={variantOptions.some((item) => item.id === variant) ? variant : "cards"}
          onValueChange={(next) => onVariantChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select variant" />
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

      <div className="grid gap-2 sm:grid-cols-2">
        {supportsColumns ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Columns</p>
            <Select
              value={normalized.style?.columns ?? "3"}
              onValueChange={(next) =>
                updateValue(value, onChange, (current) => ({
                  ...current,
                  style: {
                    ...current.style,
                    columns: columnsOptions.some((item) => item.id === next)
                      ? (next as (typeof columnsOptions)[number]["id"])
                      : "3",
                  },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select columns" />
              </SelectTrigger>
              <SelectContent>
                {columnsOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Columns</p>
            <div className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
              Columns only affect the cards variant.
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Gap</p>
          <Select
            value={normalized.style?.gap ?? "md"}
            onValueChange={(next) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                style: {
                  ...current.style,
                  gap: gapOptions.some((item) => item.id === next)
                    ? (next as (typeof gapOptions)[number]["id"])
                    : "md",
                },
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gap" />
            </SelectTrigger>
            <SelectContent>
              {gapOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Card style</p>
        <Select
          value={normalized.style?.cardStyle ?? "outlined"}
          onValueChange={(next) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              style: {
                ...current.style,
                cardStyle: cardStyleOptions.some((item) => item.id === next)
                  ? (next as (typeof cardStyleOptions)[number]["id"])
                  : "outlined",
              },
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select card style" />
          </SelectTrigger>
          <SelectContent>
            {cardStyleOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">CTA label</p>
        <Input
          value={normalized.style?.ctaLabel ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              style: {
                ...current.style,
                ctaLabel: event.target.value,
              },
            }))
          }
          placeholder="Read more"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ClearableInputField
          label="Card background"
          value={normalized.style?.backgroundColor}
          onChange={(next) => updateStyle(value, onChange, { backgroundColor: next })}
          onClear={() => clearStyle(value, onChange, "backgroundColor")}
          placeholder="var(--color-bg)"
        />
        <ClearableInputField
          label="Card border"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          onClear={() => clearStyle(value, onChange, "borderColor")}
          placeholder="var(--color-border)"
        />
      </div>
    </EditorSection>
  );
}

function EmptyStateOptions({
  value,
  onChange,
}: {
  value: PostsFeedData;
  onChange: (next: PostsFeedData) => void;
}) {
  const normalized = normalizePostsFeedData(value);

  return (
    <EditorSection title="Empty state" description="Message shown when no posts match source.">
      <Input
        value={normalized.emptyState?.title ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            emptyState: {
              ...current.emptyState,
              title: event.target.value,
            },
          }))
        }
        placeholder="No posts found"
      />
      <Textarea
        value={normalized.emptyState?.description ?? ""}
        onChange={(event) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            emptyState: {
              ...current.emptyState,
              description: event.target.value,
            },
          }))
        }
        rows={3}
        placeholder="Adjust source settings or publish posts to show content here."
      />
    </EditorSection>
  );
}

function RuntimeSnapshot({ value }: { value: PostsFeedData }) {
  const normalized = normalizePostsFeedData(value);

  return (
    <EditorSection
      title="Runtime payload"
      description="Read-only snapshot of resolved runtime data."
    >
      <pre className="max-h-64 overflow-auto rounded-md border border-border/70 bg-background/70 p-3 text-xs">
        {JSON.stringify(normalized.resolved ?? {}, null, 2)}
      </pre>
    </EditorSection>
  );
}

function renderPostsFeedEditor(mode: EditorMode, props: WidgetEditorProps<PostsFeedData>) {
  const { value, onChange, variant, onVariantChange } = props;

  if (mode === "wizard") {
    return (
      <div className="space-y-3">
        <SourceSetup value={value} onChange={onChange} />
        <DisplayOptions value={value} onChange={onChange} />
      </div>
    );
  }

  if (mode === "advanced") {
    return (
      <div className="space-y-3">
        <SourceSetup value={value} onChange={onChange} />
        <DisplayOptions value={value} onChange={onChange} />
        <LayoutOptions
          value={value}
          onChange={onChange}
          variant={variant}
          onVariantChange={onVariantChange}
        />
        <EmptyStateOptions value={value} onChange={onChange} />
        <RuntimeSnapshot value={value} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SourceSetup value={value} onChange={onChange} />
      <DisplayOptions value={value} onChange={onChange} />
      <LayoutOptions
        value={value}
        onChange={onChange}
        variant={variant}
        onVariantChange={onVariantChange}
      />
      <EmptyStateOptions value={value} onChange={onChange} />
    </div>
  );
}

export function PostsFeedWizardEditor(props: WidgetEditorProps<PostsFeedData>) {
  return renderPostsFeedEditor("wizard", props);
}

export function PostsFeedVisualEditor(props: WidgetEditorProps<PostsFeedData>) {
  return renderPostsFeedEditor("visual", props);
}

export function PostsFeedAdvancedEditor(props: WidgetEditorProps<PostsFeedData>) {
  return renderPostsFeedEditor("advanced", props);
}
