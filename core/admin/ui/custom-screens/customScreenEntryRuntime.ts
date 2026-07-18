import {
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
  type CustomScreenEditorViewDefinitionV4,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  findScreenBlockById,
  getFirstScreenBlockId,
} from "../../../services/customScreens/screenDocumentOps";

export type ScreenDefinitionCarrier = Readonly<{
  definition?: unknown;
  schemaVersion?: unknown;
  blocks?: unknown;
  bindings?: unknown;
}>;

export type RouteVisit = Readonly<{ routeKey: string }>;
export type RouteMessageCommit = { routeVisit: RouteVisit; message: string };
export type PresentationErrorCommit = RouteMessageCommit & { kind: "load" | "save" };

export const emptyScreenDocument: ScreenDocumentV1 = {
  schemaVersion: 1,
  sections: [],
};
export const emptyFieldValues: Record<string, unknown> = {};

export const emptyEditorView: CustomScreenEditorViewDefinitionV4 = {
  document: emptyScreenDocument,
  bindings: [],
  saveMode: "entry",
  interactionMode: "inline",
};

export const resolveRuntimeDefinition = (screen: ScreenDefinitionCarrier): CustomScreenDefinition =>
  normalizeCustomScreenDefinitionForRead({
    definition: screen.definition,
    schemaVersion: screen.schemaVersion,
    blocks: screen.blocks,
    bindings: screen.bindings,
  });

export const resolveRuntimeEditorView = (screen: ScreenDefinitionCarrier) =>
  resolveRuntimeDefinition(screen).editorView;

export const resolveRuntimeDocument = (screen: ScreenDefinitionCarrier | null) =>
  screen ? resolveRuntimeDefinition(screen).editorView.document : emptyScreenDocument;

export const resolveRuntimeBindings = (
  screen: ScreenDefinitionCarrier | null
): ScreenFieldBinding[] => (screen ? resolveRuntimeDefinition(screen).editorView.bindings : []);

export const preserveSelectedElementAcrossRefresh = (input: {
  selectedBlockId: string | null;
  nextDocument: ScreenDocumentV1;
}) => {
  if (!input.selectedBlockId) return getFirstScreenBlockId(input.nextDocument);
  return findScreenBlockById(input.nextDocument, input.selectedBlockId)
    ? input.selectedBlockId
    : getFirstScreenBlockId(input.nextDocument);
};
