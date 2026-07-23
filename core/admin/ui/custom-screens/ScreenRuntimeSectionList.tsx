import { Fragment, type MouseEvent as ReactMouseEvent } from "react";
import { MoveDown, MoveUp, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { selectionBorder } from "@/ui/authoring";
import { screenSectionColumnTemplate } from "../../../services/customScreens/customScreenSchemas";
import type { ScreenInsertTarget } from "../../../services/customScreens/screenDocumentOps";
import { ScreenRuntimeInsertGap } from "./ScreenRuntimeBlockFrame";
import { ScreenRuntimeBlock } from "./ScreenRuntimeContainerBlocks";
import {
  createScreenRuntimeContext,
  isSelectionInteractiveOrigin,
  SCREEN_SECTION_COLUMN_GAP_DEFAULT,
  type ScreenRuntimeRendererProps,
} from "./screenRuntimeRendererModel";
import { useScreenRuntimeInteractions } from "./useScreenRuntimeInteractions";

export function ScreenRuntimeRenderer(props: ScreenRuntimeRendererProps) {
  const context = createScreenRuntimeContext(props);
  const [rendererRootRef, interactions] = useScreenRuntimeInteractions(context);
  const showEmptyMessage =
    context.mode === "builder"
      ? props.document.sections.length === 0
      : !props.document.sections.some((section) => section.blocks.length > 0);

  if (showEmptyMessage) {
    return (
      <div className="rounded-xl border border-dashed bg-background/40 px-8 py-16 text-center text-sm text-muted-foreground">
        {context.emptyMessage ?? "Add screen blocks to compose this view."}
      </div>
    );
  }

  return (
    <div ref={rendererRootRef} className="space-y-5">
      {props.document.sections.map((section) => {
        const selected = context.selectedSectionId === section.id;
        const isInteractive = context.mode === "builder" && Boolean(context.onSelectSection);
        const sectionEndTarget: ScreenInsertTarget = {
          kind: "section-end",
          sectionId: section.id,
        };
        const sectionDragHover =
          context.mode === "builder" && interactions.isDragHover(sectionEndTarget);
        const sectionColumns = section.style?.columns;
        const gridTemplate = sectionColumns
          ? screenSectionColumnTemplate[sectionColumns]
          : undefined;
        const gridded = gridTemplate !== undefined;
        const title =
          typeof section.data.title === "string" && section.data.title.trim()
            ? section.data.title.trim()
            : section.label || "Section";
        const selectSectionFromContainer = (event: ReactMouseEvent<HTMLElement>) => {
          event.stopPropagation();
          if (isSelectionInteractiveOrigin(event.target, event.currentTarget)) return;
          context.onSelectSection?.(section.id);
        };

        return (
          <section
            key={section.id}
            className={cn(
              "relative p-4 transition",
              isInteractive && "group/section",
              context.mode === "preview"
                ? "rounded-2xl border bg-background/80"
                : context.mode === "builder"
                  ? cn(
                      "bg-background/60",
                      selectionBorder({
                        level: "container",
                        selected,
                        interactive: isInteractive,
                      })
                    )
                  : cn(
                      "bg-transparent",
                      selectionBorder({
                        level: "container",
                        selected,
                        interactive: isInteractive,
                      })
                    )
            )}
            data-screen-section-id={section.id}
            data-screen-section-type={section.type}
            data-selected={selected ? "true" : "false"}
            onClick={isInteractive ? selectSectionFromContainer : undefined}
          >
            {isInteractive ? (
              <button
                type="button"
                aria-label={`Select ${title} section`}
                aria-pressed={selected}
                data-screen-select-section={section.id}
                className="absolute -left-3 top-3 z-20 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/section:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  context.onSelectSection?.(section.id);
                }}
              >
                Select
              </button>
            ) : null}
            {context.mode === "builder" ? (
              selected &&
              !context.selectedBlockId &&
              (context.onRenameSection || context.onMoveSection || context.onDeleteSection) ? (
                <div className="mb-3 flex items-center gap-1.5">
                  {context.onRenameSection ? (
                    <input
                      key={`${section.id}-${title}`}
                      type="text"
                      defaultValue={title}
                      aria-label="Rename section"
                      data-screen-section-rename="true"
                      className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === "Enter") {
                          event.preventDefault();
                          context.onRenameSection?.(section.id, event.currentTarget.value);
                        }
                      }}
                      onBlur={(event) =>
                        context.onRenameSection?.(section.id, event.currentTarget.value)
                      }
                    />
                  ) : (
                    <div className="min-w-0 flex-1 truncate text-xs font-semibold uppercase text-muted-foreground">
                      {title}
                    </div>
                  )}
                  <div className="flex shrink-0 items-center gap-0.5">
                    {context.onMoveSection ? (
                      <>
                        <button
                          type="button"
                          aria-label="Move section up"
                          data-screen-section-move-up="true"
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            context.onMoveSection?.(section.id, "up");
                          }}
                        >
                          <MoveUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move section down"
                          data-screen-section-move-down="true"
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            context.onMoveSection?.(section.id, "down");
                          }}
                        >
                          <MoveDown className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                    {context.onDeleteSection ? (
                      <button
                        type="button"
                        aria-label="Delete section"
                        data-screen-section-delete="true"
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          context.onDeleteSection?.(section.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                  {title}
                </div>
              )
            ) : null}
            <div
              className={cn(
                gridded ? "grid" : "space-y-4",
                sectionDragHover && "rounded-lg bg-primary/5 ring-1 ring-primary/50"
              )}
              style={
                gridded
                  ? {
                      gridTemplateColumns: gridTemplate,
                      gap: section.style?.columnGap ?? SCREEN_SECTION_COLUMN_GAP_DEFAULT,
                    }
                  : undefined
              }
              {...(context.mode === "builder"
                ? {
                    "data-screen-section-dropzone": section.id,
                    "data-drag-hover": sectionDragHover ? "true" : undefined,
                    ...interactions.dropHandlers(sectionEndTarget),
                  }
                : {})}
            >
              {section.blocks.length > 0 ? (
                context.mode === "builder" && interactions.canInsert ? (
                  <>
                    {section.blocks.map((block, index) => (
                      <Fragment key={block.id}>
                        {!gridded || index === 0 ? (
                          <ScreenRuntimeInsertGap
                            target={{
                              kind: "section-index",
                              sectionId: section.id,
                              index,
                            }}
                            context={context}
                            interactions={interactions}
                            fullRow={gridded}
                          />
                        ) : null}
                        <ScreenRuntimeBlock
                          block={block}
                          blockContext={{
                            sectionId: section.id,
                            suppressed: false,
                            dropTargets: {
                              before: {
                                kind: "section-index",
                                sectionId: section.id,
                                index,
                              },
                              after: {
                                kind: "section-index",
                                sectionId: section.id,
                                index: index + 1,
                              },
                            },
                          }}
                          context={context}
                          interactions={interactions}
                        />
                      </Fragment>
                    ))}
                    <ScreenRuntimeInsertGap
                      target={{
                        kind: "section-index",
                        sectionId: section.id,
                        index: section.blocks.length,
                      }}
                      context={context}
                      interactions={interactions}
                      fullRow={gridded}
                    />
                  </>
                ) : (
                  section.blocks.map((block) => (
                    <ScreenRuntimeBlock
                      key={block.id}
                      block={block}
                      blockContext={{ sectionId: section.id, suppressed: false }}
                      context={context}
                      interactions={interactions}
                    />
                  ))
                )
              ) : (
                <div
                  className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground"
                  style={gridded ? { gridColumn: "1 / -1" } : undefined}
                >
                  Empty section
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
