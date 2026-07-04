import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { StatusBadge } from "@/ui/shared/StatusBadge";
import type { PostSlugDisplay } from "@/services/siteSettingsClient";
import type { PostStatus } from "@/services/postsClient";
import { BLOG_SEO_ROBOTS_OPTIONS } from "./inspectorSchemas";

export type DocumentInspectorProps = {
  title: string;
  status: PostStatus;
  slug: string;
  excerpt: string;
  featuredImage: string;
  tagsInput: string;
  categoryId: string;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    robots: string;
  };
  taxonomySummary: {
    categoryName: string | null;
    tagCount: number;
  };
  categoryOptions?: Array<{ id: string; name: string }>;
  taxonomyLoading?: boolean;
  taxonomyError?: string | null;
  onTaxonomyRetry?: () => void;
  slugDisplay?: PostSlugDisplay | null;
  updatedAt?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  moveToTrashPending?: boolean;
  onMoveToTrash?: () => void;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onExcerptChange: (value: string) => void;
  onFeaturedImageChange: (value: string) => void;
  onTagsInputChange: (value: string) => void;
  onCategoryIdChange: (value: string) => void;
  onSeoChange: (patch: Partial<DocumentInspectorProps["seo"]>) => void;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
};

const resolveSafeTaxonomyError = (value: string | null) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (
    normalized.includes("failed query") ||
    normalized.includes("select ") ||
    normalized.includes("connection_closed") ||
    normalized.includes("drizzle")
  ) {
    return "Could not load categories.";
  }
  return value;
};

function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function DocumentInspector({
  title,
  status,
  slug,
  excerpt,
  featuredImage,
  tagsInput,
  categoryId,
  seo,
  categoryOptions = [],
  taxonomyLoading = false,
  taxonomyError = null,
  onTaxonomyRetry,
  slugDisplay = null,
  updatedAt,
  scheduledAt,
  publishedAt,
  moveToTrashPending = false,
  onMoveToTrash,
  onTitleChange,
  onSlugChange,
  onExcerptChange,
  onFeaturedImageChange,
  onTagsInputChange,
  onCategoryIdChange,
  onSeoChange,
}: DocumentInspectorProps) {
  const safeTaxonomyError = resolveSafeTaxonomyError(taxonomyError);
  const seoCompleteCount = [
    seo.title.trim(),
    seo.description.trim(),
    seo.canonicalUrl.trim(),
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 p-4" data-post-editor-inspector="document">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold">Post settings</span>
        <StatusBadge status={status} className="capitalize" />
      </div>

      <InspectorRow label="Post title">
        <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
      </InspectorRow>

      <InspectorRow label="Status">
        <StatusBadge status={status} />
      </InspectorRow>
      <dl className="grid gap-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <dt>Last updated</dt>
          <dd className="text-right text-foreground">{formatTimestamp(updatedAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Published</dt>
          <dd className="text-right text-foreground">{formatTimestamp(publishedAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Scheduled</dt>
          <dd className="text-right text-foreground">{formatTimestamp(scheduledAt)}</dd>
        </div>
      </dl>

      <InspectorRow label="Category">
        <Select
          value={categoryId || "__none__"}
          onValueChange={(value) => onCategoryIdChange(value === "__none__" ? "" : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={taxonomyLoading ? "Loading categories..." : "Select a category"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No category</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {taxonomyLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Loading categories...</p>
        ) : safeTaxonomyError ? (
          <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            <p>{safeTaxonomyError}</p>
            {onTaxonomyRetry ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7 px-2 text-xs"
                onClick={onTaxonomyRetry}
              >
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}
      </InspectorRow>

      <InspectorRow label="Slug">
        <Input
          value={slug}
          onChange={(event) => onSlugChange(event.target.value)}
          className="font-mono text-xs"
        />
        {slugDisplay ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{slugDisplay.label}:</span>{" "}
            {slugDisplay.value}
          </p>
        ) : null}
      </InspectorRow>

      <InspectorRow label="Tags (comma separated)">
        <Input
          value={tagsInput}
          onChange={(event) => onTagsInputChange(event.target.value)}
          placeholder="news, guide, release"
        />
      </InspectorRow>

      <InspectorRow label="Featured image">
        <MediaPicker
          value={featuredImage || null}
          onChange={(value) => onFeaturedImageChange(typeof value === "string" ? value : "")}
          multiple={false}
          accept={["image/*"]}
        />
      </InspectorRow>

      <InspectorRow label="Excerpt">
        <Textarea
          value={excerpt}
          onChange={(event) => onExcerptChange(event.target.value)}
          placeholder="Short summary for listings"
        />
      </InspectorRow>

      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            SEO
          </span>
          <Badge variant="outline">SEO {seoCompleteCount}/3</Badge>
        </div>
        <InspectorRow label="SEO title">
          <Input
            value={seo.title}
            onChange={(event) => onSeoChange({ title: event.target.value })}
            placeholder="Title shown in search results"
          />
        </InspectorRow>
        <InspectorRow label="SEO description">
          <Textarea
            value={seo.description}
            onChange={(event) => onSeoChange({ description: event.target.value })}
            placeholder="Description shown in search results"
          />
        </InspectorRow>
        <InspectorRow label="Canonical URL">
          <Input
            value={seo.canonicalUrl}
            onChange={(event) => onSeoChange({ canonicalUrl: event.target.value })}
            placeholder="https://example.com/post"
          />
        </InspectorRow>
        <InspectorRow label="Robots">
          <Select
            value={seo.robots || "index,follow"}
            onValueChange={(value) => onSeoChange({ robots: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select robots policy" />
            </SelectTrigger>
            <SelectContent>
              {BLOG_SEO_ROBOTS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InspectorRow>
      </div>

      <div className="mt-4 rounded-xl border border-destructive/30 p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Danger zone
        </div>
        <p className="text-xs text-muted-foreground">
          Move this post to trash when the draft is no longer needed.
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="mt-2 w-full"
          disabled={moveToTrashPending || !onMoveToTrash}
          onClick={() => onMoveToTrash?.()}
        >
          {moveToTrashPending ? "Moving to trash..." : "Move to trash"}
        </Button>
      </div>
    </div>
  );
}
