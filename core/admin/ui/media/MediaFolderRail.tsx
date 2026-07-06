import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  Music,
  Pencil,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useState, type ComponentType, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { MediaFilter } from "./MediaToolbar";
import type { MediaFolder } from "./types";
import type { FolderNode } from "./utils";

/** Reorder unit forwarded to the page (matches `mediaFoldersClient.MediaFolderOrder`). */
export type MediaFolderReorder = {
  id: string;
  orderIndex: number;
  parentId?: string | null;
};

type MediaFolderRailProps = {
  folders: MediaFolder[];
  folderTree: FolderNode[];
  typeCounts: Record<MediaFilter, number>;
  folderCounts: Record<string, number>;
  activeFolderId: string | null;
  activeType: MediaFilter;
  onSelectType: (type: MediaFilter) => void;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onReorder: (orders: MediaFolderReorder[]) => void;
  className?: string;
};

const TYPE_DEFS: {
  value: MediaFilter;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { value: "all", label: "All files", icon: HardDrive },
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "video", label: "Videos", icon: Video },
  { value: "document", label: "Documents", icon: FileText },
  { value: "audio", label: "Audio", icon: Music },
];

const rowClass = (active: boolean) =>
  cn(
    "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
    active
      ? "bg-primary-soft font-medium text-primary-soft-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

/**
 * TASK-512-05: replaces the static type-only rail with real user folders + the
 * MIME-type quick filters. Prototype tokens
 * (`_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx:104-108`): active rows
 * use `bg-primary-soft`/`text-primary-soft-foreground` (reconciled from the old
 * `bg-primary/10 text-primary` deviation). Section 1 = type filters, section 2 =
 * a nestable folder tree (create/rename/delete/reorder) with recursive counts
 * supplied by the page via `folderCounts`.
 */
export function MediaFolderRail({
  folders,
  folderTree,
  typeCounts,
  folderCounts,
  activeFolderId,
  activeType,
  onSelectType,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onReorder,
  className,
}: MediaFolderRailProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreateFolder(name, null);
    setNewName("");
    setCreating(false);
  };

  const submitRename = (event: FormEvent, id: string) => {
    event.preventDefault();
    const name = renameDraft.trim();
    if (name) onRenameFolder(id, name);
    setRenamingId(null);
    setRenameDraft("");
  };

  const moveWithinSiblings = (siblings: FolderNode[], index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= siblings.length) return;
    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    onReorder(
      reordered.map((node, orderIndex) => ({
        id: node.id,
        orderIndex,
        parentId: node.parentId,
      }))
    );
  };

  const renderFolder = (node: FolderNode, depth: number, siblings: FolderNode[], index: number) => {
    const active = activeFolderId === node.id;
    const isRenaming = renamingId === node.id;
    return (
      <div key={node.id} className="w-full">
        {isRenaming ? (
          <form
            className="flex items-center gap-1 px-1 py-1"
            style={{ paddingLeft: depth * 12 + 4 }}
            onSubmit={(event) => submitRename(event, node.id)}
          >
            <Input
              autoFocus
              value={renameDraft}
              aria-label={`Rename folder ${node.name}`}
              onChange={(event) => setRenameDraft(event.target.value)}
              className="h-8"
            />
            <Button type="submit" size="icon" variant="ghost" aria-label="Save folder name">
              <Check className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Cancel rename"
              onClick={() => setRenamingId(null)}
            >
              <X className="size-4" />
            </Button>
          </form>
        ) : (
          <div className={cn("group", rowClass(active))} style={{ paddingLeft: depth * 12 + 12 }}>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-pressed={active}
              onClick={() => onSelectFolder(node.id)}
            >
              <span className="truncate">{node.name}</span>
            </button>
            <span className="flex items-center gap-0.5">
              <span className="hidden items-center gap-0.5 group-hover:inline-flex">
                <button
                  type="button"
                  aria-label={`Move ${node.name} up`}
                  className="rounded p-0.5 hover:bg-background/50"
                  onClick={() => moveWithinSiblings(siblings, index, -1)}
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${node.name} down`}
                  className="rounded p-0.5 hover:bg-background/50"
                  onClick={() => moveWithinSiblings(siblings, index, 1)}
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Rename ${node.name}`}
                  className="rounded p-0.5 hover:bg-background/50"
                  onClick={() => {
                    setRenamingId(node.id);
                    setRenameDraft(node.name);
                  }}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${node.name}`}
                  className="rounded p-0.5 text-destructive hover:bg-background/50"
                  onClick={() => {
                    if (
                      typeof window === "undefined" ||
                      window.confirm(`Delete folder "${node.name}"? Its media will be unfiled.`)
                    ) {
                      onDeleteFolder(node.id);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
              <span className="text-xs tabular-nums">{folderCounts[node.id] ?? 0}</span>
            </span>
          </div>
        )}
        {node.children.length > 0
          ? node.children.map((child, childIndex) =>
              renderFolder(child, depth + 1, node.children, childIndex)
            )
          : null}
      </div>
    );
  };

  return (
    <nav
      className={cn("flex flex-row flex-wrap gap-1 lg:flex-col lg:flex-nowrap", className)}
      aria-label="Media folders"
    >
      {TYPE_DEFS.map((def) => {
        const active = activeFolderId === null && activeType === def.value;
        const Icon = def.icon;
        return (
          <button
            key={def.value}
            type="button"
            aria-pressed={active}
            className={rowClass(active)}
            onClick={() => onSelectType(def.value)}
          >
            <span className="flex items-center gap-2.5">
              <Icon className="size-4" />
              {def.label}
            </span>
            <span className="text-xs tabular-nums">{typeCounts[def.value] ?? 0}</span>
          </button>
        );
      })}

      <div className="mt-2 flex w-full items-center justify-between px-3 py-1 lg:mt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Folders{folders.length > 0 ? ` (${folders.length})` : ""}
        </span>
        <button
          type="button"
          aria-label="New folder"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => {
            setCreating((prev) => !prev);
            setNewName("");
          }}
        >
          <FolderPlus className="size-3.5" />
          New
        </button>
      </div>

      {creating ? (
        <form className="flex w-full items-center gap-1 px-1" onSubmit={submitCreate}>
          <Input
            autoFocus
            value={newName}
            aria-label="New folder name"
            placeholder="Folder name"
            onChange={(event) => setNewName(event.target.value)}
            className="h-8"
          />
          <Button type="submit" size="icon" variant="ghost" aria-label="Create folder">
            <Check className="size-4" />
          </Button>
        </form>
      ) : null}

      {folderTree.length === 0 && !creating ? (
        <p className="px-3 py-1 text-xs text-muted-foreground">No folders yet.</p>
      ) : null}

      {folderTree.map((node, index) => renderFolder(node, 0, folderTree, index))}
    </nav>
  );
}
