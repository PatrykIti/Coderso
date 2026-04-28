import React from "react";

import { sanitizePostRichTextHtml } from "../editor/postRichTextSanitizer";
import {
  postRichTextAllowedTagSet,
  postRichTextSelfClosingTagSet,
} from "../editor/postRichTextSchema";

type RichTextNode =
  | string
  | {
      tag: string;
      attrs: Record<string, string>;
      children: RichTextNode[];
    };

const richTextAttributeNames = new Set([
  "href",
  "title",
  "target",
  "rel",
  "data-align",
  "data-font",
  "data-text-scale",
  "src",
  "data-media-id",
  "alt",
  "data-wrap",
  "data-width",
  "data-margin",
  "loading",
  "width",
  "height",
]);

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    );

const parseAttributes = (rawAttrs: string) => {
  const attrs: Record<string, string> = {};
  const regex = /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of rawAttrs.matchAll(regex)) {
    const key = match[1]?.toLowerCase();
    if (!key || !richTextAttributeNames.has(key)) continue;
    attrs[key] = decodeHtmlEntities(match[3] ?? match[4] ?? match[5] ?? "");
  }
  return attrs;
};

const appendNode = (
  stack: Array<{ tag: string; children: RichTextNode[] }>,
  node: RichTextNode
) => {
  stack[stack.length - 1]?.children.push(node);
};

const parseSanitizedRichText = (html: string) => {
  const root = { tag: "root", children: [] as RichTextNode[] };
  const stack: Array<{ tag: string; children: RichTextNode[]; attrs?: Record<string, string> }> = [
    root,
  ];
  const tagMatcher = /<\/?([a-zA-Z0-9-]+)([^>]*)>/g;
  let cursor = 0;

  for (const match of html.matchAll(tagMatcher)) {
    const index = match.index ?? 0;
    const rawText = html.slice(cursor, index);
    if (rawText) appendNode(stack, decodeHtmlEntities(rawText));

    const tag = match[1]?.toLowerCase() ?? "";
    const rawTag = match[0] ?? "";
    const rawAttrs = match[2] ?? "";
    cursor = index + rawTag.length;

    if (!postRichTextAllowedTagSet.has(tag)) continue;

    const isClosing = rawTag.startsWith("</");
    if (isClosing) {
      for (let stackIndex = stack.length - 1; stackIndex > 0; stackIndex -= 1) {
        const current = stack[stackIndex];
        if (current?.tag !== tag) continue;
        stack.splice(stackIndex);
        appendNode(stack, {
          tag: current.tag,
          attrs: current.attrs ?? {},
          children: current.children,
        });
        break;
      }
      continue;
    }

    const attrs = parseAttributes(rawAttrs);
    if (postRichTextSelfClosingTagSet.has(tag)) {
      appendNode(stack, { tag, attrs, children: [] });
      continue;
    }

    stack.push({ tag, attrs, children: [] });
  }

  const tail = html.slice(cursor);
  if (tail) appendNode(stack, decodeHtmlEntities(tail));

  for (let stackIndex = stack.length - 1; stackIndex > 0; stackIndex -= 1) {
    const current = stack[stackIndex];
    if (!current) continue;
    stack.splice(stackIndex);
    appendNode(stack, {
      tag: current.tag,
      attrs: current.attrs ?? {},
      children: current.children,
    });
  }

  return root.children;
};

const renderRichTextNode = (node: RichTextNode, key: string): React.ReactNode => {
  if (typeof node === "string") return node;
  return React.createElement(
    node.tag,
    { key, ...node.attrs },
    ...node.children.map((child, index) => renderRichTextNode(child, `${key}-${index}`))
  );
};

export function renderPostRichTextHtml(value: string | undefined): React.ReactNode[] {
  const sanitized = sanitizePostRichTextHtml(value);
  return parseSanitizedRichText(sanitized).map((node, index) =>
    renderRichTextNode(node, `post-rich-text-${index}`)
  );
}
