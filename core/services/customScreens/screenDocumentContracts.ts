import type { ScreenBlockV1, ScreenFieldBinding, ScreenSectionV1 } from "./customScreenContracts";

export type ScreenBlockKind =
  | "record-header"
  | "field"
  | "field-group"
  | "columns"
  | "rich-text"
  | "heading"
  | "text"
  | "stat"
  | "divider"
  | "image"
  | "related-list"
  | "tabs"
  | "button"
  | "legacy-widget";

export type ScreenBlockPatch = Partial<
  Pick<ScreenBlockV1, "label" | "variant" | "data" | "slots" | "children">
>;

export type ScreenSectionPatch = Partial<
  Pick<ScreenSectionV1, "label" | "data" | "layout" | "visibility" | "style">
>;

export type ScreenInsertTarget =
  | { kind: "section-end"; sectionId: string }
  | { kind: "section-index"; sectionId: string; index: number }
  | { kind: "slot-end"; sectionId: string; parentId: string; slotId: string }
  | { kind: "slot-index"; sectionId: string; parentId: string; slotId: string; index: number };

export type ScreenBlockLocation = {
  sectionId: string;
  parentId: string | null;
  slotId: string | null;
  index: number;
};

export type ScreenBindingReconcileResult = {
  bindings: ScreenFieldBinding[];
  removedBlockOrphans: string[];
};
