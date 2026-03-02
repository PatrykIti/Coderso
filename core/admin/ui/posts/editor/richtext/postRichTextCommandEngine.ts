import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import {
  postRichTextAlignmentSet,
  postRichTextBlockTagSet,
  type PostRichTextAlignment,
} from "../../../../../services/posts/editor/postRichTextSchema";

import type {
  PostRichTextCommand,
  PostRichTextToolbarProfile,
} from "./PostRichTextToolbar";

const BLOCK_FORMAT_COMMAND_TAG: Partial<Record<PostRichTextCommand, PostRichTextBlockTag>> = {
  paragraph: "p",
  "heading-1": "h1",
  "heading-2": "h2",
  "heading-3": "h3",
  "heading-4": "h4",
  "heading-5": "h5",
  "heading-6": "h6",
  quote: "blockquote",
  "code-block": "pre",
};

const LIST_COMMAND_TAG: Partial<Record<PostRichTextCommand, "ul" | "ol">> = {
  "bullet-list": "ul",
  "ordered-list": "ol",
};

const ALIGNMENT_COMMAND_VALUE: Partial<Record<PostRichTextCommand, PostRichTextAlignment>> = {
  "align-left": "left",
  "align-center": "center",
  "align-right": "right",
};

const blockTagRegex = /<(p|h[1-6]|ul|ol|blockquote|pre)\b/i;

export type PostRichTextBlockTag =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "blockquote"
  | "pre"
  | "ul"
  | "ol";

export type PostRichTextCommandKind =
  | "native-inline"
  | "inline-wrapper"
  | "link"
  | "block-format"
  | "list-format"
  | "alignment"
  | "clear-formatting";

const postRichTextBlockTagValues = Array.from(postRichTextBlockTagSet) as PostRichTextBlockTag[];
const postRichTextBlockTagSetTyped = new Set<PostRichTextBlockTag>(postRichTextBlockTagValues);

const isListTag = (tagName: string) => tagName === "ul" || tagName === "ol";

const asBlockTag = (value: string | undefined | null): PostRichTextBlockTag | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return postRichTextBlockTagSetTyped.has(normalized as PostRichTextBlockTag)
    ? (normalized as PostRichTextBlockTag)
    : null;
};

const getElementTag = (element: HTMLElement): PostRichTextBlockTag | null =>
  asBlockTag(element.tagName);

const copyElementAttributes = (source: HTMLElement, target: HTMLElement) => {
  for (const attribute of Array.from(source.attributes)) {
    target.setAttribute(attribute.name, attribute.value);
  }
};

const createTagReplacement = (element: HTMLElement, targetTag: PostRichTextBlockTag) => {
  const ownerDocument = element.ownerDocument;
  const replacement = ownerDocument.createElement(targetTag);
  copyElementAttributes(element, replacement);
  replacement.innerHTML = element.innerHTML;
  element.replaceWith(replacement);
  return replacement;
};

const convertListToSingleBlock = (listElement: HTMLElement, targetTag: PostRichTextBlockTag) => {
  const replacement = listElement.ownerDocument.createElement(targetTag);
  copyElementAttributes(listElement, replacement);
  const listItems = Array.from(listElement.children).filter(
    (item): item is HTMLElement => item instanceof HTMLElement && item.tagName.toLowerCase() === "li"
  );
  const html = listItems.map((item) => item.innerHTML.trim()).filter(Boolean).join("<br>");
  replacement.innerHTML = html || "<br>";
  listElement.replaceWith(replacement);
  return replacement;
};

const unwrapListToParagraphs = (listElement: HTMLElement) => {
  const ownerDocument = listElement.ownerDocument;
  const fragment = ownerDocument.createDocumentFragment();
  const inheritedAlign = listElement.getAttribute("data-align");
  const listItems = Array.from(listElement.children).filter(
    (item): item is HTMLElement => item instanceof HTMLElement && item.tagName.toLowerCase() === "li"
  );

  if (listItems.length === 0) {
    const paragraph = ownerDocument.createElement("p");
    if (inheritedAlign && postRichTextAlignmentSet.has(inheritedAlign)) {
      paragraph.setAttribute("data-align", inheritedAlign);
    }
    paragraph.innerHTML = "<br>";
    fragment.appendChild(paragraph);
  } else {
    for (const item of listItems) {
      const paragraph = ownerDocument.createElement("p");
      if (inheritedAlign && postRichTextAlignmentSet.has(inheritedAlign)) {
        paragraph.setAttribute("data-align", inheritedAlign);
      }
      paragraph.innerHTML = item.innerHTML.trim() || "<br>";
      fragment.appendChild(paragraph);
    }
  }

  listElement.replaceWith(fragment);
};

const wrapBlocksAsList = (blocks: readonly HTMLElement[], targetListTag: "ul" | "ol") => {
  if (blocks.length === 0) return false;
  const firstBlock = blocks[0];
  if (!firstBlock) return false;

  const ownerDocument = firstBlock.ownerDocument;
  const nextList = ownerDocument.createElement(targetListTag);
  const inheritedAlign =
    blocks.find((block) => {
      const align = block.getAttribute("data-align");
      return typeof align === "string" && postRichTextAlignmentSet.has(align);
    })?.getAttribute("data-align") ?? null;

  if (inheritedAlign) {
    nextList.setAttribute("data-align", inheritedAlign);
  }

  for (const block of blocks) {
    const tag = getElementTag(block);
    if (tag === "ul" || tag === "ol") {
      const listItems = Array.from(block.children).filter(
        (item): item is HTMLElement =>
          item instanceof HTMLElement && item.tagName.toLowerCase() === "li"
      );
      for (const item of listItems) {
        const nextItem = ownerDocument.createElement("li");
        nextItem.innerHTML = item.innerHTML.trim() || "<br>";
        nextList.appendChild(nextItem);
      }
      continue;
    }

    const nextItem = ownerDocument.createElement("li");
    nextItem.innerHTML = block.innerHTML.trim() || "<br>";
    nextList.appendChild(nextItem);
  }

  firstBlock.replaceWith(nextList);
  for (let index = 1; index < blocks.length; index += 1) {
    blocks[index]?.remove();
  }
  return true;
};

const applyTagToBlock = (block: HTMLElement, targetTag: PostRichTextBlockTag) => {
  const currentTag = getElementTag(block);
  if (!currentTag) return;

  if (currentTag === targetTag) return;

  if (isListTag(currentTag) && targetTag === "p") {
    unwrapListToParagraphs(block);
    return;
  }

  if (isListTag(currentTag)) {
    convertListToSingleBlock(block, targetTag);
    return;
  }

  createTagReplacement(block, targetTag);
};

export const resolveToolbarProfileForBlockType = (
  blockType: PostBlockType
): PostRichTextToolbarProfile | null => {
  switch (blockType) {
    case "writing-canvas":
      return "writing-canvas";
    case "paragraph":
      return "paragraph";
    case "heading":
      return "heading";
    case "quote":
      return "quote";
    case "callout":
      return "callout";
    default:
      return null;
  }
};

export const getPostRichTextCommandKind = (
  command: PostRichTextCommand
): PostRichTextCommandKind => {
  if (command === "bold" || command === "italic" || command === "underline" || command === "strike") {
    return "native-inline";
  }
  if (command === "inline-code" || command === "highlight") {
    return "inline-wrapper";
  }
  if (command === "link") return "link";
  if (command === "clear-formatting") return "clear-formatting";
  if (command in BLOCK_FORMAT_COMMAND_TAG) return "block-format";
  if (command in LIST_COMMAND_TAG) return "list-format";
  return "alignment";
};

export const resolveBlockTagForCommand = (
  command: PostRichTextCommand
): PostRichTextBlockTag | null => BLOCK_FORMAT_COMMAND_TAG[command] ?? null;

export const resolveListTagForCommand = (
  command: PostRichTextCommand
): "ul" | "ol" | null => LIST_COMMAND_TAG[command] ?? null;

export const resolveAlignmentForCommand = (
  command: PostRichTextCommand
): PostRichTextAlignment | null => ALIGNMENT_COMMAND_VALUE[command] ?? null;

export const applyCommandToRootHtmlWithoutBlocks = (
  command: PostRichTextCommand,
  html: string
): string | null => {
  const currentHtml = typeof html === "string" ? html.trim() : "";
  if (blockTagRegex.test(currentHtml)) {
    return null;
  }

  const content = currentHtml.length > 0 ? currentHtml : "<br>";
  const listTag = resolveListTagForCommand(command);
  if (listTag) {
    return `<${listTag}><li>${content}</li></${listTag}>`;
  }

  const blockTag = resolveBlockTagForCommand(command);
  if (!blockTag) {
    return null;
  }
  return `<${blockTag}>${content}</${blockTag}>`;
};

export const applyCommandToBlockTags = (
  command: PostRichTextCommand,
  tags: readonly PostRichTextBlockTag[]
): PostRichTextBlockTag[] => {
  if (tags.length === 0) return [];

  const blockTag = resolveBlockTagForCommand(command);
  if (blockTag) {
    if (command === "quote") {
      const allQuotes = tags.every((tag) => tag === "blockquote");
      return tags.map(() => (allQuotes ? "p" : "blockquote"));
    }
    return tags.map(() => blockTag);
  }

  const listTag = resolveListTagForCommand(command);
  if (listTag) {
    const alreadyWrapped = tags.every((tag) => tag === listTag);
    if (alreadyWrapped) return tags.map(() => "p");
    return [listTag];
  }

  return [...tags];
};

export const applyAlignmentToBlocks = (
  blocks: readonly HTMLElement[],
  alignment: PostRichTextAlignment
) => {
  if (!postRichTextAlignmentSet.has(alignment)) return false;
  for (const block of blocks) {
    block.setAttribute("data-align", alignment);
  }
  return blocks.length > 0;
};

export const executeBlockCommandOnBlocks = (
  command: PostRichTextCommand,
  blocks: readonly HTMLElement[]
) => {
  if (blocks.length === 0) return false;

  const listTag = resolveListTagForCommand(command);
  if (listTag) {
    const selectedTags = blocks
      .map((block) => getElementTag(block))
      .filter((tag): tag is PostRichTextBlockTag => tag !== null);
    const alreadyWrapped =
      selectedTags.length === blocks.length && selectedTags.every((tag) => tag === listTag);

    if (alreadyWrapped) {
      for (const block of blocks) {
        unwrapListToParagraphs(block);
      }
      return true;
    }
    return wrapBlocksAsList(blocks, listTag);
  }

  if (command === "quote") {
    const blockTags = blocks
      .map((block) => getElementTag(block))
      .filter((tag): tag is PostRichTextBlockTag => tag !== null);
    const shouldUnwrapQuote =
      blockTags.length === blocks.length && blockTags.every((tag) => tag === "blockquote");
    const targetTag: PostRichTextBlockTag = shouldUnwrapQuote ? "p" : "blockquote";
    for (const block of blocks) {
      applyTagToBlock(block, targetTag);
    }
    return true;
  }

  const targetTag = resolveBlockTagForCommand(command);
  if (!targetTag) return false;
  for (const block of blocks) {
    applyTagToBlock(block, targetTag);
  }
  return true;
};
