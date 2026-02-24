import { X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import { BlockInserter } from "../blocks/BlockInserter";

type PostInserterSidebarProps = {
  open: boolean;
  onClose: () => void;
  onInsertBlock: (type: PostBlockType) => void;
  disabled?: boolean;
  recentlyUsedTypes?: PostBlockType[];
};

export function PostInserterSidebar({
  open,
  onClose,
  onInsertBlock,
  disabled = false,
  recentlyUsedTypes = [],
}: PostInserterSidebarProps) {
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <section
      className="flex h-full min-h-0 flex-col"
      role="dialog"
      aria-label="Block inserter sidebar"
      data-post-editor-sidebar="inserter"
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Block inserter
          </p>
          <p className="truncate text-sm text-muted-foreground">
            Search and insert blocks into the current post.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
          aria-label="Close block inserter"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className="min-h-0 flex-1">
        <BlockInserter
          onInsertBlock={onInsertBlock}
          disabled={disabled}
          showHeader={false}
          recentlyUsedTypes={recentlyUsedTypes}
        />
      </div>
    </section>
  );
}
