import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  deserializePostRichText,
  postRichTextToPlainText,
  serializePostRichText,
} from "../../../../../services/posts/editor/postRichTextSerializer";
import { sanitizePostRichTextHtml } from "../../../../../services/posts/editor/postRichTextSanitizer";
import {
  DEFAULT_POST_IMAGE_LAYOUT,
  normalizePostImageLayout,
  normalizePostImageMargin,
  normalizePostImageWidth,
  normalizePostImageWrap,
  POST_IMAGE_MARGIN_VALUES,
  POST_IMAGE_WIDTH_VALUES,
  POST_IMAGE_WRAP_VALUES,
  type PostImageLayout,
} from "../../../../../services/posts/postImageWrapLayout";
import {
  normalizePostPastePayload,
  type NormalizePostPastePayloadInput,
  type PostPasteDirectives,
} from "../../../../../services/posts/editor/postPasteNormalizer";
import { postRichTextBlockTagSet } from "../../../../../services/posts/editor/postRichTextSchema";
import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import { searchPostBlockCatalog } from "../blocks/blockCatalog";
import { SlashCommandMenu } from "../blocks/SlashCommandMenu";
import {
  PostRichTextToolbar,
  type PostRichTextCommand,
  type PostRichTextToolbarProfile,
} from "./PostRichTextToolbar";
import {
  applyAlignmentToBlocks,
  applyCommandToRootHtmlWithoutBlocks,
  executeBlockCommandOnBlocks,
  getPostRichTextCommandKind,
  resolveAlignmentForCommand,
  resolveBlockTagForCommand,
  resolveListTagForCommand,
} from "./postRichTextCommandEngine";

type PostRichTextAdapterProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
  onSlashInsertBlock?: (type: PostBlockType) => void;
  onPasteDirectives?: (directives: PostPasteDirectives) => void;
  onFocus?: () => void;
  onEditorBlur?: (finalHtml: string) => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
  toolbarProfile?: PostRichTextToolbarProfile;
  fontFamily?: "sans" | "serif" | "mono";
  baseTextScale?: "sm" | "md" | "lg" | "xl";
  onFontFamilyChange?: (value: "sans" | "serif" | "mono") => void;
  onBaseTextScaleChange?: (value: "sm" | "md" | "lg" | "xl") => void;
};

type ClipboardItemLike = {
  kind?: string;
  type?: string;
  getAsFile?: () => File | null;
};

type ClipboardDataLike = {
  items?: ArrayLike<ClipboardItemLike> | null;
  files?: ArrayLike<File> | null;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const editorBlockTagSet = new Set<string>([...postRichTextBlockTagSet, "div"]);
const editorBlockSelector = Array.from(editorBlockTagSet).join(",");

const runCommand = (command: string, value?: string) => {
  if (typeof document === "undefined") return false;
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
};

const applyFormatBlockCommand = (tagName: string) =>
  runCommand("formatBlock", tagName) || runCommand("formatBlock", `<${tagName}>`);

const getCurrentBlockElement = (editorRoot: HTMLElement) => {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node: Node | null = selection.anchorNode;
  while (node && node !== editorRoot) {
    if (
      node instanceof HTMLElement &&
      editorBlockTagSet.has(node.tagName.toLowerCase())
    ) {
      return node;
    }
    node = node.parentNode;
  }
  return null;
};

const getClosestBlockElement = (node: Node | null, editorRoot: HTMLElement) => {
  let cursor: Node | null = node;
  while (cursor && cursor !== editorRoot) {
    if (
      cursor instanceof HTMLElement &&
      editorBlockTagSet.has(cursor.tagName.toLowerCase())
    ) {
      return cursor;
    }
    cursor = cursor.parentNode;
  }
  return null;
};

const getSelectedBlockElements = (editorRoot: HTMLElement) => {
  if (typeof window === "undefined") return [] as HTMLElement[];
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return [] as HTMLElement[];

  const allBlocks = Array.from(editorRoot.querySelectorAll<HTMLElement>(editorBlockSelector));
  if (allBlocks.length === 0) return [] as HTMLElement[];

  const range = selection.getRangeAt(0);
  const startBlock = getClosestBlockElement(range.startContainer, editorRoot);
  const endBlock = getClosestBlockElement(range.endContainer, editorRoot);

  if (!startBlock && !endBlock) {
    return [allBlocks[0] as HTMLElement];
  }

  const startIndex = startBlock ? allBlocks.indexOf(startBlock) : 0;
  const endIndex = endBlock ? allBlocks.indexOf(endBlock) : startIndex;
  const from = Math.max(0, Math.min(startIndex, endIndex));
  const to = Math.max(startIndex, endIndex);
  return allBlocks.slice(from, to + 1);
};

type SelectedTextRun = {
  node: Text;
  start: number;
  end: number;
};

export const resolveInlineWrapperTextRange = (
  text: string,
  offset: number
): { start: number; end: number } | null => {
  if (!text) return null;
  const clampedOffset = Math.max(0, Math.min(offset, text.length));
  let start = clampedOffset;
  let end = clampedOffset;
  while (start > 0 && !/\s/.test(text[start - 1])) {
    start -= 1;
  }
  while (end < text.length && !/\s/.test(text[end])) {
    end += 1;
  }
  if (start === end) return null;
  return { start, end };
};

const collectSelectedTextRuns = (range: Range): SelectedTextRun[] => {
  const root = range.commonAncestorContainer;
  if (root instanceof Text && root.nodeValue) {
    const start = root === range.startContainer ? range.startOffset : 0;
    const end = root === range.endContainer ? range.endOffset : root.nodeValue.length;
    return end > start ? [{ node: root, start, end }] : [];
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || node.nodeValue.length === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const runs: SelectedTextRun[] = [];
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text && current.nodeValue) {
      const start =
        current === range.startContainer ? range.startOffset : 0;
      const end =
        current === range.endContainer
          ? range.endOffset
          : current.nodeValue.length;
      if (end > start) {
        runs.push({ node: current, start, end });
      }
    }
    current = walker.nextNode();
  }

  return runs;
};

const resolveFirstTextNode = (root: Node): Text | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || node.nodeValue.length === 0) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const next = walker.nextNode();
  return next instanceof Text ? next : null;
};

const resolveLastTextNode = (root: Node): Text | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || node.nodeValue.length === 0) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let last: Text | null = null;
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text) last = current;
    current = walker.nextNode();
  }
  return last;
};

const resolveCollapsedSelectionTextNode = (
  selection: Selection,
  editorRoot: HTMLElement
): { node: Text; offset: number } | null => {
  const anchorNode = selection.anchorNode;
  if (!anchorNode || !editorRoot.contains(anchorNode)) return null;

  if (anchorNode instanceof Text) {
    return { node: anchorNode, offset: selection.anchorOffset };
  }

  if (!(anchorNode instanceof Element)) return null;

  const offset = selection.anchorOffset;
  const childAtOffset = anchorNode.childNodes[offset] ?? null;
  if (childAtOffset instanceof Text) {
    return { node: childAtOffset, offset: 0 };
  }

  const previousChild = anchorNode.childNodes[offset - 1] ?? null;
  if (previousChild instanceof Text) {
    return {
      node: previousChild,
      offset: previousChild.nodeValue?.length ?? 0,
    };
  }

  if (childAtOffset) {
    const first = resolveFirstTextNode(childAtOffset);
    if (first) return { node: first, offset: 0 };
  }

  if (previousChild) {
    const last = resolveLastTextNode(previousChild);
    if (last) return { node: last, offset: last.nodeValue?.length ?? 0 };
  }

  return null;
};

const resolveCollapsedInlineWrapperRange = (
  selection: Selection,
  editorRoot: HTMLElement
): Range | null => {
  const target = resolveCollapsedSelectionTextNode(selection, editorRoot);
  if (!target) return null;
  const { node, offset } = target;
  const boundaries = resolveInlineWrapperTextRange(node.nodeValue ?? "", offset);
  if (!boundaries) return null;
  const range = document.createRange();
  range.setStart(node, boundaries.start);
  range.setEnd(node, boundaries.end);
  return range;
};

const findInlineTypographySpan = (
  node: Node | null,
  editorRoot: HTMLElement
): HTMLSpanElement | null => {
  let cursor: HTMLElement | null =
    node instanceof HTMLElement ? node : node?.parentElement ?? null;
  while (cursor && cursor !== editorRoot) {
    if (
      cursor instanceof HTMLSpanElement &&
      (cursor.hasAttribute("data-font") || cursor.hasAttribute("data-text-scale"))
    ) {
      return cursor;
    }
    cursor = cursor.parentElement;
  }
  return null;
};

const applyInlineTypographyAttributes = (
  element: HTMLElement,
  attributes: Record<string, string>
) => {
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
};

const wrapSelectionWithTag = (tagName: "code" | "mark", editorRoot: HTMLElement) => {
  if (typeof window === "undefined") return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  let range = selection.getRangeAt(0);
  if (selection.isCollapsed) {
    const expanded = resolveCollapsedInlineWrapperRange(selection, editorRoot);
    if (!expanded) return;
    selection.removeAllRanges();
    selection.addRange(expanded);
    range = expanded;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText) return;

  // Preserve line/block structure by wrapping each selected text run.
  const textRuns = collectSelectedTextRuns(range).filter((run) =>
    editorRoot.contains(run.node)
  );
  if (textRuns.length === 0) return;

  const wrappedNodes: HTMLElement[] = [];
  for (let index = textRuns.length - 1; index >= 0; index -= 1) {
    const run = textRuns[index];
    const afterStart = run.node.splitText(run.start);
    const afterEnd = afterStart.splitText(run.end - run.start);
    const wrapper = document.createElement(tagName);
    wrapper.textContent = afterStart.nodeValue ?? "";
    afterStart.parentNode?.replaceChild(wrapper, afterStart);
    wrappedNodes.push(wrapper);
    void afterEnd;
  }

  if (wrappedNodes.length > 0) {
    const first = wrappedNodes[wrappedNodes.length - 1];
    const last = wrappedNodes[0];
    const nextRange = document.createRange();
    nextRange.setStartBefore(first);
    nextRange.setEndAfter(last);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }
};

const wrapSelectionWithInlineSpan = (
  editorRoot: HTMLElement,
  attributes: Record<string, string>
) => {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!editorRoot.contains(range.commonAncestorContainer)) return false;

  const selectedText = selection.toString().trim();
  if (!selectedText) return false;

  const textRuns = collectSelectedTextRuns(range).filter((run) =>
    editorRoot.contains(run.node)
  );
  if (textRuns.length === 0) return false;

  const wrappedNodes: HTMLElement[] = [];
  for (let index = textRuns.length - 1; index >= 0; index -= 1) {
    const run = textRuns[index];
    const existingSpan = findInlineTypographySpan(run.node, editorRoot);
    if (existingSpan) {
      applyInlineTypographyAttributes(existingSpan, attributes);
      wrappedNodes.push(existingSpan);
      continue;
    }
    const afterStart = run.node.splitText(run.start);
    const afterEnd = afterStart.splitText(run.end - run.start);
    const wrapper = document.createElement("span");
    applyInlineTypographyAttributes(wrapper, attributes);
    wrapper.textContent = afterStart.nodeValue ?? "";
    afterStart.parentNode?.replaceChild(wrapper, afterStart);
    wrappedNodes.push(wrapper);
    void afterEnd;
  }

  if (wrappedNodes.length > 0) {
    const first = wrappedNodes[wrappedNodes.length - 1];
    const last = wrappedNodes[0];
    const nextRange = document.createRange();
    nextRange.setStartBefore(first);
    nextRange.setEndAfter(last);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }

  return wrappedNodes.length > 0;
};

export const applyInlineTypographySelection = (
  editorRoot: HTMLElement,
  attributes: Record<string, string>
) => {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!editorRoot.contains(range.commonAncestorContainer)) return false;
  if (!selection.toString().trim()) return false;

  const listItems = Array.from(editorRoot.querySelectorAll("li")).filter((item) =>
    range.intersectsNode(item)
  );
  if (listItems.length > 0) {
    for (const item of listItems) {
      applyInlineTypographyAttributes(item, attributes);
    }
  }

  return wrapSelectionWithInlineSpan(editorRoot, attributes);
};

const insertHtmlAtCursor = (html: string) => {
  if (!html) return false;
  if (runCommand("insertHTML", html)) return true;
  if (typeof window === "undefined") return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  if (lastNode) {
    range.setStartAfter(lastNode);
    range.setEndAfter(lastNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  return true;
};

const stripInlineFormatting = (html: string) =>
  sanitizePostRichTextHtml(html)
    .replace(/<\s*(strong|em|u|s|mark|code|span)\b[^>]*>/gi, "")
    .replace(/<\s*\/\s*(strong|em|u|s|mark|code|span)\s*>/gi, "")
    .replace(/<\s*a\b[^>]*>/gi, "")
    .replace(/<\s*\/\s*a\s*>/gi, "");

const clearFormattingInBlocks = (blocks: readonly HTMLElement[]) => {
  for (const block of blocks) {
    const stripped = stripInlineFormatting(block.innerHTML);
    block.innerHTML = stripped.trim().length > 0 ? stripped : "<br>";
  }
};

type ShortcutInput = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
};

export const resolvePostRichTextShortcutCommand = (
  input: ShortcutInput
): PostRichTextCommand | null => {
  const modifier = Boolean(input.metaKey || input.ctrlKey);
  const key = input.key.toLowerCase();
  if (!modifier) return null;

  if (key === "b") return "bold";
  if (key === "i") return "italic";
  if (key === "u") return "underline";
  if (key === "k") return "link";
  if (Boolean(input.shiftKey) && key === "7") return "ordered-list";
  if (Boolean(input.shiftKey) && key === "8") return "bullet-list";
  return null;
};

export const resolvePostRichTextCommandKind = getPostRichTextCommandKind;

export const extractClipboardImageFiles = (clipboard: ClipboardDataLike | null | undefined) => {
  if (!clipboard) return [] as File[];

  const fromItems: File[] = [];
  for (const item of Array.from(clipboard.items ?? [])) {
    if (!item) continue;
    const itemType = (item.type ?? "").toLowerCase();
    if (item.kind !== "file" && !itemType.startsWith("image/")) continue;
    const file = item.getAsFile?.() ?? null;
    if (!file) continue;
    if (!file.type.toLowerCase().startsWith("image/")) continue;
    fromItems.push(file);
  }

  if (fromItems.length > 0) {
    return fromItems;
  }

  return Array.from(clipboard.files ?? []).filter((file) =>
    file.type.toLowerCase().startsWith("image/")
  );
};

const deriveClipboardImageAlt = (file: File) => {
  const base = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
  return (base || "Pasted image").slice(0, 200);
};

export const buildClipboardImageInsertHtml = (
  asset: { id: string; url: string },
  alt: string,
  layout: PostImageLayout = DEFAULT_POST_IMAGE_LAYOUT
) => {
  const safeAlt = alt.trim().slice(0, 500);
  return `<img src="${escapeHtml(asset.url)}" data-media-id="${escapeHtml(asset.id)}" alt="${escapeHtml(safeAlt)}" data-wrap="${layout.wrap}" data-width="${layout.widthPercent}" data-margin="${layout.marginPreset}" loading="lazy">`;
};

const findClosestImageFromNode = (
  node: Node | null,
  editorRoot: HTMLElement
): HTMLImageElement | null => {
  let cursor: Node | null = node;
  while (cursor && cursor !== editorRoot) {
    if (cursor instanceof HTMLImageElement) {
      return cursor;
    }
    if (
      cursor instanceof HTMLElement &&
      cursor.tagName.toLowerCase() === "img"
    ) {
      return cursor as HTMLImageElement;
    }
    cursor = cursor.parentNode;
  }
  return null;
};

const findSelectedImageElement = (editorRoot: HTMLElement) => {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const anchor = findClosestImageFromNode(selection.anchorNode, editorRoot);
  if (anchor) return anchor;
  const focus = findClosestImageFromNode(selection.focusNode, editorRoot);
  if (focus) return focus;

  const range = selection.getRangeAt(0);
  const fromStart =
    range.startContainer instanceof Element
      ? (range.startContainer.querySelector("img") as HTMLImageElement | null)
      : null;
  if (fromStart && editorRoot.contains(fromStart)) {
    return fromStart;
  }
  return null;
};

const readImageLayoutFromElement = (image: HTMLImageElement): PostImageLayout =>
  normalizePostImageLayout({
    wrap: image.getAttribute("data-wrap"),
    widthPercent: image.getAttribute("data-width"),
    marginPreset: image.getAttribute("data-margin"),
  });

const applyImageLayoutToElement = (
  image: HTMLImageElement,
  layout: PostImageLayout
) => {
  image.setAttribute("data-wrap", layout.wrap);
  image.setAttribute("data-width", String(layout.widthPercent));
  image.setAttribute("data-margin", layout.marginPreset);
};

export const buildPostRichTextPasteInsert = (input: NormalizePostPastePayloadInput) => {
  const normalized = normalizePostPastePayload(input);
  return {
    html: normalized.html,
    warnings: normalized.warnings.map((warning) => warning.message),
    mode: normalized.mode,
    source: normalized.source,
    directives: normalized.directives,
    diagnostics: normalized.diagnostics,
  };
};

export const resolveClipboardPasteMode = (input: {
  normalizedHtml: string;
  imageFilesCount: number;
  hasPostPasteDirectives?: boolean;
}): "rich-text" | "images" | "none" => {
  if (input.normalizedHtml.trim().length > 0) return "rich-text";
  if (input.hasPostPasteDirectives) return "rich-text";
  if (input.imageFilesCount > 0) return "images";
  return "none";
};

export function PostRichTextAdapter({
  value,
  onChange,
  placeholder = "Start writing…",
  ariaLabel = "Rich text editor",
  disabled = false,
  className,
  minHeightClassName = "min-h-[18rem]",
  onSlashInsertBlock,
  onPasteDirectives,
  onFocus,
  onEditorBlur,
  onUploadClipboardImage,
  toolbarProfile = "writing-canvas",
  fontFamily = "sans",
  baseTextScale = "md",
  onFontFamilyChange,
  onBaseTextScaleChange,
}: PostRichTextAdapterProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const focusedRef = useRef(false);
  const lastEmittedRef = useRef<string | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedImageLayout, setSelectedImageLayout] = useState<PostImageLayout | null>(
    null
  );

  const emitChange = useCallback(() => {
    const current = editorRef.current;
    if (!current) return;
    const serialized = serializePostRichText(current.innerHTML);
    if (serialized === value) return;
    lastEmittedRef.current = serialized;
    onChange(serialized);
  }, [onChange, value]);

  useEffect(() => {
    const current = editorRef.current;
    if (!current) return;
    const nextHtml = deserializePostRichText(value);
    if (focusedRef.current && nextHtml === lastEmittedRef.current) {
      return;
    }
    if (current.innerHTML !== nextHtml) {
      current.innerHTML = nextHtml;
    }
  }, [value]);

  const saveSelectionRange = useCallback(() => {
    const editorRoot = editorRef.current;
    if (!editorRoot || typeof window === "undefined") return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editorRoot.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }, []);

  const restoreSelectionRange = useCallback(() => {
    const editorRoot = editorRef.current;
    const savedRange = savedRangeRef.current;
    if (!editorRoot || !savedRange || typeof window === "undefined") return false;
    const selection = window.getSelection();
    if (!selection) return false;
    if (!editorRoot.contains(savedRange.commonAncestorContainer)) return false;
    selection.removeAllRanges();
    selection.addRange(savedRange);
    return true;
  }, []);

  const applyInlineTypography = useCallback(
    (attributes: Record<string, string>) => {
      const editorRoot = editorRef.current;
      if (!editorRoot) return false;
      editorRoot.focus();
      restoreSelectionRange();
      const applied = applyInlineTypographySelection(editorRoot, attributes);
      if (!applied) return false;
      saveSelectionRange();
      emitChange();
      return true;
    },
    [emitChange, restoreSelectionRange, saveSelectionRange]
  );

  const handleFontFamilyChange = useCallback(
    (nextFontFamily: "sans" | "serif" | "mono") => {
      const applied = applyInlineTypography({ "data-font": nextFontFamily });
      if (applied) return;
      onFontFamilyChange?.(nextFontFamily);
    },
    [applyInlineTypography, onFontFamilyChange]
  );

  const handleBaseTextScaleChange = useCallback(
    (nextScale: "sm" | "md" | "lg" | "xl") => {
      const applied = applyInlineTypography({ "data-text-scale": nextScale });
      if (applied) return;
      onBaseTextScaleChange?.(nextScale);
    },
    [applyInlineTypography, onBaseTextScaleChange]
  );

  const updateSelectedImageState = useCallback(() => {
    const editorRoot = editorRef.current;
    if (!editorRoot) return;
    const selectedImage = findSelectedImageElement(editorRoot);
    if (!selectedImage) {
      selectedImageRef.current = null;
      setSelectedImageLayout(null);
      return;
    }
    selectedImageRef.current = selectedImage;
    setSelectedImageLayout(readImageLayoutFromElement(selectedImage));
  }, []);

  useEffect(() => {
    if (!pasteHint || typeof window === "undefined") return;
    const timeoutId = window.setTimeout(() => {
      setPasteHint(null);
    }, 7000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pasteHint]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleSelectionChange = () => {
      if (!focusedRef.current) return;
      saveSelectionRange();
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [saveSelectionRange]);

  const executeCommand = useCallback(
    (command: PostRichTextCommand) => {
      if (disabled) return;
      const editorRoot = editorRef.current;
      if (!editorRoot) return;
      editorRoot.focus();
      restoreSelectionRange();

      const selectedBlocks = getSelectedBlockElements(editorRoot);
      const currentBlock = getCurrentBlockElement(editorRoot);
      const targetBlocks =
        selectedBlocks.length > 0
          ? selectedBlocks
          : currentBlock
            ? [currentBlock]
            : [];
      const commandKind = getPostRichTextCommandKind(command);

      if (commandKind === "native-inline") {
        if (command === "bold") runCommand("bold");
        if (command === "italic") runCommand("italic");
        if (command === "underline") runCommand("underline");
        if (command === "strike") runCommand("strikeThrough");
      } else if (commandKind === "inline-wrapper") {
        wrapSelectionWithTag(command === "inline-code" ? "code" : "mark", editorRoot);
      } else if (commandKind === "link") {
        if (typeof window !== "undefined") {
          const href = window.prompt("Enter link URL", "https://");
          if (href !== null) {
            const nextHref = href.trim();
            if (!nextHref) {
              runCommand("unlink");
            } else {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                if (selection.isCollapsed) {
                  const label = window.prompt("Link text", nextHref) ?? nextHref;
                  runCommand(
                    "insertHTML",
                    `<a href="${escapeHtml(nextHref)}">${escapeHtml(label)}</a>`
                  );
                } else {
                  runCommand("createLink", nextHref);
                }
              }
            }
          }
        }
      } else if (commandKind === "block-format" || commandKind === "list-format") {
        const handled =
          targetBlocks.length > 0
            ? executeBlockCommandOnBlocks(command, targetBlocks)
            : (() => {
                const nextHtml = applyCommandToRootHtmlWithoutBlocks(
                  command,
                  editorRoot.innerHTML
                );
                if (!nextHtml) return false;
                editorRoot.innerHTML = nextHtml;
                return true;
              })();
        if (!handled) {
          const fallbackBlockTag = resolveBlockTagForCommand(command);
          const fallbackListTag = resolveListTagForCommand(command);
          if (fallbackBlockTag) {
            applyFormatBlockCommand(fallbackBlockTag);
          } else if (fallbackListTag === "ul") {
            runCommand("insertUnorderedList");
          } else if (fallbackListTag === "ol") {
            runCommand("insertOrderedList");
          }
        }
      } else if (commandKind === "alignment") {
        const alignment = resolveAlignmentForCommand(command);
        if (alignment) {
          applyAlignmentToBlocks(targetBlocks, alignment);
        }
      } else if (commandKind === "clear-formatting") {
        runCommand("removeFormat");
        runCommand("unlink");
        clearFormattingInBlocks(targetBlocks);
        if (targetBlocks.length > 0) {
          executeBlockCommandOnBlocks("paragraph", targetBlocks);
        } else {
          const nextHtml = applyCommandToRootHtmlWithoutBlocks("paragraph", editorRoot.innerHTML);
          if (nextHtml) {
            editorRoot.innerHTML = nextHtml;
          }
        }
      }

      saveSelectionRange();
      emitChange();
    },
    [disabled, emitChange, restoreSelectionRange, saveSelectionRange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && slashOpen) {
        event.preventDefault();
        setSlashOpen(false);
        setSlashQuery("");
        return;
      }

      const key = event.key.toLowerCase();
      const shortcutCommand = resolvePostRichTextShortcutCommand({
        key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
      });
      if (shortcutCommand) {
        event.preventDefault();
        executeCommand(shortcutCommand);
        return;
      }

      if (key === "enter" && !event.shiftKey) {
        const current = editorRef.current;
        if (!current) return;
        const currentBlock = getCurrentBlockElement(current);
        const currentTag = currentBlock?.tagName.toLowerCase();
        if (currentTag !== "ul" && currentTag !== "ol") {
          event.preventDefault();
          runCommand("insertParagraph");
          emitChange();
          return;
        }
      }

      if (event.shiftKey && event.altKey && key === "5") {
        event.preventDefault();
        executeCommand("quote");
      }
    },
    [emitChange, executeCommand, slashOpen]
  );

  const hasValue = useMemo(() => postRichTextToPlainText(value).length > 0, [value]);

  const updateSlashState = useCallback(() => {
    if (!onSlashInsertBlock) {
      if (slashOpen) {
        setSlashOpen(false);
        setSlashQuery("");
      }
      return;
    }
    const current = editorRef.current;
    if (!current) return;
    const plainText = postRichTextToPlainText(current.innerHTML);
    const match = /(?:^|\s)\/([a-z0-9-]*)$/i.exec(plainText);
    if (!match) {
      setSlashOpen(false);
      setSlashQuery("");
      return;
    }
    setSlashOpen(true);
    setSlashQuery((match[1] ?? "").toLowerCase());
  }, [onSlashInsertBlock, slashOpen]);

  const slashOptions = useMemo(
    () => searchPostBlockCatalog(slashQuery).slice(0, 8),
    [slashQuery]
  );

  const applySelectedImageLayout = useCallback(
    (patch: Partial<PostImageLayout>) => {
      const selectedImage = selectedImageRef.current;
      if (!selectedImage) return;
      const currentLayout = readImageLayoutFromElement(selectedImage);
      const nextLayout: PostImageLayout = {
        wrap: patch.wrap ?? currentLayout.wrap,
        widthPercent: patch.widthPercent ?? currentLayout.widthPercent,
        marginPreset: patch.marginPreset ?? currentLayout.marginPreset,
      };
      const normalized: PostImageLayout = {
        wrap: normalizePostImageWrap(nextLayout.wrap),
        widthPercent: normalizePostImageWidth(nextLayout.widthPercent),
        marginPreset: normalizePostImageMargin(nextLayout.marginPreset),
      };

      applyImageLayoutToElement(selectedImage, normalized);
      setSelectedImageLayout(normalized);
      emitChange();
    },
    [emitChange]
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      const html = event.clipboardData.getData("text/html");
      const text = event.clipboardData.getData("text/plain");
      const normalized = buildPostRichTextPasteInsert({ html, text });
      const imageFiles = extractClipboardImageFiles(event.clipboardData);

      const pasteMode = resolveClipboardPasteMode({
        normalizedHtml: normalized.html,
        imageFilesCount: imageFiles.length,
        hasPostPasteDirectives: normalized.directives.replaceWordTocWithDynamicToc,
      });

      if (pasteMode === "images") {
        event.preventDefault();
        if (!onUploadClipboardImage) {
          setPasteHint("Image paste is unavailable in this editor context.");
          return;
        }

        setImageUploading(true);
        setPasteHint(
          imageFiles.length === 1
            ? "Uploading image from clipboard..."
            : `Uploading ${imageFiles.length} images from clipboard...`
        );

        let insertedCount = 0;
        try {
          for (const file of imageFiles) {
            const uploaded = await onUploadClipboardImage(file);
            const inserted = insertHtmlAtCursor(
              buildClipboardImageInsertHtml(
                uploaded,
                deriveClipboardImageAlt(file),
                DEFAULT_POST_IMAGE_LAYOUT
              )
            );
            if (inserted) {
              insertedCount += 1;
            }
          }

          if (insertedCount > 0) {
            emitChange();
            updateSlashState();
            updateSelectedImageState();
          }

          if (insertedCount === 0) {
            setPasteHint("Image upload finished but insertion failed. Try paste again.");
          } else if (insertedCount === 1) {
            setPasteHint("Image uploaded and inserted.");
          } else {
            setPasteHint(`${insertedCount} images uploaded and inserted.`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Image upload failed.";
          setPasteHint(`Image upload failed: ${message}. Paste again to retry.`);
        } finally {
          setImageUploading(false);
        }
        return;
      }

      if (pasteMode !== "rich-text") return;

      event.preventDefault();
      const canInsertHtml = normalized.html.trim().length > 0;
      const inserted = canInsertHtml ? insertHtmlAtCursor(normalized.html) : true;
      if (!inserted && !normalized.directives.replaceWordTocWithDynamicToc) return;

      if (inserted && canInsertHtml) {
        emitChange();
        updateSlashState();
      }

      if (normalized.directives.replaceWordTocWithDynamicToc) {
        onPasteDirectives?.(normalized.directives);
      }

      if (normalized.warnings.length > 0) {
        const firstWarning = normalized.warnings[0] ?? "";
        const suffix =
          normalized.warnings.length > 1
            ? ` (+${normalized.warnings.length - 1} more)`
            : "";
        setPasteHint(`${firstWarning}${suffix}`);
      } else {
        setPasteHint(null);
      }
    },
    [
      disabled,
      emitChange,
      onPasteDirectives,
      onUploadClipboardImage,
      updateSelectedImageState,
      updateSlashState,
    ]
  );

  const handleSlashSelect = useCallback(
    (type: PostBlockType) => {
      onSlashInsertBlock?.(type);
      const current = editorRef.current;
      if (current) {
        const plain = postRichTextToPlainText(current.innerHTML);
        if (/^\/[a-z0-9-]*$/i.test(plain.trim())) {
          current.innerHTML = "";
          onChange("");
        } else {
          emitChange();
        }
      }
      setSlashOpen(false);
      setSlashQuery("");
    },
    [emitChange, onChange, onSlashInsertBlock]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <PostRichTextToolbar
        onCommand={executeCommand}
        disabled={disabled || imageUploading}
        profile={toolbarProfile}
        fontFamily={fontFamily}
        onFontFamilyChange={onFontFamilyChange ? handleFontFamilyChange : undefined}
        baseTextScale={baseTextScale}
        onBaseTextScaleChange={onBaseTextScaleChange ? handleBaseTextScaleChange : undefined}
      />
      <div className="relative rounded-lg border bg-background">
        {!hasValue ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-start px-3 py-2 leading-relaxed text-muted-foreground",
              baseTextScale === "sm"
                ? "text-base"
                : baseTextScale === "lg"
                  ? "text-xl"
                  : baseTextScale === "xl"
                    ? "text-2xl"
                    : "text-lg",
              fontFamily === "serif"
                ? "font-serif"
                : fontFamily === "mono"
                  ? "font-mono"
                  : "font-sans"
            )}
          >
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          contentEditable={!disabled && !imageUploading}
          data-post-editor-primary-editable="true"
          suppressContentEditableWarning
          aria-label={ariaLabel}
          className={cn(
            "post-editor-richtext w-full rounded-lg px-3 py-2 leading-relaxed focus:outline-none",
            baseTextScale === "sm"
              ? "text-base"
              : baseTextScale === "lg"
                ? "text-xl"
                : baseTextScale === "xl"
                  ? "text-2xl"
                  : "text-lg",
            fontFamily === "serif"
              ? "font-serif"
              : fontFamily === "mono"
                ? "font-mono"
                : "font-sans",
            minHeightClassName
          )}
          onInput={() => {
            emitChange();
            saveSelectionRange();
            updateSlashState();
            updateSelectedImageState();
          }}
          onBlur={() => {
            focusedRef.current = false;
            emitChange();
            saveSelectionRange();
            const current = editorRef.current;
            if (current) {
              onEditorBlur?.(serializePostRichText(current.innerHTML));
            }
            setSlashOpen(false);
            setSlashQuery("");
            selectedImageRef.current = null;
            setSelectedImageLayout(null);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={() => {
            saveSelectionRange();
            updateSelectedImageState();
          }}
          onMouseUp={() => {
            saveSelectionRange();
            updateSelectedImageState();
          }}
          onFocus={() => {
            onFocus?.();
            focusedRef.current = true;
            runCommand("defaultParagraphSeparator", "p");
            saveSelectionRange();
            updateSelectedImageState();
          }}
          onPaste={handlePaste}
        />
        <SlashCommandMenu
          open={slashOpen}
          query={slashQuery}
          options={slashOptions}
          onSelect={handleSlashSelect}
          onClose={() => {
            setSlashOpen(false);
            setSlashQuery("");
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Shortcuts: Ctrl/Cmd+B, Ctrl/Cmd+I, Ctrl/Cmd+K, Shift+Alt+5.
      </p>
      {selectedImageLayout ? (
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/20 p-2">
          <p className="text-xs font-semibold text-muted-foreground">Selected image layout</p>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Wrap</p>
              <Select
                value={selectedImageLayout.wrap}
                onValueChange={(value) =>
                  applySelectedImageLayout({
                    wrap: normalizePostImageWrap(value),
                  })
                }
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_IMAGE_WRAP_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === "none"
                        ? "No wrap"
                        : value === "left"
                          ? "Left"
                          : "Right"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Width</p>
              <Select
                value={String(selectedImageLayout.widthPercent)}
                onValueChange={(value) =>
                  applySelectedImageLayout({
                    widthPercent: normalizePostImageWidth(value),
                  })
                }
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_IMAGE_WIDTH_VALUES.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Spacing</p>
              <Select
                value={selectedImageLayout.marginPreset}
                onValueChange={(value) =>
                  applySelectedImageLayout({
                    marginPreset: normalizePostImageMargin(value),
                  })
                }
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_IMAGE_MARGIN_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === "sm"
                        ? "Compact"
                        : value === "md"
                          ? "Balanced"
                          : "Spacious"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}
      {pasteHint ? (
        <p className="text-xs text-amber-500">
          Paste notice: {pasteHint}
        </p>
      ) : null}
    </div>
  );
}
