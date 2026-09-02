import type { MediaItem } from "@/ui/media/types";

import type { PostBlock, PostBlockType } from "../../../../services/posts/editor/postBlockDocument";
import type { PostInsertOptions } from "./hooks/usePostEditorState";
import { PostCanvasBlockItem } from "./postEditorCanvasBlockItem";
import type { MediaPickerKind } from "./postEditorCanvasBlockItemModel";
import { isCanvasBlockSelected } from "./postEditorCanvasSelection";

export type CanvasBlockTypography = {
  fontFamily: "sans" | "serif" | "mono";
  baseTextScale: "sm" | "md" | "lg" | "xl";
};

type CanvasBlockListProps = {
  blocks: PostBlock[];
  selectedBlockId: string | null;
  /** Registers the wrapper element of each block for the focus/scroll seams. */
  registerBlockElement: (blockId: string, element: HTMLDivElement | null) => void;
  typography: CanvasBlockTypography;
  mediaById: Map<string, MediaItem>;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlockContent: (id: string, content: unknown) => void;
  onUpdateBlockAttrs?: (id: string, patch: Record<string, unknown>) => void;
  onTransformBlock?: (id: string, targetType: PostBlockType) => void;
  onUpdateDocumentTypography?: (typography: CanvasBlockTypography) => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
  onInsertBlock: (type: PostBlockType, options?: PostInsertOptions) => void;
  onDeleteBlock?: (id: string) => void;
  onOpenMediaPicker: (blockId: string, kind: MediaPickerKind) => void;
  onEnsureDynamicTocBlock?: () => void;
  onOpenBlockDetails?: (blockId: string) => void;
};

/** Ordered block flow of the canvas: one wrapper plus item renderer per block. */
export function CanvasBlockList({
  blocks,
  selectedBlockId,
  registerBlockElement,
  typography,
  mediaById,
  onSelectBlock,
  onUpdateBlockContent,
  onUpdateBlockAttrs,
  onTransformBlock,
  onUpdateDocumentTypography,
  onUploadClipboardImage,
  onInsertBlock,
  onDeleteBlock,
  onOpenMediaPicker,
  onEnsureDynamicTocBlock,
  onOpenBlockDetails,
}: CanvasBlockListProps) {
  return (
    <div className="space-y-6" data-post-editor-flow="unified">
      {blocks.map((block) => (
        <div
          key={block.id}
          ref={(element) => {
            registerBlockElement(block.id, element);
          }}
        >
          <PostCanvasBlockItem
            block={block}
            selected={isCanvasBlockSelected(selectedBlockId, block.id)}
            onSelect={() => onSelectBlock(block.id)}
            onUpdateBlockContent={(content) => onUpdateBlockContent(block.id, content)}
            onUpdateBlockAttrs={
              onUpdateBlockAttrs ? (patch) => onUpdateBlockAttrs(block.id, patch) : undefined
            }
            onTransformBlock={onTransformBlock}
            typography={typography}
            onUpdateTypography={onUpdateDocumentTypography}
            onUploadClipboardImage={onUploadClipboardImage}
            onInsertBlock={onInsertBlock}
            onDeleteBlock={onDeleteBlock}
            onOpenMediaPicker={onOpenMediaPicker}
            mediaById={mediaById}
            onEnsureDynamicTocBlock={onEnsureDynamicTocBlock}
            onOpenBlockDetails={onOpenBlockDetails}
          />
        </div>
      ))}
    </div>
  );
}
