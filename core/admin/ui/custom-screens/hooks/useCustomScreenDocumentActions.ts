import type {
  CustomScreenDefinition,
  ScreenBlockV1,
  ScreenFieldBinding,
} from "../../../../services/customScreens/customScreenSchemas";
import {
  addScreenBlockAt,
  addScreenSection,
  createScreenBlock,
  duplicateScreenBlockWithBindings,
  findScreenBlockById,
  findScreenBlockLocation,
  moveScreenBlock,
  moveScreenBlockTo,
  moveScreenSection,
  removeScreenBindingsForBlockTree,
  removeScreenBlock,
  removeScreenSection,
  renameScreenSection,
  updateScreenBlock,
  updateScreenSection,
  type ScreenBlockKind,
  type ScreenInsertTarget,
  type ScreenSectionPatch,
} from "../../../../services/customScreens/screenDocumentOps";
import type { ContentField } from "../../content-types/SchemaBuilder";
import { createScreenFieldBinding } from "../screenBlockInspectorModel";
import {
  findScreenEditorBlockSectionId,
  resolveScreenEditorInitialSelection,
  resolveScreenEditorSiblingList,
  type ScreenBindingOrphans,
} from "../customScreenEditorModel";

type MutableValue<T> = { current: T };

export type CustomScreenDocumentActionsInput = {
  definitionRef: MutableValue<CustomScreenDefinition>;
  contentFields: ContentField[];
  selectedId: string | null;
  selectedSectionId: string | null;
  insertPoint: ScreenInsertTarget | null;
  updateDefinition: (next: CustomScreenDefinition) => boolean;
  setSelectedId: (id: string | null) => void;
  setSelectedSectionId: (id: string | null) => void;
  setInsertPoint: (target: ScreenInsertTarget | null) => void;
};

export function useCustomScreenDocumentActions({
  definitionRef,
  contentFields,
  selectedId,
  selectedSectionId,
  insertPoint,
  updateDefinition,
  setSelectedId,
  setSelectedSectionId,
  setInsertPoint,
}: CustomScreenDocumentActionsInput) {
  const updateEditorView = (next: {
    document?: CustomScreenDefinition["editorView"]["document"];
    bindings?: ScreenFieldBinding[];
  }) => {
    const current = definitionRef.current;
    const document = next.document ?? current.editorView.document;
    const bindings = next.bindings ?? current.editorView.bindings;
    if (document === current.editorView.document && bindings === current.editorView.bindings) {
      return false;
    }
    return updateDefinition({
      ...current,
      editorView: {
        ...current.editorView,
        document,
        bindings,
      },
    });
  };

  const handleSelectBlock = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSelectedSectionId(
        findScreenEditorBlockSectionId(definitionRef.current.editorView.document, id)
      );
    }
  };

  const resolveInsertTarget = (
    document: CustomScreenDefinition["editorView"]["document"]
  ): ScreenInsertTarget => {
    if (insertPoint) return insertPoint;
    const selected = findScreenBlockById(document, selectedId);
    if (selected?.slots) {
      const slotId =
        selected.type === "field-group"
          ? "content"
          : selected.type === "columns"
            ? "left"
            : Object.keys(selected.slots)[0];
      if (slotId) {
        const location = findScreenBlockLocation(document, selected.id);
        return {
          kind: "slot-end",
          sectionId: location?.sectionId ?? selectedSectionId ?? "",
          parentId: selected.id,
          slotId,
        };
      }
    }
    return {
      kind: "section-end",
      sectionId: selectedSectionId ?? document.sections[0]?.id ?? "",
    };
  };

  const handleAddBlock = (type: ScreenBlockKind, field?: ContentField) => {
    const current = definitionRef.current;
    const created = createScreenBlock({
      type,
      field: field?.name,
      label: field?.label,
      relationTarget: field?.relation?.target,
    });
    const target = resolveInsertTarget(current.editorView.document);
    const nextDocument = addScreenBlockAt(current.editorView.document, created.block, target);
    updateEditorView({
      document: nextDocument,
      bindings: [...current.editorView.bindings, ...created.bindings],
    });
    setSelectedId(created.block.id);
    setSelectedSectionId(findScreenEditorBlockSectionId(nextDocument, created.block.id));
    setInsertPoint(null);
  };

  const handleDragMove = (blockId: string, target: ScreenInsertTarget) => {
    const current = definitionRef.current;
    const nextDocument = moveScreenBlockTo(current.editorView.document, blockId, target);
    if (nextDocument === current.editorView.document) return;
    updateEditorView({ document: nextDocument });
    setSelectedId(blockId);
    setSelectedSectionId(findScreenEditorBlockSectionId(nextDocument, blockId));
    setInsertPoint(null);
  };

  const handleAddSection = () => {
    const current = definitionRef.current;
    const selectedIndex = current.editorView.document.sections.findIndex(
      (section) => section.id === selectedSectionId
    );
    const atIndex = selectedIndex >= 0 ? selectedIndex + 1 : undefined;
    const { document, sectionId } = addScreenSection(current.editorView.document, { atIndex });
    updateEditorView({ document });
    setSelectedId(null);
    setSelectedSectionId(sectionId);
  };

  const handleRenameSection = (sectionId: string, label: string) => {
    const document = definitionRef.current.editorView.document;
    const section = document.sections.find((item) => item.id === sectionId);
    if (!section) return;
    const clean = label.trim() || "Section";
    if (section.label === clean && section.data.title === clean) return;
    updateEditorView({ document: renameScreenSection(document, sectionId, clean) });
  };

  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    const current = definitionRef.current.editorView.document;
    const nextDocument = moveScreenSection(current, sectionId, direction);
    if (nextDocument === current) return;
    updateEditorView({ document: nextDocument });
  };

  const handleDeleteSection = (sectionId: string) => {
    const current = definitionRef.current;
    const { document, removed } = removeScreenSection(current.editorView.document, sectionId);
    if (!removed) return;
    let bindings = current.editorView.bindings;
    removed.blocks.forEach((block) => {
      bindings = removeScreenBindingsForBlockTree(bindings, block);
    });
    updateEditorView({ document, bindings });
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(document.sections[0]?.id ?? null);
    }
    if (selectedId && !findScreenBlockById(document, selectedId)) setSelectedId(null);
  };

  const handleSelectSection = (sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setSelectedId(null);
  };

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    const current = definitionRef.current;
    const location = findScreenBlockLocation(current.editorView.document, blockId);
    const siblings = location
      ? resolveScreenEditorSiblingList(current.editorView.document, location)
      : null;
    if (!location || !siblings) return;
    if (direction === "up" && location.index === 0) return;
    if (direction === "down" && location.index === siblings.length - 1) return;
    updateEditorView({
      document: moveScreenBlock(current.editorView.document, blockId, direction),
    });
  };

  const handleDuplicateBlock = (blockId: string) => {
    const current = definitionRef.current;
    const result = duplicateScreenBlockWithBindings(
      current.editorView.document,
      current.editorView.bindings,
      blockId
    );
    updateEditorView({ document: result.document, bindings: result.bindings });
    if (result.duplicatedBlockId) {
      setSelectedId(result.duplicatedBlockId);
      setSelectedSectionId(
        findScreenEditorBlockSectionId(result.document, result.duplicatedBlockId)
      );
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    const current = definitionRef.current;
    const result = removeScreenBlock(current.editorView.document, blockId);
    if (!result.removed) return;
    updateEditorView({
      document: result.document,
      bindings: removeScreenBindingsForBlockTree(current.editorView.bindings, result.removed),
    });
    if (selectedId && !findScreenBlockById(result.document, selectedId)) {
      const nextSelection = resolveScreenEditorInitialSelection(result.document);
      setSelectedId(nextSelection.blockId);
      setSelectedSectionId(nextSelection.sectionId);
    }
  };

  const handlePatchBlock = (blockId: string, patch: Partial<ScreenBlockV1>) => {
    const current = definitionRef.current;
    updateEditorView({
      document: updateScreenBlock(current.editorView.document, blockId, patch),
    });
  };

  const handlePatchSection = (sectionId: string, patch: ScreenSectionPatch) => {
    const current = definitionRef.current;
    updateEditorView({
      document: updateScreenSection(current.editorView.document, sectionId, patch),
    });
  };

  const handlePatchBlockData = (blockId: string, patch: Record<string, unknown>) => {
    const current = definitionRef.current;
    updateEditorView({
      document: updateScreenBlock(current.editorView.document, blockId, (block) => ({
        ...block,
        data: { ...block.data, ...patch },
      })),
    });
  };

  const handlePatchBinding = (
    blockId: string,
    propPath: string,
    patch: Partial<Pick<ScreenFieldBinding, "field" | "mode">>
  ) => {
    const current = definitionRef.current;
    if (patch.field === "") {
      const nextBindings = current.editorView.bindings.filter(
        (binding) => !(binding.blockId === blockId && binding.propPath === propPath)
      );
      if (nextBindings.length === current.editorView.bindings.length) return;
      updateEditorView({ bindings: nextBindings });
      return;
    }
    const existing = current.editorView.bindings.find(
      (binding) => binding.blockId === blockId && binding.propPath === propPath
    );
    const fieldName = patch.field ?? existing?.field ?? "title";
    const nextBinding = existing
      ? { ...existing, ...patch }
      : createScreenFieldBinding({ blockId, propPath, field: fieldName, mode: patch.mode });
    const nextBindings = existing
      ? current.editorView.bindings.map((binding) =>
          binding.id === existing.id ? nextBinding : binding
        )
      : [...current.editorView.bindings, nextBinding];
    const matchingField = contentFields.find((field) => field.name === fieldName);
    const selectedBlock = findScreenBlockById(current.editorView.document, blockId);
    const documentNeedsFieldUpdate =
      propPath === "value" &&
      Boolean(
        selectedBlock &&
        (selectedBlock.data.field !== fieldName ||
          (matchingField && selectedBlock.data.label !== matchingField.label))
      );
    if (
      existing &&
      existing.field === nextBinding.field &&
      existing.mode === nextBinding.mode &&
      !documentNeedsFieldUpdate
    ) {
      return;
    }
    const nextDocument = documentNeedsFieldUpdate
      ? updateScreenBlock(current.editorView.document, blockId, (block) => ({
          ...block,
          data: {
            ...block.data,
            field: fieldName,
            ...(matchingField ? { label: matchingField.label } : {}),
          },
        }))
      : current.editorView.document;
    updateEditorView({ document: nextDocument, bindings: nextBindings });
  };

  const handleRemoveOrphanBindings = (bindingOrphans: ScreenBindingOrphans) => {
    const current = definitionRef.current;
    const orphanIds = new Set(
      [...bindingOrphans.blockOrphans, ...bindingOrphans.fieldOrphans].map((binding) => binding.id)
    );
    if (orphanIds.size === 0) return;
    updateEditorView({
      bindings: current.editorView.bindings.filter((binding) => !orphanIds.has(binding.id)),
    });
  };

  return {
    handleSelectBlock,
    handleAddBlock,
    handleDragMove,
    handleAddSection,
    handleRenameSection,
    handleMoveSection,
    handleDeleteSection,
    handleSelectSection,
    handleMoveBlock,
    handleDuplicateBlock,
    handleDeleteBlock,
    handlePatchBlock,
    handlePatchSection,
    handlePatchBlockData,
    handlePatchBinding,
    handleRemoveOrphanBindings,
  };
}
