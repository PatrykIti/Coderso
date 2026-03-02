import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type {
  PostBlock,
} from "../../../../../services/posts/editor/postBlockDocument";
import type { PostEditorDetailsTab } from "../hooks/usePostEditorLayout";
import { BlockInspector, type BlockInspectorProps } from "./BlockInspector";
import { DocumentInspector, type DocumentInspectorProps } from "./DocumentInspector";

type PostDetailsSidebarProps = {
  activeTab: PostEditorDetailsTab;
  onTabChange: (tab: PostEditorDetailsTab) => void;
  document: DocumentInspectorProps;
  block: PostBlock | null;
  onChangeBlockAttrs: BlockInspectorProps["onChangeAttrs"];
};

export function PostDetailsSidebar({
  activeTab,
  onTabChange,
  document,
  block,
  onChangeBlockAttrs,
}: PostDetailsSidebarProps) {
  const hasBlock = Boolean(block);
  const resolvedTab: PostEditorDetailsTab = hasBlock ? activeTab : "document";

  return (
    <div
      className="flex h-full flex-col"
      data-post-editor-details="true"
      data-post-editor-details-tab={resolvedTab}
      id="post-editor-details"
      role="region"
      aria-label="Post details"
    >
      <Tabs
        value={resolvedTab}
        onValueChange={(value) =>
          onTabChange(value === "block" && hasBlock ? "block" : "document")
        }
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b px-4 py-3">
          <TabsList className="grid w-full grid-cols-2" aria-label="Post details tabs">
            <TabsTrigger value="document" data-post-editor-details-tab-trigger="document">
              Post
            </TabsTrigger>
            <TabsTrigger
              value="block"
              disabled={!hasBlock}
              data-post-editor-details-tab-trigger="block"
            >
              Block
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="document" className="m-0 min-h-0 flex-1 overflow-auto">
          <DocumentInspector {...document} />
        </TabsContent>
        <TabsContent value="block" className="m-0 min-h-0 flex-1 overflow-auto">
          <BlockInspector block={block} onChangeAttrs={onChangeBlockAttrs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
