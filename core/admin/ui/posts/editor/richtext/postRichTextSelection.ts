import { sanitizePostRichTextHtml } from "../../../../../services/posts/editor/postRichTextSanitizer";
import { postRichTextBlockTagSet } from "../../../../../services/posts/editor/postRichTextSchema";

const editorBlockTagSet = new Set<string>([...postRichTextBlockTagSet, "div"]);
const editorBlockSelector = Array.from(editorBlockTagSet).join(",");

export const runCommand = (command: string, value?: string) => {
  if (typeof document === "undefined") return false;
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
};

export const applyFormatBlockCommand = (tagName: string) =>
  runCommand("formatBlock", tagName) || runCommand("formatBlock", `<${tagName}>`);

export const getCurrentBlockElement = (editorRoot: HTMLElement) => {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node: Node | null = selection.anchorNode;
  while (node && node !== editorRoot) {
    if (node instanceof HTMLElement && editorBlockTagSet.has(node.tagName.toLowerCase())) {
      return node;
    }
    node = node.parentNode;
  }
  return null;
};

const getClosestBlockElement = (node: Node | null, editorRoot: HTMLElement) => {
  let cursor: Node | null = node;
  while (cursor && cursor !== editorRoot) {
    if (cursor instanceof HTMLElement && editorBlockTagSet.has(cursor.tagName.toLowerCase())) {
      return cursor;
    }
    cursor = cursor.parentNode;
  }
  return null;
};

export const getSelectedBlockElements = (editorRoot: HTMLElement) => {
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
  if (!text.trim()) return null;
  const clampedOffset = Math.max(0, Math.min(offset, text.length));
  let pivot = clampedOffset >= text.length ? text.length - 1 : clampedOffset;
  if (pivot < 0) return null;

  const isWhitespace = (value: string | undefined) => Boolean(value && /\s/.test(value));
  if (isWhitespace(text[pivot])) {
    let left = pivot - 1;
    while (left >= 0 && isWhitespace(text[left])) {
      left -= 1;
    }
    let right = pivot + 1;
    while (right < text.length && isWhitespace(text[right])) {
      right += 1;
    }
    if (left >= 0) {
      pivot = left;
    } else if (right < text.length) {
      pivot = right;
    }
  }

  let start = pivot;
  let end = pivot;
  while (start > 0 && !isWhitespace(text[start - 1])) {
    start -= 1;
  }
  while (end < text.length && !isWhitespace(text[end])) {
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

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || node.nodeValue.length === 0) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const runs: SelectedTextRun[] = [];
  let current = walker.nextNode();
  while (current) {
    if (current instanceof Text && current.nodeValue) {
      const start = current === range.startContainer ? range.startOffset : 0;
      const end = current === range.endContainer ? range.endOffset : current.nodeValue.length;
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
    node instanceof HTMLElement ? node : (node?.parentElement ?? null);
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

export const wrapSelectionWithTag = (tagName: "code" | "mark", editorRoot: HTMLElement) => {
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
  const textRuns = collectSelectedTextRuns(range).filter((run) => editorRoot.contains(run.node));
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

  const textRuns = collectSelectedTextRuns(range).filter((run) => editorRoot.contains(run.node));
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

  const runs = collectSelectedTextRuns(range).filter((run) => editorRoot.contains(run.node));
  const listItems = new Set<HTMLLIElement>();
  for (const run of runs) {
    const candidate = run.node.parentElement?.closest("li");
    if (candidate && editorRoot.contains(candidate) && candidate instanceof HTMLLIElement) {
      listItems.add(candidate);
    }
  }
  for (const item of listItems) {
    applyInlineTypographyAttributes(item, attributes);
  }

  return wrapSelectionWithInlineSpan(editorRoot, attributes);
};

export const insertHtmlAtCursor = (html: string) => {
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

const inlineFormattingSelector = "strong, em, u, s, mark, code, span, a";

const unwrapInlineFormattingElement = (element: Element) => {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
};

const stripInlineFormatting = (html: string) => {
  const sanitized = sanitizePostRichTextHtml(html);
  if (typeof document === "undefined") return sanitized;

  const container = document.createElement("div");
  container.innerHTML = sanitized;

  for (const element of Array.from(container.querySelectorAll(inlineFormattingSelector))) {
    unwrapInlineFormattingElement(element);
  }

  return sanitizePostRichTextHtml(container.innerHTML);
};

export const clearFormattingInBlocks = (blocks: readonly HTMLElement[]) => {
  for (const block of blocks) {
    const stripped = stripInlineFormatting(block.innerHTML);
    block.innerHTML = stripped.trim().length > 0 ? stripped : "<br>";
    block.removeAttribute("data-align");
    block.removeAttribute("data-font");
    block.removeAttribute("data-text-scale");
    const formattedNodes = block.querySelectorAll("[data-align], [data-font], [data-text-scale]");
    for (const node of Array.from(formattedNodes)) {
      node.removeAttribute("data-align");
      node.removeAttribute("data-font");
      node.removeAttribute("data-text-scale");
    }
  }
};
