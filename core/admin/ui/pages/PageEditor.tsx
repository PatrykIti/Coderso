import { useMemo, useState, useEffect } from "react";
import { Eye, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { DeviceSwitcher } from "@/ui/pages/DeviceSwitcher";

import { BlockList } from "./builder/BlockList";
import { BlockSettings } from "./builder/BlockSettings";
import { WidgetPicker } from "./builder/WidgetPicker";
import {
  createBlock,
  duplicateBlock,
  reorderBlocks,
  shouldWarnOnNavigate,
  stripEditor,
} from "./builder/blockUtils";
import type { Block } from "./builder/types";
import { widgetRegistry } from "./builder/widgetRegistry";

const initialBlocks: Block[] = [
  {
    ...createBlock("hero"),
    variant: "centered",
    editor: { mode: "visual", wizardCompleted: true },
    data: {
      headline: "Build faster with Nextless",
    },
  },
  {
    ...createBlock("compare-timeline"),
    variant: "dual-track-highlight",
    editor: { mode: "wizard", wizardCompleted: false },
  },
];

export function PageEditor() {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null;
  const selectedWidget = useMemo(
    () =>
      selectedBlock
        ? widgetRegistry.find((widget) => widget.type === selectedBlock.type)
        : undefined,
    [selectedBlock]
  );

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!shouldWarnOnNavigate(hasUnsavedChanges)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const updateBlocks = (next: Block[]) => {
    setBlocks(next);
    setHasUnsavedChanges(true);
  };

  const handleAddBlock = (type: string) => {
    const nextBlock = createBlock(type);
    updateBlocks([...blocks, nextBlock]);
    setSelectedId(nextBlock.id);
  };

  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    updateBlocks(reorderBlocks(blocks, from, to));
  };

  const handleDuplicate = (id: string) => {
    updateBlocks(duplicateBlock(blocks, id));
  };

  const handleDelete = (id: string) => {
    const next = blocks.filter((block) => block.id !== id);
    updateBlocks(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
  };

  const handleChangeBlock = (next: Block) => {
    updateBlocks(blocks.map((block) => (block.id === next.id ? next : block)));
  };

  const handleSaveDraft = async () => {
    stripEditor(blocks);
    setHasUnsavedChanges(false);
  };

  const handlePublish = async () => {
    stripEditor(blocks);
    setHasUnsavedChanges(false);
  };

  return (
    <EditorShell
      activeHref="/admin/pages"
      leftPanel={<WidgetPicker onAdd={handleAddBlock} />}
      rightPanel={
        <BlockSettings
          block={selectedBlock}
          widget={selectedWidget}
          onChange={handleChangeBlock}
        />
      }
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Pages</span>
          <span>/</span>
          <span className="text-foreground">Homepage</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            Draft
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
              Unsaved changes
            </span>
          ) : null}
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-3">
          <DeviceSwitcher />
          <Button variant="secondary" size="sm" className="gap-2" onClick={handleSaveDraft}>
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button size="sm" className="gap-2" onClick={handlePublish}>
            <Eye className="h-4 w-4" />
            Publish
          </Button>
        </div>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
        <BlockList
          blocks={blocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={handleMove}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      </div>
    </EditorShell>
  );
}
