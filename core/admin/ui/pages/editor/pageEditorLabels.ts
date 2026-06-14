import type { PageBlockType, PageBlockV2 } from "../../../../services/pages/pageDocumentV2";

const primaryContentPropByBlockType: Partial<Record<PageBlockType, string>> = {
  heading: "text",
  text: "text",
  button: "label",
  image: "alt",
  video: "title",
  card: "title",
  form: "title",
  statistic: "value",
  icon: "label",
  quote: "text",
};

export const readEditorText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const getPrimaryBlockContent = (block: PageBlockV2 | undefined) => {
  if (!block) return "";
  const prop = primaryContentPropByBlockType[block.type];
  return prop ? readEditorText(block.props[prop]) : "";
};

export const getBlockDisplayLabel = (block: PageBlockV2) =>
  getPrimaryBlockContent(block) ||
  readEditorText(block.props.title) ||
  readEditorText(block.props.alt) ||
  block.type.replace(/-/g, " ");

export const formatSlotLabel = (slotKey: string) =>
  slotKey.startsWith("column:")
    ? `Column ${slotKey.replace("column:", "")}`
    : slotKey.replace(/-/g, " ").replace(/^./, (character) => character.toUpperCase());
