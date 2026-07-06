import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  maxTagLength?: number;
  placeholder?: string;
  className?: string;
};

const DEFAULT_MAX = 30;
const DEFAULT_TAG_LENGTH = 48;

/**
 * TASK-512-05: chips input for `media.tags`. Enter/comma commits a tag,
 * Backspace on an empty field removes the last chip, duplicates are dropped
 * (case-insensitive), tags are trimmed + length-capped, and the total count is
 * capped at `max`. Client-side clamping is UX only — the server (512-02/03) is
 * authoritative. Tags render as text nodes (no HTML injection).
 */
export function TagInput({
  value,
  onChange,
  max = DEFAULT_MAX,
  maxTagLength = DEFAULT_TAG_LENGTH,
  placeholder = "Add tag…",
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const tag = raw.trim().slice(0, maxTagLength);
    if (!tag) return;
    if (value.length >= max) return;
    const exists = value.some((entry) => entry.toLowerCase() === tag.toLowerCase());
    if (exists) return;
    onChange([...value, tag]);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
      setDraft("");
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      event.preventDefault();
      removeAt(value.length - 1);
    }
  };

  const atCapacity = value.length >= max;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-muted/30 p-2",
        className
      )}
    >
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            className="rounded-sm text-primary-soft-foreground/70 transition-colors hover:text-primary-soft-foreground"
            onClick={() => removeAt(index)}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value.slice(0, maxTagLength))}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) {
            commit(draft);
            setDraft("");
          }
        }}
        placeholder={atCapacity ? `Max ${max} tags` : placeholder}
        disabled={atCapacity}
        aria-label="Add tag"
        className="h-7 min-w-24 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
