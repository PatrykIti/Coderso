import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdminLink } from "@/ui/shared/AdminLink";
import { InfoTip } from "@/ui/shared/InfoTip";
import { SectionCard } from "@/ui/shared/SectionCard";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import type { EntryChecklist } from "./entryChecklist";
import { useEntryTaxonomyIntent } from "./useEntryTaxonomyIntent";

export type EntryStatus = "draft" | "published" | "scheduled" | "archived";

export type EntryVisibility = "public" | "private" | "password";

const statusOptions: Array<{ value: EntryStatus; label: string }> = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
];

const NO_CATEGORY_VALUE = "__none__";

// One identity for "no tags", so the intent hook does not resync on every render of a panel
// mounted without taxonomy.
const NO_TAG_IDS: readonly string[] = [];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

// Local date formatter for the Metadata card (mirrors EntryGrid.tsx:21-31 — no
// component import, just a small inline helper).
const formatMetaDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const MetaRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between">
    <dt className="text-muted-foreground">{label}</dt>
    <dd>{children}</dd>
  </div>
);

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
  // Visibility (514-04). All optional so the panel compiles when mounted by the
  // pre-514-03 editor (strict land order: 514-04 lands before 514-03).
  visibility?: EntryVisibility;
  onVisibilityChange?: (value: EntryVisibility) => void;
  accessPassword?: string; // controlled plaintext input; empty on save = keep current
  onAccessPasswordChange?: (value: string) => void;
  hasPassword?: boolean; // server truth: a hash already exists
  title: string;
  slug: string;
  seoPreviewUrl?: string;
  seoDescription: string;
  onSeoDescriptionChange: (value: string) => void;
  // SEO title / canonical URL / robots join as a unit: the entry editor passes all three,
  // the shared post mount passes none. Optional so that mount keeps compiling (it already
  // omits the visibility group for the same reason).
  seoTitle?: string;
  onSeoTitleChange?: (value: string) => void;
  seoCanonicalUrl?: string;
  onSeoCanonicalUrlChange?: (value: string) => void;
  seoRobots?: string;
  onSeoRobotsChange?: (value: string) => void;
  checklist?: EntryChecklist | null;
  taxonomy?: EntryTaxonomyState | null;
  onCategoryChange?: (categoryId: string | null) => void;
  onTagIdsChange?: (tagIds: string[]) => void;
  onCreateCategory?: (name: string) => Promise<TaxonomyTermOption | null> | void;
  onCreateTag?: (name: string) => Promise<TaxonomyTermOption | null> | void;
  helpItems?: string[];
  taxonomySettingsHref?: string | null;
  author?: { name: string | null; email: string } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  entryId?: string | null;
  // Seam for TASK-487-02-L02 (revision drawer trigger); renders nothing when absent.
  revisionsSlot?: ReactNode;
  // Desktop in-grid mount passes false (plain stacked cards, no inner scroller);
  // mobile Sheet uses the default true (bounded ScrollArea). See 514-03 §3.
  scrollable?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  // False while the host holds no loaded entry. This panel PATCHes status, visibility,
  // schedule, SEO and taxonomy TOGETHER, so saving before the entry has hydrated would push
  // its pristine mount defaults (draft, public, no schedule, empty SEO) over the server's
  // state. Absent means "no such gate", which is how the post editor mounts it.
  canSave?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
  // False while the host holds no loaded entry, for the same reason as `canSave` and one of
  // its own: the confirm dialog names the entry from the host's title, which is empty until
  // hydration, so this would ask the user to confirm destroying a row they were never shown.
  canDelete?: boolean;
};

export function EntryMetadataPanel({
  status,
  onStatusChange,
  scheduledAt,
  onScheduledAtChange,
  visibility,
  onVisibilityChange,
  accessPassword,
  onAccessPasswordChange,
  hasPassword,
  title,
  slug,
  seoPreviewUrl,
  seoDescription,
  onSeoDescriptionChange,
  seoTitle = "",
  onSeoTitleChange,
  seoCanonicalUrl = "",
  onSeoCanonicalUrlChange,
  seoRobots = "",
  onSeoRobotsChange,
  checklist,
  taxonomy,
  onCategoryChange,
  onTagIdsChange,
  onCreateCategory,
  onCreateTag,
  helpItems,
  taxonomySettingsHref,
  author,
  createdAt,
  updatedAt,
  entryId,
  revisionsSlot,
  scrollable = true,
  onSave,
  isSaving,
  canSave,
  onDelete,
  isDeleting,
  canDelete,
}: EntryMetadataPanelProps) {
  const [categoryInput, setCategoryInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [helpCollapsed, setHelpCollapsedState] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("entries.metadataHelpCollapsed") === "true";
  });
  const previewTitle = seoTitle || title || "Content title";
  const previewUrl = seoPreviewUrl ?? `/${slug || "entry-slug"}`;
  const canSchedule = status === "scheduled";
  const currentVisibility = visibility ?? "public";
  const currentAccessPassword = accessPassword ?? "";
  const passwordExists = hasPassword ?? false;
  const checklistItems = checklist?.items ?? [];
  const checklistReadyCount = checklistItems.filter((item) => item.status === "complete").length;
  const checklistHasWarnings = checklistItems.some((item) => item.status === "warning");
  const checklistBadgeLabel = checklistItems.length
    ? checklistHasWarnings
      ? "Needs attention"
      : `${checklistReadyCount}/${checklistItems.length} ready`
    : "Ready";
  const checklistBadgeVariant = checklistHasWarnings ? "warning" : "success";

  const categoryOptions = taxonomy?.categories ?? [];
  const tagOptions = taxonomy?.tags ?? [];
  const selectedCategory = taxonomy?.selectedCategoryId
    ? (categoryOptions.find((term) => term.id === taxonomy.selectedCategoryId) ?? null)
    : null;
  const selectedTags = taxonomy
    ? tagOptions.filter((term) => taxonomy.selectedTagIds.includes(term.id))
    : [];

  // Term creation is asynchronous, so both add flows commit a selection at a moment when the
  // user may already have chosen something else. See `useEntryTaxonomyIntent`.
  const taxonomyIntent = useEntryTaxonomyIntent({
    categoryId: taxonomy?.selectedCategoryId ?? null,
    tagIds: taxonomy?.selectedTagIds ?? NO_TAG_IDS,
  });

  const handleCategorySelect = (value: string) => {
    if (!taxonomy?.categoryEnabled) return;
    const nextCategoryId = value === NO_CATEGORY_VALUE ? null : value;
    taxonomyIntent.noteCategoryDecision(nextCategoryId);
    onCategoryChange?.(nextCategoryId);
  };

  const handleAddCategory = async () => {
    if (!taxonomy?.categoryEnabled) return;
    const value = categoryInput.trim();
    if (!value) return;
    const normalized = value.toLowerCase();
    const existing = categoryOptions.find(
      (term) => term.name.toLowerCase() === normalized || term.slug === slugify(value)
    );
    if (existing) {
      // DELIBERATELY UNPINNED (TASK-540 R5). Deleting this line keeps the panel's whole suite
      // green, and no test can close that. A category decision is only ever READ by
      // `isCategorySuperseded()` below, inside the one window where a category decision can be
      // pending — the `await onCreateCategory` — and throughout that window the input and the
      // Add button that reach this branch are `disabled={isCreatingCategory}`, so React never
      // calls this handler there. The other half of the record, `currentSelection().categoryId`,
      // has no reader at all: the one caller reads `.tagIds`. Observing it would take either of
      // those two facts changing — the Add controls staying live during a creation, which is
      // what the Select does and what makes the identical record in `handleCategorySelect`
      // observable, or a reader for the selected category.
      //
      // It stays because the rule is stated once for the field, not once per control: every
      // commit of a single-valued field is a decision about that field. What makes this line
      // unreachable is a `disabled` attribute — a UI detail, and the only thing standing
      // between this branch and the defect the hook exists to prevent.
      taxonomyIntent.noteCategoryDecision(existing.id);
      onCategoryChange?.(existing.id);
      setCategoryInput("");
      return;
    }
    if (!onCreateCategory) return;
    const decision = taxonomyIntent.beginPendingDecision();
    setIsCreatingCategory(true);
    const created = await onCreateCategory(value);
    setIsCreatingCategory(false);
    if (!created) return;
    setCategoryInput("");
    // The category is single-valued and the user answered it while this term was being
    // created. The term exists and is offered by the select; the choice they can see stands.
    if (decision.isCategorySuperseded()) return;
    // DELIBERATELY UNPINNED (TASK-540 R5) for the reason recorded on the existing-term branch
    // above, plus one of its own: this is the LAST statement of the only flow that opens a
    // category decision, so the counter it bumps is compared against a baseline no pending
    // decision has taken yet. Superseding is counted relatively, so bumping it here can never
    // change an answer — until a second concurrent category decision becomes possible.
    taxonomyIntent.noteCategoryDecision(created.id);
    onCategoryChange?.(created.id);
  };

  const handleTagRemove = (tagId: string) => {
    if (!taxonomy) return;
    const next = taxonomy.selectedTagIds.filter((id) => id !== tagId);
    taxonomyIntent.noteTagsDecision(next);
    onTagIdsChange?.(next);
  };

  const commitTagInput = async () => {
    if (!taxonomy?.tagEnabled) return;
    const value = tagInput.trim();
    if (!value) return;
    const normalized = value.toLowerCase();
    const existing = tagOptions.find(
      (term) => term.name.toLowerCase() === normalized || term.slug === slugify(value)
    );
    const decision = taxonomyIntent.beginPendingDecision();
    let nextId = existing?.id;
    if (!nextId && onCreateTag) {
      setIsCreatingTag(true);
      const created = await onCreateTag(value);
      setIsCreatingTag(false);
      nextId = created?.id;
    }
    if (!nextId) {
      setTagInput("");
      return;
    }
    // Adding a tag is a delta, not a replacement, so it lands on the selection as it stands
    // now. Replaying the array captured before the request would put back every tag removed
    // while the term was being created.
    const next = Array.from(new Set([...decision.currentSelection().tagIds, nextId])).slice(0, 20);
    taxonomyIntent.noteTagsDecision(next);
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
  const setHelpCollapsed = (value: boolean) => {
    setHelpCollapsedState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("entries.metadataHelpCollapsed", String(value));
    }
  };

  const cards = (
    <div className="space-y-6 px-6 py-6">
      <SectionCard
        title="Publish"
        action={<StatusBadge status={status} />}
        bodyClassName="space-y-4"
      >
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Status
          </label>
          <Select value={status} onValueChange={(value) => onStatusChange(value as EntryStatus)}>
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
            Visibility
          </label>
          <Select
            value={currentVisibility}
            onValueChange={(value) => onVisibilityChange?.(value as EntryVisibility)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="password">Password protected</SelectItem>
            </SelectContent>
          </Select>
          {currentVisibility === "password" ? (
            <div className="space-y-1.5">
              <Input
                type="password"
                value={currentAccessPassword}
                onChange={(event) => onAccessPasswordChange?.(event.target.value)}
                placeholder={
                  passwordExists ? "Leave blank to keep current password" : "Set a password"
                }
              />
              <p className="text-[11px] text-muted-foreground">
                {passwordExists
                  ? "A password is set. Enter a new one to change it, or switch Visibility to Public/Private to remove it."
                  : "Required to protect this entry."}
              </p>
            </div>
          ) : null}
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
      </SectionCard>
      {checklistItems.length > 0 ? (
        <SectionCard
          title="Publish checklist"
          action={<Badge variant={checklistBadgeVariant}>{checklistBadgeLabel}</Badge>}
          bodyClassName="space-y-3"
        >
          {checklistItems.map((item) => {
            const Icon =
              item.status === "complete"
                ? CheckCircle2
                : item.status === "warning"
                  ? AlertTriangle
                  : Info;
            const iconClass =
              item.status === "complete"
                ? "text-success"
                : item.status === "warning"
                  ? "text-warning"
                  : "text-muted-foreground";
            return (
              <div key={item.id} className="flex gap-2">
                <Icon className={`mt-0.5 h-4 w-4 ${iconClass}`} />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.detail ? (
                    <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </SectionCard>
      ) : null}
      {/* "What is this?" help is a collapsible, NOT one of the prototype's three
          cards; it is re-homed into SectionCard with the toggle button as the
          title (per contract §0) rather than the legacy <section>+<p>+<Card>. */}
      {helpItems && helpItems.length > 0 ? (
        <SectionCard
          title={
            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
              onClick={() => setHelpCollapsed(!helpCollapsed)}
            >
              {helpCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              What is this?
            </button>
          }
          action={
            <InfoTip
              content="Quick reminders about how content fields behave in this entry."
              label="What is this help"
            />
          }
          padded={!helpCollapsed}
          bodyClassName={helpCollapsed ? "hidden" : "space-y-2"}
        >
          {!helpCollapsed ? (
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {helpItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </SectionCard>
      ) : null}
      <SectionCard
        title="Search Engine Optimization"
        action={
          <Badge variant="outline" className="text-[10px] uppercase">
            Snippet
          </Badge>
        }
        bodyClassName="space-y-4"
      >
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Snippet preview
          </p>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-sm font-semibold text-primary">{previewTitle}</p>
            <p className="text-[10px] text-success">{previewUrl}</p>
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
        {onSeoTitleChange ? (
          <>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                SEO title
              </label>
              <Input
                value={seoTitle}
                onChange={(event) => onSeoTitleChange(event.target.value)}
                maxLength={60}
                className="bg-muted/30"
                placeholder="Search result title (defaults to the entry title)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                Canonical URL
              </label>
              <Input
                value={seoCanonicalUrl}
                onChange={(event) => onSeoCanonicalUrlChange?.(event.target.value)}
                className="bg-muted/30"
                placeholder="https://example.com/entry-slug"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                Robots
              </label>
              <Input
                value={seoRobots}
                onChange={(event) => onSeoRobotsChange?.(event.target.value)}
                maxLength={120}
                className="bg-muted/30"
                placeholder="index,follow"
              />
            </div>
          </>
        ) : null}
      </SectionCard>
      <SectionCard title="Taxonomy" bodyClassName="space-y-4">
        {!taxonomyEnabled ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Categories and tags are disabled for this content type.
            </p>
            {taxonomySettingsHref ? (
              <AdminLink
                href={taxonomySettingsHref}
                className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
              >
                Enable taxonomy in content type settings
              </AdminLink>
            ) : null}
          </div>
        ) : null}
        {taxonomy?.categoryEnabled ? (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Category
            </label>
            <Select
              value={taxonomy.selectedCategoryId ?? NO_CATEGORY_VALUE}
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
              <p className="text-xs text-muted-foreground">Selected: {selectedCategory.name}</p>
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
                <span className="text-xs text-muted-foreground">No tags selected.</span>
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
            <p className="text-[11px] text-muted-foreground">Press Enter or comma to add a tag.</p>
          </div>
        ) : null}
      </SectionCard>
      <SectionCard title="Metadata">
        <dl className="flex flex-col gap-2 text-sm">
          <MetaRow label="Created">{formatMetaDate(createdAt)}</MetaRow>
          <MetaRow label="Updated">{formatMetaDate(updatedAt)}</MetaRow>
          <MetaRow label="Author">{author?.name || author?.email || "—"}</MetaRow>
          <MetaRow label="Entry ID">
            <span className="font-mono text-xs">{entryId ?? "—"}</span>
          </MetaRow>
        </dl>
      </SectionCard>
      {/* Seam for TASK-487-02-L02 revision drawer trigger; collapses to nothing when absent. */}
      {revisionsSlot}
      {onSave ? (
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            className="gap-2"
            onClick={onSave}
            disabled={isSaving || canSave === false}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save metadata"}
          </Button>
        </div>
      ) : null}
      {onDelete ? (
        <SectionCard title="Danger zone" bodyClassName="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Delete this entry permanently from the content list.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full gap-2"
            disabled={isDeleting || canDelete === false}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete entry"}
          </Button>
        </SectionCard>
      ) : null}
    </div>
  );

  return (
    <div data-entry-metadata-panel="true" className="flex h-full min-h-0 flex-col overflow-hidden">
      {scrollable ? <ScrollArea className="min-h-0 flex-1">{cards}</ScrollArea> : cards}
    </div>
  );
}
