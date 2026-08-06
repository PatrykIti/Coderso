import { RefreshCcw } from "lucide-react";
import type { Ref } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { slugify } from "./entrySlug";

/**
 * The entry's title + slug composer that sits at the top of the Content card: the
 * borderless auto-growing title textarea, the `/slug` row and the "generate slug from
 * title" action. Both values are owned by `EntryEditor` (they are part of the content
 * channel and are sent by "Save draft"), so this component only renders and reports.
 */
type EntryTitleSlugFieldsProps = {
  title: string;
  slug: string;
  // The auto-grow effect that measures the textarea still lives in `EntryEditor`
  // alongside the title state, so the ref object is owned there and only attached here.
  titleRef: Ref<HTMLTextAreaElement>;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
};

export function EntryTitleSlugFields({
  title,
  slug,
  titleRef,
  onTitleChange,
  onSlugChange,
}: EntryTitleSlugFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Textarea
        ref={titleRef}
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        rows={1}
        className="min-h-0 h-auto resize-none overflow-hidden rounded-lg border-transparent bg-transparent px-0 py-1 font-display text-3xl font-semibold leading-tight tracking-tight focus-visible:ring-0"
        placeholder="Enter post title..."
      />
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Slug
        </span>
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">/</span>
          <Input
            value={slug}
            onChange={(event) => onSlugChange(event.target.value)}
            className="h-auto border-0 bg-transparent px-0 py-0 text-sm font-mono focus-visible:ring-0"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onSlugChange(slugify(title))}
          >
            <RefreshCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
