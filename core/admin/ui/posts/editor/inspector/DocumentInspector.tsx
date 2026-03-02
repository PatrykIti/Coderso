import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PostStatus } from "@/services/postsClient";
import { BLOG_SEO_ROBOTS_OPTIONS } from "./inspectorSchemas";
import { InspectorSection } from "./InspectorSection";

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

const statusLabel: Record<PostStatus, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
  archived: "Archived",
};

const statusClass: Record<PostStatus, string> = {
  draft: "border-slate-500/30 bg-slate-500/10 text-slate-600",
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  scheduled: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  archived: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700",
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
};

export function DocumentInspector({
  title,
  status,
  slug,
  excerpt,
  featuredImage,
  tagsInput,
  categoryId,
  seo,
  taxonomySummary,
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
  const seoCompleteCount = [
    seo.title.trim(),
    seo.description.trim(),
    seo.canonicalUrl.trim(),
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 p-4" data-post-editor-inspector="document">
      <InspectorSection
        title="Publishing"
        info="Current post lifecycle status and publishing timestamps."
        tone="muted"
      >
        <Badge variant="outline" className={statusClass[status]}>
          {statusLabel[status]}
        </Badge>
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
      </InspectorSection>

      <InspectorSection
        title="Categories and tags"
        info="Assign taxonomy for runtime filtering and grouping."
      >
        <div className="rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
          <p>Current category: {taxonomySummary.categoryName ?? "Not assigned"}</p>
          <p>Linked tag terms: {taxonomySummary.tagCount}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Category ID (optional)</label>
          <Input
            value={categoryId}
            onChange={(event) => onCategoryIdChange(event.target.value)}
            placeholder="taxonomy category term ID"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Tags (comma separated)</label>
          <Input
            value={tagsInput}
            onChange={(event) => onTagsInputChange(event.target.value)}
            placeholder="news, guide, release"
          />
        </div>
      </InspectorSection>

      <InspectorSection
        title="Featured image"
        info="Optional hero image used by post widgets/cards."
      >
        <Input
          value={featuredImage}
          onChange={(event) => onFeaturedImageChange(event.target.value)}
          placeholder="Media ID (optional)"
        />
      </InspectorSection>

      <Collapsible defaultOpen={false}>
        <InspectorSection
          title="Advanced"
          info="Optional technical metadata and SEO fields."
          action={
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="group">
                Toggle
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
          }
        >
          <CollapsibleContent className="space-y-3 border-t pt-3">
            <InspectorSection
              title="Title, URL and excerpt"
              tone="muted"
              className="rounded-lg"
            >
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Post title</label>
                <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Slug</label>
                <Input value={slug} onChange={(event) => onSlugChange(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Excerpt</label>
                <Textarea
                  value={excerpt}
                  onChange={(event) => onExcerptChange(event.target.value)}
                  placeholder="Short summary for listings"
                />
              </div>
            </InspectorSection>

            <InspectorSection title="SEO summary" tone="muted" className="rounded-lg">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  SEO fields completed: {seoCompleteCount}/3
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">SEO title</label>
                <Input
                  value={seo.title}
                  onChange={(event) => onSeoChange({ title: event.target.value })}
                  placeholder="Title shown in search results"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">SEO description</label>
                <Textarea
                  value={seo.description}
                  onChange={(event) => onSeoChange({ description: event.target.value })}
                  placeholder="Description shown in search results"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Canonical URL</label>
                <Input
                  value={seo.canonicalUrl}
                  onChange={(event) => onSeoChange({ canonicalUrl: event.target.value })}
                  placeholder="https://example.com/post"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Robots</label>
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
              </div>
            </InspectorSection>
          </CollapsibleContent>
        </InspectorSection>
      </Collapsible>

      <InspectorSection
        title="Danger zone"
        info="Destructive action. This removes the post and returns to posts list."
        tone="danger"
      >
        <p className="text-xs text-muted-foreground">
          Move this post to trash when the draft is no longer needed.
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full"
          disabled={moveToTrashPending || !onMoveToTrash}
          onClick={() => onMoveToTrash?.()}
        >
          {moveToTrashPending ? "Moving to trash..." : "Move to trash"}
        </Button>
      </InspectorSection>
    </div>
  );
}
