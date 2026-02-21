import { Layers3, PanelLeftOpen, PanelRightOpen, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";

import { POST_BLOCK_TYPES } from "../../../../services/posts/editor/postBlockDocument";
import { PostEditorCanvas } from "./PostEditorCanvas";
import { PostEditorTopBar } from "./PostEditorTopBar";
import { usePostEditorState } from "./hooks/usePostEditorState";

const blockTypeLabel: Record<string, string> = {
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

const toNumberValue = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toStringValue = (value: unknown) => (typeof value === "string" ? value : "");

export function PostBlockEditorShell() {
  const [mobileBlocksOpen, setMobileBlocksOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  const editor = usePostEditorState();

  const blockLibrary = (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Block inserter
        </p>
      </div>
      <div className="space-y-2 overflow-auto p-3">
        {POST_BLOCK_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              editor.insertBlock(type);
              setMobileBlocksOpen(false);
            }}
          >
            <Layers3 className="mr-2 h-4 w-4" />
            {blockTypeLabel[type]}
          </Button>
        ))}
      </div>
    </div>
  );

  const inspectorPanel = (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="document" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-4 py-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="block">Block</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="document" className="m-0 min-h-0 flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Excerpt
              </label>
              <Textarea
                value={editor.state.document.meta.excerpt ?? ""}
                onChange={(event) => editor.setExcerpt(event.target.value)}
                placeholder="Short summary used in listings"
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p>Reading time: {editor.state.document.meta.readingTimeMinutes ?? 0} min</p>
              <p>Blocks: {editor.state.document.blocks.length}</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="block" className="m-0 min-h-0 flex-1 overflow-auto p-4">
          {!editor.selectedBlock ? (
            <p className="text-sm text-muted-foreground">Select block to edit settings.</p>
          ) : null}
          {editor.selectedBlock ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>Type: {blockTypeLabel[editor.selectedBlock.type]}</p>
                <p>ID: {editor.selectedBlock.id}</p>
              </div>

              {editor.selectedBlock.type === "heading" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Heading level
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={toNumberValue(editor.selectedBlock.attrs?.level, 2)}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      editor.updateSelectedBlockAttrs({ level: value });
                    }}
                  />
                </div>
              ) : null}

              {editor.selectedBlock.type === "list" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Ordered list
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      editor.updateSelectedBlockAttrs({
                        ordered: editor.selectedBlock?.attrs?.ordered !== true,
                      })
                    }
                  >
                    {editor.selectedBlock.attrs?.ordered === true ? "Ordered" : "Bulleted"}
                  </Button>
                </div>
              ) : null}

              {editor.selectedBlock.type === "image" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Media ID
                    </label>
                    <Input
                      value={toStringValue(editor.selectedBlock.attrs?.mediaId)}
                      onChange={(event) =>
                        editor.updateSelectedBlockAttrs({ mediaId: event.target.value })
                      }
                      placeholder="media-uuid"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Alt text
                    </label>
                    <Input
                      value={toStringValue(editor.selectedBlock.attrs?.alt)}
                      onChange={(event) =>
                        editor.updateSelectedBlockAttrs({ alt: event.target.value })
                      }
                    />
                  </div>
                </>
              ) : null}

              {editor.selectedBlock.type === "callout" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Tone
                  </label>
                  <Input
                    value={toStringValue(editor.selectedBlock.attrs?.tone)}
                    onChange={(event) =>
                      editor.updateSelectedBlockAttrs({ tone: event.target.value })
                    }
                    placeholder="info/success/warning/danger"
                  />
                </div>
              ) : null}

              {editor.selectedBlock.type === "button" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Label
                    </label>
                    <Input
                      value={toStringValue(editor.selectedBlock.attrs?.label)}
                      onChange={(event) =>
                        editor.updateSelectedBlockAttrs({ label: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      URL
                    </label>
                    <Input
                      value={toStringValue(editor.selectedBlock.attrs?.url)}
                      onChange={(event) =>
                        editor.updateSelectedBlockAttrs({ url: event.target.value })
                      }
                    />
                  </div>
                </>
              ) : null}

              {editor.selectedBlock.type === "embed" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Provider
                    </label>
                    <Input
                      value={toStringValue(editor.selectedBlock.attrs?.provider)}
                      onChange={(event) =>
                        editor.updateSelectedBlockAttrs({ provider: event.target.value })
                      }
                      placeholder="youtube/vimeo/custom"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Embed URL
                    </label>
                    <Input
                      value={toStringValue(editor.selectedBlock.attrs?.url)}
                      onChange={(event) =>
                        editor.updateSelectedBlockAttrs({ url: event.target.value })
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );

  const breadcrumbs = useMemo(
    () => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Coderso</span>
        <span>/</span>
        <span>Posts</span>
        <span>/</span>
        <span className="text-foreground">{editor.title || "Edit Post"}</span>
      </div>
    ),
    [editor.title]
  );

  return (
    <EditorShell
      activeHref="/admin/coderso/posts"
      breadcrumbs={breadcrumbs}
      leftPanel={blockLibrary}
      rightPanel={inspectorPanel}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b bg-background px-4 py-2 lg:hidden">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMobileBlocksOpen(true)}
            >
              <PanelLeftOpen className="mr-2 h-4 w-4" />
              Blocks
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMobileInspectorOpen(true)}
            >
              <PanelRightOpen className="mr-2 h-4 w-4" />
              Inspector
            </Button>
          </div>
        </div>

        {editor.error ? (
          <div className="px-4 pt-4 sm:px-6">
            <Alert variant="destructive">
              <AlertTitle>Post editor error</AlertTitle>
              <AlertDescription>{editor.error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {editor.remoteUpdatePending ? (
          <div className="px-4 pt-4 sm:px-6">
            <Alert>
              <AlertTitle>Remote update detected</AlertTitle>
              <AlertDescription>
                This post changed in the background. Reload to synchronize editor state.
              </AlertDescription>
              <div className="mt-3">
                <Button type="button" variant="outline" size="sm" onClick={editor.markReloadRemote}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reload now
                </Button>
              </div>
            </Alert>
          </div>
        ) : null}

        <PostEditorTopBar
          status={editor.status}
          dirty={editor.state.dirty}
          saving={editor.state.saving}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onSaveDraft={() => {
            editor.saveDraft().catch(() => undefined);
          }}
          onPreview={() => {
            editor.preview().catch(() => undefined);
          }}
          onPublish={() => {
            editor.publish().catch(() => undefined);
          }}
        />

        {editor.loading ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            Loading post editor...
          </div>
        ) : (
          <PostEditorCanvas
            title={editor.title}
            slug={editor.slug}
            onTitleChange={editor.setTitle}
            onSlugChange={editor.setSlug}
            document={editor.state.document}
            selectedBlockId={editor.state.selectedBlockId}
            onSelectBlock={(id) => editor.selectBlock(id)}
            onUpdateSelectedBlockContent={editor.updateSelectedBlockContent}
            onMoveSelectedBlock={editor.moveSelectedBlock}
            onDeleteSelectedBlock={editor.deleteSelectedBlock}
          />
        )}

        <RuntimePreviewDialog
          open={editor.previewOpen}
          onOpenChange={editor.setPreviewOpen}
          title="Runtime preview"
          subtitle="Rendered post view for current draft."
          canPreview={Boolean(editor.postId)}
          previewUrl={editor.previewUrl}
          isLoading={editor.previewLoading}
          error={editor.previewError}
        />
      </div>

      <Sheet open={mobileBlocksOpen} onOpenChange={setMobileBlocksOpen}>
        <SheetContent side="left" className="w-full max-w-sm p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Blocks</SheetTitle>
          <SheetDescription className="sr-only">
            Insert blocks to post document.
          </SheetDescription>
          {blockLibrary}
        </SheetContent>
      </Sheet>

      <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
        <SheetContent side="right" className="w-full max-w-sm p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Inspector</SheetTitle>
          <SheetDescription className="sr-only">
            Edit document and selected block settings.
          </SheetDescription>
          {inspectorPanel}
        </SheetContent>
      </Sheet>
    </EditorShell>
  );
}
