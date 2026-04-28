import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import type { PostBlockCatalogItem } from "./blockCatalog";

type SlashCommandMenuProps = {
  open: boolean;
  query: string;
  options: PostBlockCatalogItem[];
  onSelect: (type: PostBlockType) => void;
  onClose: () => void;
};

export function SlashCommandMenu({
  open,
  query,
  options,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  if (!open) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border bg-popover shadow-lg">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Slash command
          </p>
          {query ? <Badge variant="outline">/{query}</Badge> : null}
        </div>
        <Button type="button" variant="ghost" size="xs" onClick={onClose}>
          Esc
        </Button>
      </div>

      <div className="max-h-64 overflow-auto p-2">
        {options.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No matching block type.
          </div>
        ) : (
          <div className="space-y-1">
            {options.map((option) => (
              <button
                key={option.type}
                type="button"
                className="w-full rounded-md border px-3 py-2 text-left transition hover:border-primary/50 hover:bg-primary/10"
                onClick={() => onSelect(option.type)}
              >
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
