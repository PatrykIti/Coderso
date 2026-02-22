import { MoveDown, MoveUp, Shuffle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type {
  PostBlockDocument,
  PostBlockType,
} from "../../../../services/posts/editor/postBlockDocument";
import { getTransformTargetTypes } from "./blocks/blockTransforms";
import { getPostBlockLabel } from "./blocks/blockCatalog";
import { PostListViewPanel } from "./blocks/PostListViewPanel";
import { PostRichTextAdapter } from "./richtext/PostRichTextAdapter";

const blockTypeLabel: Record<PostBlockType, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  list: "List",
  quote: "Quote",
  code: "Code",
  image: "Image",
  separator: "Separator",
  callout: "Callout",
  button: "Button",
  embed: "Embed",
};

type PostEditorCanvasProps = {
  document: PostBlockDocument;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateSelectedBlockContent: (content: unknown) => void;
  onMoveSelectedBlock: (direction: "up" | "down") => void;
  onMoveBlockToIndex: (id: string, targetIndex: number) => void;
  onTransformSelectedBlock: (targetType: PostBlockType) => void;
  onInsertBlock: (type: string) => void;
  onDeleteSelectedBlock: () => void;
};

const normalizeListForEdit = (value: unknown) => {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join("\n");
};

export function PostEditorCanvas({
  document,
  selectedBlockId,
  onSelectBlock,
  onUpdateSelectedBlockContent,
  onMoveSelectedBlock,
  onMoveBlockToIndex,
  onTransformSelectedBlock,
  onInsertBlock,
  onDeleteSelectedBlock,
}: PostEditorCanvasProps) {
  const selectedBlock =
    document.blocks.find((block) => block.id === selectedBlockId) ?? null;
  const transformTargets = selectedBlock
    ? getTransformTargetTypes(selectedBlock.type)
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <PostListViewPanel
          blocks={document.blocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
          onMoveBlockToIndex={onMoveBlockToIndex}
        />

        <div className="min-h-0 overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="flex items-center border-b px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Canvas</p>
              <p className="text-sm font-semibold text-foreground">
                {selectedBlock ? blockTypeLabel[selectedBlock.type] : "Select block"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {transformTargets.length > 0 ? (
                <div className="hidden items-center gap-1 lg:flex">
                  <span className="text-xs text-muted-foreground">Transform:</span>
                  {transformTargets.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => onTransformSelectedBlock(type)}
                      disabled={!selectedBlock}
                      aria-label={`Transform to ${getPostBlockLabel(type)}`}
                    >
                      <Shuffle className="h-3 w-3" />
                      {getPostBlockLabel(type)}
                    </Button>
                  ))}
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onMoveSelectedBlock("up")}
                disabled={!selectedBlock}
                aria-label="Move block up"
              >
                <MoveUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onMoveSelectedBlock("down")}
                disabled={!selectedBlock}
                aria-label="Move block down"
              >
                <MoveDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onDeleteSelectedBlock}
                disabled={!selectedBlock}
                aria-label="Delete block"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-[30rem] overflow-auto p-4">
            {!selectedBlock ? (
              <p className="text-sm text-muted-foreground">
                Select a block from list view to edit its content.
              </p>
            ) : null}
            {selectedBlock &&
            (selectedBlock.type === "paragraph" ||
              selectedBlock.type === "heading" ||
              selectedBlock.type === "quote" ||
              selectedBlock.type === "callout") ? (
              <PostRichTextAdapter
                value={typeof selectedBlock.content === "string" ? selectedBlock.content : ""}
                onChange={onUpdateSelectedBlockContent}
                placeholder="Write content for this block…"
                onSlashInsertBlock={onInsertBlock}
              />
            ) : null}
            {selectedBlock && selectedBlock.type === "code" ? (
              <Textarea
                value={typeof selectedBlock.content === "string" ? selectedBlock.content : ""}
                onChange={(event) => onUpdateSelectedBlockContent(event.target.value)}
                className="min-h-[18rem] font-mono"
                placeholder="Write code block content"
              />
            ) : null}
            {selectedBlock && selectedBlock.type === "list" ? (
              <Textarea
                value={normalizeListForEdit(selectedBlock.content)}
                onChange={(event) => {
                  const items = event.target.value
                    .split(/\r?\n/)
                    .map((item) => item.trim())
                    .filter(Boolean);
                  onUpdateSelectedBlockContent(items);
                }}
                className="min-h-[18rem]"
                placeholder="One item per line"
              />
            ) : null}
            {selectedBlock && selectedBlock.type === "separator" ? (
              <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                Horizontal separator block.
              </div>
            ) : null}
            {selectedBlock &&
            (selectedBlock.type === "image" ||
              selectedBlock.type === "button" ||
              selectedBlock.type === "embed") ? (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Configure this block in the right panel (`Block` tab).
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
