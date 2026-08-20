import { useMemo } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AuthoringLayersPanel,
  isAuthoringBlockSelection,
  isAuthoringSectionSelection,
  type AuthoringLayerNode,
  type AuthoringSelectionTarget,
} from "@/ui/authoring";
import { getBlockDisplayLabel } from "@/ui/pages/editor/pageEditorLabels";
import { blockOptions, sectionOptions } from "@/ui/pages/editor/pageEditorOptions";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockSlotKey,
  type PageBlockType,
  type PageBlockV2,
  type PageSectionType,
  type PageSectionV2,
} from "../../../services/pages/pageDocumentV2";
import {
  deletePageBlockAtPath,
  duplicatePageBlockAtPath,
  duplicatePageBlockTreeWithNewIds,
  getPageBlockAtPath,
  getPageBlockSiblingMoveTarget,
  insertPageBlockAtTarget,
  movePageBlockToTarget,
  type PageBlockPath,
  type PageBlockPathSegment,
} from "../../../services/pages/pageBlockPaths";
import { getPageSectionFallbackVariant } from "../../../services/pages/pageSectionTemplates";
import { LegacyWidgetPlaceholder } from "../../../services/pages/legacyWidgetPlaceholder";
import { PageBlockContent, PageSectionContent } from "../../../services/pages/pageRendererV2";
import type { PageLayoutSettings } from "../../../services/pages/layoutSettings";

export type DetailTemplateCanvasProps = {
  sections: PageSectionV2[];
  layout?: PageLayoutSettings;
  selection: AuthoringSelectionTarget | null;
  onSelect: (target: AuthoringSelectionTarget) => void;
  onChange: (next: PageSectionV2[]) => void;
};

const spacingTokenToPaddingTopClassMap: Record<string, string> = {
  none: "pt-0",
  xs: "pt-2",
  sm: "pt-4",
  md: "pt-6",
  lg: "pt-8",
  xl: "pt-12",
  "2xl": "pt-16",
};

const spacingTokenToPaddingBottomClassMap: Record<string, string> = {
  none: "pb-0",
  xs: "pb-2",
  sm: "pb-4",
  md: "pb-6",
  lg: "pb-8",
  xl: "pb-12",
  "2xl": "pb-16",
};

const pageContainerClassMap: Record<string, string> = {
  default: "mx-auto w-full max-w-6xl",
  narrow: "mx-auto w-full max-w-4xl",
  full: "w-full",
};

const pageMaxWidthClassMap: Record<string, string> = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const findBlockPathInSlot = (
  list: readonly PageBlockV2[],
  blockId: string,
  slotKey: PageBlockSlotKey,
  ownerPath: readonly PageBlockPathSegment[]
): PageBlockPath | null => {
  for (let index = 0; index < list.length; index += 1) {
    const block = list[index]!;
    const segments = [...ownerPath, { slotKey, index }];
    if (block.id === blockId) return segments as unknown as PageBlockPath;
    for (const [childSlotKey, children] of Object.entries(block.slots ?? {})) {
      const child = findBlockPathInSlot(
        children ?? [],
        blockId,
        childSlotKey as PageBlockSlotKey,
        segments
      );
      if (child) return child;
    }
  }
  return null;
};

export const findDetailTemplateBlockPath = (
  section: PageSectionV2,
  blockId: string
): PageBlockPath | null => {
  for (let index = 0; index < section.blocks.length; index += 1) {
    const block = section.blocks[index]!;
    const segments = [{ index }];
    if (block.id === blockId) return segments as unknown as PageBlockPath;
    for (const [slotKey, children] of Object.entries(block.slots ?? {})) {
      const child = findBlockPathInSlot(
        children ?? [],
        blockId,
        slotKey as PageBlockSlotKey,
        segments
      );
      if (child) return child;
    }
  }
  return null;
};

const toLayerBlockNodes = (
  sectionId: string,
  blocks: readonly PageBlockV2[]
): AuthoringLayerNode[] =>
  blocks.map((block) => ({
    id: block.id,
    label: getBlockDisplayLabel(block),
    kind: "block",
    type: block.type,
    target: { kind: "block", sectionId, id: block.id },
    children: Object.values(block.slots ?? {}).flatMap((children) =>
      toLayerBlockNodes(sectionId, children ?? [])
    ),
  }));

export function DetailTemplateCanvas({
  sections,
  layout,
  selection,
  onSelect,
  onChange,
}: DetailTemplateCanvasProps) {
  const layerNodes = useMemo<AuthoringLayerNode[]>(
    () =>
      sections.map((section) => ({
        id: section.id,
        label: section.name,
        kind: "section",
        type: section.type,
        target: { kind: "section", id: section.id },
        children: toLayerBlockNodes(section.id, section.blocks),
      })),
    [sections]
  );

  const updateSection = (sectionId: string, next: PageSectionV2) => {
    onChange(sections.map((section) => (section.id === sectionId ? next : section)));
  };

  const addSection = (type: PageSectionType) => {
    const heading = createPageBlockV2("heading", {
      props: { text: `${type.replace(/-/g, " ")} section`, level: "h2", align: "left" },
    });
    const section = createPageSectionV2(type, {
      variant: getPageSectionFallbackVariant(type),
      blocks: [heading],
    });
    onChange([...sections, section]);
    onSelect({ kind: "section", id: section.id });
  };

  const removeSection = (sectionId: string) => {
    const index = sections.findIndex((section) => section.id === sectionId);
    if (index === -1) return;
    const next = sections.filter((section) => section.id !== sectionId);
    onChange(next);
    const neighbor = sections[index + 1] ?? sections[index - 1];
    if (neighbor) onSelect({ kind: "section", id: neighbor.id });
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    const index = sections.findIndex((section) => section.id === sectionId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    onChange(next);
    onSelect({ kind: "section", id: moved.id });
  };

  const duplicateSection = (sectionId: string) => {
    const index = sections.findIndex((section) => section.id === sectionId);
    const source = sections[index];
    if (!source) return;
    const clone = JSON.parse(JSON.stringify(source)) as PageSectionV2;
    const copy = createPageSectionV2(clone.type, {
      name: clone.name,
      variant: clone.variant,
      layout: clone.layout,
      style: clone.style,
      spacing: clone.spacing,
      visibility: clone.visibility,
      responsive: clone.responsive,
      blocks: clone.blocks.map(duplicatePageBlockTreeWithNewIds),
    });
    const next = [...sections];
    next.splice(index + 1, 0, copy);
    onChange(next);
    onSelect({ kind: "section", id: copy.id });
  };

  const addBlock = (sectionId: string, type: PageBlockType) => {
    const block = createPageBlockV2(type);
    const section = sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const result = insertPageBlockAtTarget(
      section,
      { listPath: {}, index: section.blocks.length },
      block
    );
    if (result.status !== "ok") return;
    updateSection(sectionId, result.section);
    onSelect({ kind: "block", sectionId, id: block.id });
  };

  const removeBlock = (sectionId: string, blockId: string) => {
    const section = sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const path = findDetailTemplateBlockPath(section, blockId);
    if (!path) return;
    const result = deletePageBlockAtPath(section, path);
    if (result.status !== "ok") return;
    updateSection(sectionId, result.section);
    if (
      isAuthoringBlockSelection(selection) &&
      selection.sectionId === sectionId &&
      selection.id === blockId
    ) {
      const fallback = result.fallbackPath
        ? getPageBlockAtPath(result.section, result.fallbackPath)
        : null;
      if (fallback) onSelect({ kind: "block", sectionId, id: fallback.id });
      else onSelect({ kind: "section", id: sectionId });
    }
  };

  const moveBlock = (sectionId: string, blockId: string, direction: -1 | 1) => {
    const section = sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const path = findDetailTemplateBlockPath(section, blockId);
    if (!path) return;
    const target = getPageBlockSiblingMoveTarget(path, direction);
    if (!target) return;
    const result = movePageBlockToTarget(section, path, target);
    if (result.status !== "ok") return;
    updateSection(sectionId, result.section);
    if (result.path) {
      const moved = getPageBlockAtPath(result.section, result.path);
      if (moved) onSelect({ kind: "block", sectionId, id: moved.id });
    }
  };

  const duplicateBlock = (sectionId: string, blockId: string) => {
    const section = sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const path = findDetailTemplateBlockPath(section, blockId);
    if (!path) return;
    const result = duplicatePageBlockAtPath(section, path);
    if (result.status !== "ok") return;
    updateSection(sectionId, result.section);
    if (result.path) {
      const copy = getPageBlockAtPath(result.section, result.path);
      if (copy) onSelect({ kind: "block", sectionId, id: copy.id });
    }
  };

  const wrapperPaddingClass = layout
    ? joinClasses(
        spacingTokenToPaddingTopClassMap[layout.wrapper.padding.top],
        spacingTokenToPaddingBottomClassMap[layout.wrapper.padding.bottom]
      )
    : "";
  const wrapperContainerClass = layout
    ? joinClasses(
        pageContainerClassMap[layout.wrapper.container],
        layout.wrapper.container !== "full" && layout.wrapper.maxWidth
          ? pageMaxWidthClassMap[layout.wrapper.maxWidth]
          : undefined
      )
    : "mx-auto w-full max-w-6xl";
  const wrapperBackgroundMedia = layout?.wrapper.background.media;
  const wrapperBackgroundImage =
    wrapperBackgroundMedia?.type === "image"
      ? (wrapperBackgroundMedia.src ?? layout?.wrapper.background.image ?? null)
      : null;
  const wrapperBackgroundVideo =
    wrapperBackgroundMedia?.type === "video" ? wrapperBackgroundMedia.src : null;
  const wrapperBackgroundStyle = {
    backgroundColor: layout?.wrapper.background.color ?? "transparent",
    backgroundImage: wrapperBackgroundImage ? `url(${wrapperBackgroundImage})` : undefined,
    backgroundSize: wrapperBackgroundImage ? "cover" : undefined,
    backgroundPosition: wrapperBackgroundImage ? "center" : undefined,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="min-w-0">
        <AuthoringLayersPanel
          label="Layers"
          nodes={layerNodes}
          selection={selection}
          onSelect={onSelect}
        />
      </div>
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add section
          </span>
          {sectionOptions.map((option) => (
            <Button
              key={option.type}
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => addSection(option.type)}
              data-detail-template-add-section={option.type}
            >
              <Plus className="h-3.5 w-3.5" />
              {option.label}
            </Button>
          ))}
        </div>

        <div
          className={joinClasses(
            "relative w-full overflow-hidden rounded-xl border border-border/50 bg-background",
            wrapperPaddingClass
          )}
          style={wrapperBackgroundStyle}
        >
          {wrapperBackgroundVideo ? (
            <video
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              src={wrapperBackgroundVideo}
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
            />
          ) : null}
          <div
            className={joinClasses(
              wrapperContainerClass,
              wrapperBackgroundVideo ? "relative z-[1]" : undefined
            )}
          >
            {sections.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-sm text-muted-foreground">
                Empty detail template. Add a section to start.
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section) => (
                  <SectionFrame
                    key={section.id}
                    section={section}
                    selected={Boolean(
                      isAuthoringSectionSelection(selection) && selection.id === section.id
                    )}
                    onSelectSection={() => onSelect({ kind: "section", id: section.id })}
                    onMoveSection={(direction) => moveSection(section.id, direction)}
                    onDuplicateSection={() => duplicateSection(section.id)}
                    onRemoveSection={() => removeSection(section.id)}
                    onAddBlock={(type) => addBlock(section.id, type)}
                    onSelectBlock={(blockId) =>
                      onSelect({ kind: "block", sectionId: section.id, id: blockId })
                    }
                    onMoveBlock={(blockId, direction) => moveBlock(section.id, blockId, direction)}
                    onDuplicateBlock={(blockId) => duplicateBlock(section.id, blockId)}
                    onRemoveBlock={(blockId) => removeBlock(section.id, blockId)}
                    selectedBlockId={
                      isAuthoringBlockSelection(selection) && selection.sectionId === section.id
                        ? selection.id
                        : null
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const SectionFrame = ({
  section,
  selected,
  onSelectSection,
  onMoveSection,
  onDuplicateSection,
  onRemoveSection,
  onAddBlock,
  onSelectBlock,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  selectedBlockId,
}: {
  section: PageSectionV2;
  selected: boolean;
  onSelectSection: () => void;
  onMoveSection: (direction: -1 | 1) => void;
  onDuplicateSection: () => void;
  onRemoveSection: () => void;
  onAddBlock: (type: PageBlockType) => void;
  onSelectBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, direction: -1 | 1) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  selectedBlockId: string | null;
}) => {
  const visibilityBadges = [
    !section.visibility.visible ? "Hidden" : null,
    section.visibility.authOnly ? "Auth only" : null,
  ].filter((badge): badge is string => Boolean(badge));

  return (
    <div
      data-detail-template-section={section.id}
      data-detail-template-section-type={section.type}
      className={cn(
        "rounded-xl border bg-card/40 p-3 transition-colors",
        selected ? "border-primary/60 bg-primary/5" : "border-border/50"
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelectSection();
      }}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="truncate">{section.name}</span>
          <span className="uppercase text-muted-foreground">{section.type}</span>
          {section.variant !== "default" ? (
            <Badge variant="secondary">{section.variant}</Badge>
          ) : null}
          {visibilityBadges.map((badge) => (
            <Badge key={badge} variant="outline">
              {badge}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Move section ${section.name} up`}
            onClick={(event) => {
              event.stopPropagation();
              onMoveSection(-1);
            }}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Move section ${section.name} down`}
            onClick={(event) => {
              event.stopPropagation();
              onMoveSection(1);
            }}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Duplicate section ${section.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicateSection();
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Delete section ${section.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveSection();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <select
            aria-label={`Add block to section ${section.name}`}
            value=""
            onChange={(event) => {
              event.stopPropagation();
              const type = event.target.value as PageBlockType;
              if (type) onAddBlock(type);
            }}
            className="h-8 rounded-md border border-[var(--admin-input-border)] bg-[var(--admin-input-bg)] px-2 text-xs text-[var(--admin-input-text)] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--admin-input-ring)]/50"
            data-detail-template-add-block
          >
            <option value="">Add block…</option>
            {blockOptions.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {section.blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
            Empty section. Add a block.
          </div>
        ) : (
          section.blocks.map((block) => {
            const isLegacy = block.type === "legacy-widget";
            const blockSelected = selectedBlockId === block.id;
            return (
              <div
                key={block.id}
                data-detail-template-block={block.id}
                data-detail-template-block-type={block.type}
                className={cn(
                  "overflow-hidden rounded-lg border bg-card",
                  blockSelected ? "border-primary/70 ring-1 ring-primary/40" : "border-border/50"
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectBlock(block.id);
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
                    <span className="truncate font-medium">{getBlockDisplayLabel(block)}</span>
                    <span className="uppercase text-muted-foreground">{block.type}</span>
                    {isLegacy ? <Badge variant="outline">Legacy</Badge> : null}
                  </div>
                  {!isLegacy ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${getBlockDisplayLabel(block)} up`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onMoveBlock(block.id, -1);
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${getBlockDisplayLabel(block)} down`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onMoveBlock(block.id, 1);
                        }}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Duplicate ${getBlockDisplayLabel(block)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDuplicateBlock(block.id);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${getBlockDisplayLabel(block)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveBlock(block.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="border-t px-3 py-3">
                  {isLegacy ? (
                    <div className="space-y-2">
                      <LegacyWidgetPlaceholder block={block} />
                      <p className="text-xs text-muted-foreground" data-legacy-reauthor-note="true">
                        Re-author this block as a Page V2 block to edit it here. Mutation controls
                        are disabled for legacy widgets.
                      </p>
                    </div>
                  ) : (
                    <div
                      className="rounded border border-dashed border-border/60 bg-background p-3"
                      data-detail-template-block-preview="true"
                    >
                      <PageBlockContent block={block} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {section.blocks.length > 0 ? (
        <div className="mt-2 rounded-lg border border-border/40 bg-muted/20 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Section preview
          </p>
          <PageSectionContent section={section} layoutMode="runtime" includeHiddenBlocks />
        </div>
      ) : null}
    </div>
  );
};
