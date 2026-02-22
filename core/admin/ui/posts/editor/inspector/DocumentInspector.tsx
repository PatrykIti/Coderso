import { Badge } from "@/components/ui/badge";
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
import { InfoTip } from "@/ui/shared/InfoTip";

import { BLOG_SEO_ROBOTS_OPTIONS } from "./inspectorSchemas";

type DocumentInspectorProps = {
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
    <div className="space-y-4 p-4">
      <section className="space-y-3 rounded-xl border bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Publishing</p>
          <InfoTip content="Current state of this post in public runtime." />
        </div>
        <Badge variant="outline" className={statusClass[status]}>
          {statusLabel[status]}
        </Badge>
      </section>

      <section className="space-y-3 rounded-xl border bg-background p-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Title, URL and excerpt</p>
          <InfoTip content="Title is post headline. Slug defines post URL. Excerpt is a short summary for lists and previews." />
        </div>
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
      </section>

      <section className="space-y-3 rounded-xl border bg-background p-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Featured image</p>
          <InfoTip content="Optional hero image used by post widgets/cards." />
        </div>
        <Input
          value={featuredImage}
          onChange={(event) => onFeaturedImageChange(event.target.value)}
          placeholder="Media ID (optional)"
        />
      </section>

      <section className="space-y-3 rounded-xl border bg-background p-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Taxonomy and tags</p>
          <InfoTip content="Tags improve filtering and listing pages. Category can be linked by category ID." />
        </div>
        <div className="rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
          <p>Current category: {taxonomySummary.categoryName ?? "Not assigned"}</p>
          <p>Linked tag terms: {taxonomySummary.tagCount}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Tags (comma separated)</label>
          <Input
            value={tagsInput}
            onChange={(event) => onTagsInputChange(event.target.value)}
            placeholder="news, guide, release"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Category ID (optional)</label>
          <Input
            value={categoryId}
            onChange={(event) => onCategoryIdChange(event.target.value)}
            placeholder="taxonomy category term ID"
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-background p-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">SEO summary</p>
          <InfoTip content="These fields improve how post is shown in search engines and social previews." />
        </div>
        <div className="rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
          <p>SEO fields completed: {seoCompleteCount}/3</p>
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
      </section>
    </div>
  );
}
