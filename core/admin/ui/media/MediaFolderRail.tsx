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
import { useEffect, useRef, useState, type ComponentType, type FormEvent } from "react";

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

export type FolderOperation =
  | Readonly<{ kind: "load" }>
  | Readonly<{
      kind: "create";
      name: string;
      parentId: string | null;
      formGeneration: number;
    }>
  | Readonly<{ kind: "rename"; id: string; name: string; formGeneration: number }>
  | Readonly<{ kind: "reorder"; orders: readonly Readonly<MediaFolderReorder>[] }>
  | Readonly<{ kind: "delete"; id: string; name: string }>;

export type FolderOperationKind = FolderOperation["kind"];

export type FolderOperationTarget =
  | Readonly<{ kind: "load" }>
  | Readonly<{
      kind: "create";
      name: string;
      parentId: string | null;
      formGeneration: number;
    }>
  | Readonly<{
      kind: "rename";
      folderId: string;
      name: string;
      formGeneration: number;
    }>
  | Readonly<{ kind: "reorder"; orders: readonly Readonly<MediaFolderReorder>[] }>
  | Readonly<{ kind: "delete"; folderId: string }>;

export type FolderOperationFeedback = Readonly<{
  token: number;
  kind: FolderOperationKind;
  target: FolderOperationTarget;
  message: string;
  retry: FolderOperation;
  displayFolderName?: string;
}>;

export type FolderRetryResult = Readonly<{
  ok: boolean;
  token: number;
  kind: FolderOperationKind;
  target: FolderOperationTarget;
}>;

export const FOLDER_RETRY_NAMES = Object.freeze({
  load: "Retry loading folders",
  create: "Retry creating folder",
  rename: "Retry renaming folder",
  reorder: "Retry saving folder order",
  deletePrefix: "Retry deleting ",
});

export const sameFolderOperationTarget = (
  left: FolderOperationTarget,
  right: FolderOperationTarget
): boolean => {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "load":
      return true;
    case "create":
      return (
        right.kind === "create" &&
        left.name === right.name &&
        left.parentId === right.parentId &&
        left.formGeneration === right.formGeneration
      );
    case "rename":
      return (
        right.kind === "rename" &&
        left.folderId === right.folderId &&
        left.name === right.name &&
        left.formGeneration === right.formGeneration
      );
    case "delete":
      return right.kind === "delete" && left.folderId === right.folderId;
    case "reorder":
      return (
        right.kind === "reorder" &&
        left.orders.length === right.orders.length &&
        left.orders.every((order, index) => {
          const candidate = right.orders[index];
          return (
            candidate !== undefined &&
            order.id === candidate.id &&
            order.orderIndex === candidate.orderIndex &&
            Object.prototype.hasOwnProperty.call(order, "parentId") ===
              Object.prototype.hasOwnProperty.call(candidate, "parentId") &&
            order.parentId === candidate.parentId
          );
        })
      );
  }
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
  onCreateFolder: (
    name: string,
    parentId: string | null,
    formGeneration: number
  ) => Promise<boolean>;
  onRenameFolder: (id: string, name: string, formGeneration: number) => Promise<boolean>;
  onDeleteFolder: (id: string, name: string) => Promise<boolean>;
  onReorder: (orders: readonly MediaFolderReorder[]) => Promise<boolean>;
  folderError: FolderOperationFeedback | null;
  pendingKind: FolderOperationKind | null;
  onRetry: (errorToken: number) => Promise<FolderRetryResult | null>;
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
  folderError,
  pendingKind,
  onRetry,
  className,
}: MediaFolderRailProps) {
  const mountedRef = useRef(false);
  const formGenerationRef = useRef(0);
  const createFormRef = useRef<{
    generation: number;
    parentId: string | null;
    draft: string;
  } | null>(null);
  const renameFormRef = useRef<{
    generation: number;
    id: string;
    draft: string;
  } | null>(null);
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const [createForm, setCreateForm] = useState<{
    generation: number;
    parentId: string | null;
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [renameForm, setRenameForm] = useState<{ generation: number; id: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const pending = pendingKind !== null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      formGenerationRef.current += 1;
      createFormRef.current = null;
      renameFormRef.current = null;
    };
  }, []);

  const closeCreateForm = () => {
    formGenerationRef.current += 1;
    createFormRef.current = null;
    setCreateForm(null);
    setNewName("");
  };

  const closeRenameForm = () => {
    formGenerationRef.current += 1;
    renameFormRef.current = null;
    setRenameForm(null);
    setRenameDraft("");
  };

  const openCreateForm = () => {
    if (createFormRef.current) {
      closeCreateForm();
      return;
    }
    const generation = ++formGenerationRef.current;
    const form = { generation, parentId: null, draft: "" };
    createFormRef.current = form;
    setCreateForm({ generation, parentId: null });
    setNewName("");
  };

  const openRenameForm = (id: string, name: string) => {
    const generation = ++formGenerationRef.current;
    renameFormRef.current = { generation, id, draft: name };
    setRenameForm({ generation, id });
    setRenameDraft(name);
  };

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    const current = createFormRef.current;
    const name = current?.draft.trim() ?? "";
    if (!current || !name || pending) return;
    const target = {
      generation: current.generation,
      parentId: current.parentId,
      name,
    };
    const ok = await onCreateFolder(target.name, target.parentId, target.generation);
    if (!mountedRef.current) return;
    const latest = createFormRef.current;
    const matches =
      latest !== null &&
      latest.generation === target.generation &&
      latest.parentId === target.parentId &&
      latest.draft.trim() === target.name;
    if (ok && matches) {
      closeCreateForm();
    } else if (!ok && matches) {
      createInputRef.current?.focus();
    }
  };

  const submitRename = async (event: FormEvent, id: string) => {
    event.preventDefault();
    const current = renameFormRef.current;
    const name = current?.draft.trim() ?? "";
    if (!current || current.id !== id || !name || pending) return;
    const target = { generation: current.generation, id: current.id, name };
    const ok = await onRenameFolder(target.id, target.name, target.generation);
    if (!mountedRef.current) return;
    const latest = renameFormRef.current;
    const matches =
      latest !== null &&
      latest.generation === target.generation &&
      latest.id === target.id &&
      latest.draft.trim() === target.name;
    if (ok && matches) {
      closeRenameForm();
    } else if (!ok && matches) {
      renameInputRef.current?.focus();
    }
  };

  const moveWithinSiblings = async (siblings: FolderNode[], index: number, delta: number) => {
    const target = index + delta;
    if (pending || target < 0 || target >= siblings.length) return;
    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(target, 0, moved);
    await onReorder(
      reordered.map((node, orderIndex) => ({
        id: node.id,
        orderIndex,
        parentId: node.parentId,
      }))
    );
  };

  const retryVisibleError = async () => {
    const captured = folderError;
    if (!captured || pending) return;
    const result = await onRetry(captured.token);
    if (!mountedRef.current) return;
    if (
      !result ||
      result.token !== captured.token ||
      result.kind !== captured.kind ||
      !sameFolderOperationTarget(result.target, captured.target)
    ) {
      return;
    }
    if (!result.ok) {
      if (captured.target.kind === "create") {
        const current = createFormRef.current;
        if (
          current?.generation === captured.target.formGeneration &&
          current.parentId === captured.target.parentId &&
          current.draft.trim() === captured.target.name
        ) {
          createInputRef.current?.focus();
        }
      }
      if (captured.target.kind === "rename") {
        const current = renameFormRef.current;
        if (
          current?.generation === captured.target.formGeneration &&
          current.id === captured.target.folderId &&
          current.draft.trim() === captured.target.name
        ) {
          renameInputRef.current?.focus();
        }
      }
      return;
    }

    if (captured.target.kind === "create" && result.target.kind === "create") {
      const current = createFormRef.current;
      if (
        current &&
        current.generation === captured.target.formGeneration &&
        current.parentId === captured.target.parentId &&
        current.draft.trim() === captured.target.name
      ) {
        closeCreateForm();
      }
    }
    if (captured.target.kind === "rename" && result.target.kind === "rename") {
      const current = renameFormRef.current;
      if (
        current &&
        current.generation === captured.target.formGeneration &&
        current.id === captured.target.folderId &&
        current.draft.trim() === captured.target.name
      ) {
        closeRenameForm();
      }
    }
  };

  const retryName = folderError
    ? folderError.kind === "delete"
      ? `${FOLDER_RETRY_NAMES.deletePrefix}${folderError.displayFolderName ?? ""}`
      : FOLDER_RETRY_NAMES[folderError.kind]
    : null;

  const retryTargetId =
    folderError?.target.kind === "rename" || folderError?.target.kind === "delete"
      ? folderError.target.folderId
      : undefined;
  const retryParentId =
    folderError?.target.kind === "create" ? (folderError.target.parentId ?? "") : undefined;
  const retryFormGeneration =
    folderError?.target.kind === "create" || folderError?.target.kind === "rename"
      ? folderError.target.formGeneration
      : undefined;
  const retryTargetName = folderError
    ? folderError.target.kind === "create" || folderError.target.kind === "rename"
      ? folderError.target.name
      : folderError.target.kind === "delete"
        ? folderError.displayFolderName
        : undefined
    : undefined;

  const renderFolder = (node: FolderNode, depth: number, siblings: FolderNode[], index: number) => {
    const active = activeFolderId === node.id;
    const isRenaming = renameForm?.id === node.id;
    return (
      <div key={node.id} className="w-full">
        {isRenaming ? (
          <form
            className={cn("group py-1", rowClass(active))}
            style={{ paddingLeft: depth * 12 + 4 }}
            data-folder-form-kind="rename"
            data-folder-form-generation={renameForm.generation}
            data-folder-form-target-id={node.id}
            data-media-folder-id={node.id}
            data-media-folder-name={node.name}
            data-media-folder-parent-id={node.parentId ?? undefined}
            aria-current={active ? "true" : undefined}
            onSubmit={(event) => {
              void submitRename(event, node.id);
            }}
          >
            <Input
              ref={renameInputRef}
              autoFocus
              value={renameDraft}
              aria-label={`Rename folder ${node.name}`}
              onChange={(event) => {
                const value = event.target.value;
                setRenameDraft(value);
                if (renameFormRef.current?.id === node.id) {
                  renameFormRef.current = { ...renameFormRef.current, draft: value };
                }
              }}
              className="h-8"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              aria-label="Save folder name"
              disabled={pending}
            >
              <Check className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Cancel rename"
              onClick={closeRenameForm}
            >
              <X className="size-4" />
            </Button>
          </form>
        ) : (
          <div
            className={cn("group", rowClass(active))}
            style={{ paddingLeft: depth * 12 + 12 }}
            data-media-folder-id={node.id}
            data-media-folder-name={node.name}
            data-media-folder-parent-id={node.parentId ?? undefined}
            aria-current={active ? "true" : undefined}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-pressed={active}
              onClick={() => onSelectFolder(node.id)}
            >
              <span className="truncate">{node.name}</span>
            </button>
            <span className="flex items-center gap-0.5">
              <span
                data-media-folder-actions
                className="hidden items-center gap-0.5 group-hover:inline-flex group-focus-within:inline-flex max-lg:inline-flex [@media(hover:none)]:inline-flex [@media(pointer:coarse)]:inline-flex"
              >
                <button
                  type="button"
                  aria-label={`Move ${node.name} up`}
                  className="rounded p-0.5 hover:bg-background/50"
                  disabled={pending || index === 0}
                  onClick={() => {
                    void moveWithinSiblings(siblings, index, -1);
                  }}
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${node.name} down`}
                  className="rounded p-0.5 hover:bg-background/50"
                  disabled={pending || index === siblings.length - 1}
                  onClick={() => {
                    void moveWithinSiblings(siblings, index, 1);
                  }}
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Rename ${node.name}`}
                  className="rounded p-0.5 hover:bg-background/50"
                  onClick={() => openRenameForm(node.id, node.name)}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${node.name}`}
                  className="rounded p-0.5 text-destructive hover:bg-background/50"
                  disabled={pending}
                  onClick={() => {
                    if (
                      typeof window === "undefined" ||
                      window.confirm(`Delete folder "${node.name}"? Its media will be unfiled.`)
                    ) {
                      void onDeleteFolder(node.id, node.name);
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
      aria-busy={pending}
      data-media-folder-rail
      data-active-folder-id={activeFolderId ?? ""}
    >
      {folderError && retryName ? (
        <div
          role="alert"
          aria-live="polite"
          className="mb-2 flex w-full min-w-0 max-w-full flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          data-folder-error-token={folderError.token}
          data-folder-error-kind={folderError.kind}
        >
          <span className="min-w-0 max-w-full break-words" data-folder-error-message>
            {folderError.message}
          </span>
          <button
            type="button"
            className="min-w-0 max-w-full self-start break-words rounded-md border border-destructive/40 px-2 py-1 text-left font-medium hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            data-folder-retry-token={folderError.token}
            data-folder-retry-kind={folderError.kind}
            data-folder-retry-name={retryTargetName}
            data-folder-retry-target-id={retryTargetId}
            data-folder-retry-parent-id={retryParentId}
            data-folder-retry-form-generation={retryFormGeneration}
            onClick={() => {
              void retryVisibleError();
            }}
          >
            {retryName}
          </button>
        </div>
      ) : null}

      {TYPE_DEFS.map((def) => {
        const active = activeFolderId === null && activeType === def.value;
        const Icon = def.icon;
        return (
          <button
            key={def.value}
            type="button"
            aria-pressed={active}
            className={rowClass(active)}
            disabled={pending}
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
          onClick={openCreateForm}
        >
          <FolderPlus className="size-3.5" />
          New
        </button>
      </div>

      {createForm ? (
        <form
          className="flex w-full items-center gap-1 px-1"
          data-folder-form-kind="create"
          data-folder-form-generation={createForm.generation}
          data-folder-form-parent-id={createForm.parentId ?? ""}
          onSubmit={(event) => {
            void submitCreate(event);
          }}
        >
          <Input
            ref={createInputRef}
            autoFocus
            value={newName}
            aria-label="New folder name"
            placeholder="Folder name"
            onChange={(event) => {
              const value = event.target.value;
              setNewName(value);
              if (createFormRef.current) {
                createFormRef.current = { ...createFormRef.current, draft: value };
              }
            }}
            className="h-8"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            aria-label="Create folder"
            disabled={pending}
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Cancel create folder"
            onClick={closeCreateForm}
          >
            <X className="size-4" />
          </Button>
        </form>
      ) : null}

      {folderTree.length === 0 && !createForm ? (
        <p className="px-3 py-1 text-xs text-muted-foreground">No folders yet.</p>
      ) : null}

      {folderTree.map((node, index) => renderFolder(node, 0, folderTree, index))}
    </nav>
  );
}
