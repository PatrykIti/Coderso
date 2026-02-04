import { Calendar, Save, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { InfoTip } from "@/ui/shared/InfoTip";

export type EntryStatus = "draft" | "published" | "scheduled" | "archived";

const statusOptions: Array<{ value: EntryStatus; label: string }> = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
];

const statusStyles: Record<EntryStatus, string> = {
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  draft: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  scheduled: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  archived: "border-slate-500/30 bg-slate-500/10 text-slate-600",
};

const NO_CATEGORY_VALUE = "__none__";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export type TaxonomyTermOption = {
  id: string;
  name: string;
  slug: string;
};

export type EntryTaxonomyState = {
  categoryEnabled: boolean;
  tagEnabled: boolean;
  selectedCategoryId: string | null;
  selectedTagIds: string[];
  categories: TaxonomyTermOption[];
  tags: TaxonomyTermOption[];
};

type EntryMetadataPanelProps = {
  status: EntryStatus;
  onStatusChange: (status: EntryStatus) => void;
  scheduledAt: string;
  onScheduledAtChange: (value: string) => void;
  title: string;
  slug: string;
  seoDescription: string;
  onSeoDescriptionChange: (value: string) => void;
  taxonomy?: EntryTaxonomyState | null;
  onCategoryChange?: (categoryId: string | null) => void;
  onTagIdsChange?: (tagIds: string[]) => void;
  onCreateCategory?: (name: string) => Promise<TaxonomyTermOption | null> | void;
  onCreateTag?: (name: string) => Promise<TaxonomyTermOption | null> | void;
  helpItems?: string[];
  author?: { name: string | null; email: string } | null;
  onSave?: () => void;
  isSaving?: boolean;
};

export function EntryMetadataPanel({
  status,
  onStatusChange,
  scheduledAt,
  onScheduledAtChange,
  title,
  slug,
  seoDescription,
  onSeoDescriptionChange,
  taxonomy,
  onCategoryChange,
  onTagIdsChange,
  onCreateCategory,
  onCreateTag,
  helpItems,
  author,
  onSave,
  isSaving,
}: EntryMetadataPanelProps) {
  const [categoryInput, setCategoryInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const previewTitle = title
    ? `${title} | Nextless CMS`
    : "Content title | Nextless CMS";
  const previewUrl = `https://nextless.cms/blog/${slug || "entry-slug"}`;
  const canSchedule = status === "scheduled";

  const categoryOptions = taxonomy?.categories ?? [];
  const tagOptions = taxonomy?.tags ?? [];
  const selectedCategory = taxonomy?.selectedCategoryId
    ? categoryOptions.find((term) => term.id === taxonomy.selectedCategoryId) ?? null
    : null;
  const selectedTags = taxonomy
    ? tagOptions.filter((term) => taxonomy.selectedTagIds.includes(term.id))
    : [];

  const handleCategorySelect = (value: string) => {
    if (!taxonomy?.categoryEnabled) return;
    if (value === NO_CATEGORY_VALUE) {
      onCategoryChange?.(null);
      return;
    }
    onCategoryChange?.(value);
  };

  const handleAddCategory = async () => {
    if (!taxonomy?.categoryEnabled) return;
    const value = categoryInput.trim();
    if (!value) return;
    const normalized = value.toLowerCase();
    const existing = categoryOptions.find(
      (term) =>
        term.name.toLowerCase() === normalized || term.slug === slugify(value)
    );
    if (existing) {
      onCategoryChange?.(existing.id);
      setCategoryInput("");
      return;
    }
    if (!onCreateCategory) return;
    setIsCreatingCategory(true);
    const created = await onCreateCategory(value);
    setIsCreatingCategory(false);
    if (created) {
      onCategoryChange?.(created.id);
      setCategoryInput("");
    }
  };

  const handleTagRemove = (tagId: string) => {
    if (!taxonomy) return;
    const next = taxonomy.selectedTagIds.filter((id) => id !== tagId);
    onTagIdsChange?.(next);
  };

  const commitTagInput = async () => {
    if (!taxonomy?.tagEnabled) return;
    const value = tagInput.trim();
    if (!value) return;
    const normalized = value.toLowerCase();
    const existing = tagOptions.find(
      (term) =>
        term.name.toLowerCase() === normalized || term.slug === slugify(value)
    );
    let nextId = existing?.id;
    if (!nextId && onCreateTag) {
      setIsCreatingTag(true);
      const created = await onCreateTag(value);
      setIsCreatingTag(false);
      nextId = created?.id;
    }
    if (!nextId || !taxonomy) {
      setTagInput("");
      return;
    }
    const next = Array.from(new Set([...taxonomy.selectedTagIds, nextId])).slice(
      0,
      20
    );
    onTagIdsChange?.(next);
    setTagInput("");
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    void commitTagInput();
  };

  const handleTagBlur = () => {
    void commitTagInput();
  };

  const taxonomyEnabled = taxonomy?.categoryEnabled || taxonomy?.tagEnabled;

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-6 py-6">
        <div className="space-y-6 pb-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Publishing
              </p>
              <Badge variant="outline" className={statusStyles[status]}>
                {statusOptions.find((option) => option.value === status)?.label ?? status}
              </Badge>
            </div>
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Status
                  </label>
                  <Select
                    value={status}
                    onValueChange={(value) => onStatusChange(value as EntryStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Schedule date
                  </label>
                  <div className="relative">
                    <Input
                      value={scheduledAt}
                      onChange={(event) => onScheduledAtChange(event.target.value)}
                      disabled={!canSchedule}
                      className="pr-10"
                      placeholder={canSchedule ? "2026-02-01T10:00:00Z" : "Set status to scheduled"}
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          <Separator />
          {helpItems && helpItems.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  What is this?
                </p>
                <InfoTip
                  content="Quick reminders about how content fields behave in this entry."
                  label="What is this help"
                />
              </div>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {helpItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          ) : null}
          <Separator />
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Search Engine Optimization
              </p>
              <Badge variant="outline" className="text-[10px] uppercase">
                Snippet
              </Badge>
            </div>
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Snippet preview
                  </p>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm font-semibold text-primary">{previewTitle}</p>
                    <p className="text-[10px] text-emerald-700">{previewUrl}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {seoDescription || "Add a short summary for search results."}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Meta description
                  </label>
                  <Textarea
                    value={seoDescription}
                    onChange={(event) => onSeoDescriptionChange(event.target.value)}
                    rows={4}
                    className="resize-none bg-muted/30"
                    placeholder="Write a short description for search results..."
                  />
                </div>
              </CardContent>
            </Card>
          </section>
          <Separator />
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Taxonomy
            </p>
            <Card>
              <CardContent className="space-y-4 p-4">
                {!taxonomyEnabled ? (
                  <p className="text-xs text-muted-foreground">
                    Categories and tags are disabled for this content type.
                  </p>
                ) : null}
                {taxonomy?.categoryEnabled ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Category
                    </label>
                    <Select
                      value={
                        taxonomy.selectedCategoryId ?? NO_CATEGORY_VALUE
                      }
                      onValueChange={handleCategorySelect}
                    >
                    <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY_VALUE}>No category</SelectItem>
                        {categoryOptions.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add category..."
                        value={categoryInput}
                        onChange={(event) => setCategoryInput(event.target.value)}
                        disabled={isCreatingCategory}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleAddCategory()}
                        disabled={!categoryInput.trim() || isCreatingCategory}
                      >
                        {isCreatingCategory ? "Adding..." : "Add"}
                      </Button>
                    </div>
                    {selectedCategory ? (
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedCategory.name}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {taxonomy?.tagEnabled ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary"
                        >
                          <span>{tag.name}</span>
                          <button
                            type="button"
                            onClick={() => handleTagRemove(tag.id)}
                            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-primary/80 transition hover:bg-primary/20"
                            aria-label={`Remove ${tag.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {selectedTags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          No tags selected.
                        </span>
                      ) : null}
                    </div>
                    <Input
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={handleTagBlur}
                      disabled={isCreatingTag}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Press Enter or comma to add a tag.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>
          {onSave ? (
            <div className="flex items-center justify-end">
              <Button size="sm" className="gap-2" onClick={onSave} disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save metadata"}
              </Button>
            </div>
          ) : null}
        </div>
      </ScrollArea>
      <div className="border-t px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/10" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {author?.name || author?.email || "Unknown author"}
            </span>
            <span className="text-[10px] uppercase text-muted-foreground">
              {author?.email ?? "No author linked"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
