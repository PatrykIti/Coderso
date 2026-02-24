import { AlertTriangle, Heading } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  PostDocumentOutline as PostDocumentOutlineModel,
  PostDocumentOutlineItem,
} from "../../../../../services/posts/editor/postDocumentOutline";

type PostDocumentOutlineProps = {
  outline: PostDocumentOutlineModel;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  showHints?: boolean;
};

const getHeadingIndentClass = (level: number) => {
  if (level <= 1) return "pl-1";
  if (level === 2) return "pl-4";
  if (level === 3) return "pl-7";
  if (level === 4) return "pl-10";
  if (level === 5) return "pl-12";
  return "pl-14";
};

const getWarningLabel = (count: number) =>
  count === 1 ? "1 warning" : `${count} warnings`;

const OutlineRow = ({
  item,
  active,
  onSelect,
}: {
  item: PostDocumentOutlineItem;
  active: boolean;
  onSelect: () => void;
}) => (
  <Button
    type="button"
    variant="ghost"
    className={cn(
      "h-auto w-full justify-start rounded-md border px-2 py-2 text-left",
      getHeadingIndentClass(item.level),
      active
        ? "border-primary/60 bg-primary/10"
        : "border-transparent hover:border-border hover:bg-muted/40"
    )}
    onClick={onSelect}
    aria-label={`Select heading level ${item.level}: ${item.text}`}
  >
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-2">
        <Heading className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="truncate text-sm font-medium text-foreground">{item.text}</p>
        <Badge variant="outline" className="text-[10px] uppercase">
          H{item.level}
        </Badge>
      </div>
      {item.warnings.length > 0 ? (
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{getWarningLabel(item.warnings.length)}</span>
        </div>
      ) : null}
    </div>
  </Button>
);

export function PostDocumentOutline({
  outline,
  selectedBlockId,
  onSelectBlock,
  showHints = true,
}: PostDocumentOutlineProps) {
  if (outline.items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No headings found. Add heading blocks or heading nodes inside writing sections.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-post-editor-overview="outline">
      {outline.items.map((item) => (
        <OutlineRow
          key={item.id}
          item={item}
          active={selectedBlockId === item.blockId}
          onSelect={() => onSelectBlock(item.blockId)}
        />
      ))}

      {showHints && outline.warnings.length > 0 ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
          <p className="font-semibold">Outline checks</p>
          <p className="mt-1">
            {outline.warnings.length} issues detected in heading hierarchy.
          </p>
        </div>
      ) : null}
    </div>
  );
}
