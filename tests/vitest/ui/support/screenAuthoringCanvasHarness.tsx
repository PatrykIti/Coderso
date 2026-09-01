// TASK-105-08-04: stateful ScreenAuthoringCanvas harness for Vitest. The canvas
// is fully controlled — the host owns document, selection, and panel state, and
// the head/cluster/renderer reflect those props. This harness mirrors the
// CustomScreenEditorPage host contract so interaction tests can drive
// selections, panel switches, and canvas clicks against real seams.

import React from "react";
import { createRoot } from "react-dom/client";

import type { ContentField } from "../../../../core/admin/ui/content-types/SchemaBuilder";
import { ScreenAuthoringCanvas } from "../../../../core/admin/ui/custom-screens/ScreenAuthoringCanvas";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../../core/services/customScreens/customScreenContracts";
import type { ScreenInsertTarget } from "../../../../core/services/customScreens/screenDocumentOps";

export type CanvasMountOptions = Readonly<{
  document: ScreenDocumentV1;
  bindings?: ScreenFieldBinding[];
  fields?: ContentField[];
  values?: Record<string, unknown>;
  previewNotice?: React.ReactNode;
  settingsPanel?: React.ReactNode;
  panelOpen?: boolean;
  initialSelectedSectionId?: string | null;
  initialSelectedBlockId?: string | null;
  insertPoint?: ScreenInsertTarget | null;
}>;

const noop = () => undefined;

type HostHandlers = Readonly<{
  onAddSection: () => void;
  onRenameSection: (sectionId: string, label: string) => void;
  onMoveSection: (sectionId: string, direction: "up" | "down") => void;
  onDeleteSection: (sectionId: string) => void;
  onAddBlock: (type: string, field?: ContentField) => void;
  onSetInsertPoint: (target: ScreenInsertTarget | null) => void;
  onDragMove: (blockId: string, target: ScreenInsertTarget) => void;
  onPatchBlock: (blockId: string, patch: Partial<ScreenBlockV1>) => void;
  onPatchBlockData: (blockId: string, patch: Record<string, unknown>) => void;
  onPatchSection: (sectionId: string, patch: unknown) => void;
  onPatchBinding: (
    blockId: string,
    propPath: string,
    patch: Partial<Pick<ScreenFieldBinding, "field" | "mode">>
  ) => void;
  onMove: (blockId: string, direction: "up" | "down") => void;
  onDuplicate: (blockId: string) => void;
  onDelete: (blockId: string) => void;
}>;

type CanvasHarnessState = {
  document: ScreenDocumentV1;
  selectedSectionId: string | null;
  selectedBlockId: string | null;
  panelOpen: boolean;
  insertPoint: ScreenInsertTarget | null;
};

class StatefulCanvasHarness extends React.Component<
  CanvasMountOptions & { handlers: HostHandlers },
  CanvasHarnessState
> {
  state: CanvasHarnessState = {
    document: this.props.document,
    selectedSectionId: this.props.initialSelectedSectionId ?? null,
    selectedBlockId: this.props.initialSelectedBlockId ?? null,
    panelOpen: this.props.panelOpen ?? true,
    insertPoint: this.props.insertPoint ?? null,
  };

  selectSection = (sectionId: string | null) => this.setState({ selectedSectionId: sectionId });
  selectBlock = (blockId: string | null) => this.setState({ selectedBlockId: blockId });

  render() {
    const { handlers, ...mountProps } = this.props;
    return (
      <ScreenAuthoringCanvas
        document={this.state.document}
        bindings={mountProps.bindings ?? []}
        fields={mountProps.fields ?? []}
        values={mountProps.values ?? {}}
        previewNotice={mountProps.previewNotice}
        settingsPanel={mountProps.settingsPanel}
        panelOpen={this.state.panelOpen}
        onPanelOpenChange={(open) => this.setState({ panelOpen: open })}
        selectedSectionId={this.state.selectedSectionId}
        selectedBlockId={this.state.selectedBlockId}
        onSelectSection={this.selectSection}
        onSelectBlock={this.selectBlock}
        onAddSection={handlers.onAddSection}
        onRenameSection={handlers.onRenameSection}
        onMoveSection={handlers.onMoveSection}
        onDeleteSection={handlers.onDeleteSection}
        onAddBlock={handlers.onAddBlock}
        insertPoint={this.state.insertPoint}
        onSetInsertPoint={handlers.onSetInsertPoint}
        onDragMove={handlers.onDragMove}
        onPatchBlock={handlers.onPatchBlock}
        onPatchBlockData={handlers.onPatchBlockData}
        onPatchSection={handlers.onPatchSection}
        onPatchBinding={handlers.onPatchBinding}
        onMove={handlers.onMove}
        onDuplicate={handlers.onDuplicate}
        onDelete={handlers.onDelete}
      />
    );
  }
}

export const mountScreenAuthoringCanvas = (
  options: CanvasMountOptions,
  handlers: Partial<HostHandlers> = {}
) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const controller = React.createRef<StatefulCanvasHarness>();
  const boundHandlers: HostHandlers = {
    onAddSection: handlers.onAddSection ?? noop,
    onRenameSection: handlers.onRenameSection ?? noop,
    onMoveSection: handlers.onMoveSection ?? noop,
    onDeleteSection: handlers.onDeleteSection ?? noop,
    onAddBlock: handlers.onAddBlock ?? noop,
    onSetInsertPoint: handlers.onSetInsertPoint ?? noop,
    onDragMove: handlers.onDragMove ?? noop,
    onPatchBlock: handlers.onPatchBlock ?? noop,
    onPatchBlockData: handlers.onPatchBlockData ?? noop,
    onPatchSection: handlers.onPatchSection ?? noop,
    onPatchBinding: handlers.onPatchBinding ?? noop,
    onMove: handlers.onMove ?? noop,
    onDuplicate: handlers.onDuplicate ?? noop,
    onDelete: handlers.onDelete ?? noop,
  };

  React.act(() => {
    root.render(<StatefulCanvasHarness ref={controller} {...options} handlers={boundHandlers} />);
  });

  return {
    container,
    controller,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

export const clickBySelector = (container: ParentNode, selector: string): HTMLElement | null => {
  const target = container.querySelector(selector) as HTMLElement | null;
  if (!target) return null;
  React.act(() => {
    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return target;
};

export const clickByAccessibleName = (
  container: ParentNode,
  accessibleName: string
): HTMLElement | null => {
  const target = Array.from(container.querySelectorAll("button")).find(
    (candidate) =>
      candidate.getAttribute("aria-label") === accessibleName ||
      candidate.textContent?.trim() === accessibleName
  ) as HTMLElement | undefined;
  if (!target) return null;
  React.act(() => {
    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return target;
};
