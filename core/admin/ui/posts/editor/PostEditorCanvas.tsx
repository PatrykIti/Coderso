import { GripVertical, MoveDown, MoveUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { PostBlockDocument, PostBlockType } from "../../../../services/posts/editor/postBlockDocument";
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
  title: string;
  slug: string;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  document: PostBlockDocument;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateSelectedBlockContent: (content: unknown) => void;
  onMoveSelectedBlock: (direction: "up" | "down") => void;
  onDeleteSelectedBlock: () => void;
};

const normalizeListForEdit = (value: unknown) => {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join("\n");
};

export function PostEditorCanvas({
  title,
  slug,
  onTitleChange,
  onSlugChange,
  document,
  selectedBlockId,
  onSelectBlock,
  onUpdateSelectedBlockContent,
  onMoveSelectedBlock,
  onDeleteSelectedBlock,
}: PostEditorCanvasProps) {
  const selectedBlock =
    document.blocks.find((block) => block.id === selectedBlockId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="rounded-xl border bg-background p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Post title
            </label>
            <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Write post title"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Slug
            </label>
            <Input
              value={slug}
              onChange={(event) => onSlugChange(event.target.value)}
              placeholder="post-slug"
            />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <div className="min-h-0 overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">List view</p>
          </div>
          <div className="max-h-[30rem] space-y-2 overflow-auto p-3">
            {document.blocks.map((block, index) => {
              const active = block.id === selectedBlockId;
              return (
                <button
                  key={block.id}
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/70 hover:border-primary/40"
                  }`}
                  onClick={() => onSelectBlock(block.id)}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GripVertical className="h-3.5 w-3.5" />
                    <span>#{index + 1}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {blockTypeLabel[block.type]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="flex items-center border-b px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Canvas</p>
              <p className="text-sm font-semibold text-foreground">
                {selectedBlock ? blockTypeLabel[selectedBlock.type] : "Select block"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
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
