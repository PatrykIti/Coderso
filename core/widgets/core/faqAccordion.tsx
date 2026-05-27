import type { CSSProperties, ComponentType, ReactNode } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";
import { resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type FaqAccordionVariantId = "single-column" | "two-column" | "compact";
export type FaqAccordionSpacing = "none" | "sm" | "md" | "lg";
export type FaqAccordionAnswerFormat = "plain" | "markdown";
export type FaqAccordionMaxWidth = "sm" | "md" | "lg" | "xl" | "full";
export type FaqAccordionHeaderAlign = "left" | "center" | "right";
export type FaqAccordionSectionPaddingX = "none" | "sm" | "md" | "lg";
export type FaqAccordionSectionPaddingY = "none" | "sm" | "md" | "lg";
export type FaqAccordionPanelRadius = "none" | "sm" | "md" | "lg" | "xl";
export type FaqAccordionBorderWidth = "0" | "1" | "2" | "3";
export type FaqAccordionHeaderTitleSize = "auto" | "sm" | "md" | "lg" | "xl";
export type FaqAccordionMotion = "none" | "smooth";

export type FaqAccordionItem = {
  id?: string;
  question?: string;
  answer?: string;
  answerFormat?: FaqAccordionAnswerFormat;
  icon?: string;
};

export type FaqAccordionData = {
  header?: {
    title?: string;
    description?: string;
  };
  items: FaqAccordionItem[];
  options?: {
    allowMultipleOpen?: boolean;
    defaultOpenIndex?: number;
  };
  style?: {
    surface?: string;
    border?: string;
    divider?: string;
    spacing?: FaqAccordionSpacing;
    maxWidth?: FaqAccordionMaxWidth;
    headerAlign?: FaqAccordionHeaderAlign;
    sectionPaddingX?: FaqAccordionSectionPaddingX;
    sectionPaddingY?: FaqAccordionSectionPaddingY;
    questionTextColor?: string;
    answerTextColor?: string;
    headerTitleColor?: string;
    headerDescriptionColor?: string;
    panelRadius?: FaqAccordionPanelRadius;
    borderWidth?: FaqAccordionBorderWidth;
    headerTitleSize?: FaqAccordionHeaderTitleSize;
    motion?: FaqAccordionMotion;
  };
  seo?: {
    emitFaqJsonLd?: boolean;
  };
};

type FaqMarkdownInlineToken =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string; target?: "_blank"; rel?: string };

type FaqMarkdownBlock =
  | { kind: "paragraph"; tokens: FaqMarkdownInlineToken[] }
  | { kind: "unordered-list"; items: FaqMarkdownInlineToken[][] }
  | { kind: "ordered-list"; items: FaqMarkdownInlineToken[][] };

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const faqAccordionItemMin = 1;
export const faqAccordionItemMax = 12;

const faqAccordionQuestionMaxLength = 180;
const faqAccordionAnswerMaxLength = 2_000;
const faqAccordionIconMaxLength = 16;
const faqAccordionLinkHrefMaxLength = 500;
const faqAccordionMarkdownTokenMax = 80;
const faqAccordionMarkdownNodeMax = 120;
const faqAccordionMarkdownListItemMax = faqAccordionItemMax;
const faqAccordionJsonLdTextMaxLength = 900;

const spacingClassMap: Record<FaqAccordionSpacing, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

const panelPaddingClassMap: Record<FaqAccordionSpacing, string> = {
  none: "px-0 py-0",
  sm: "px-4 py-3",
  md: "px-5 py-4",
  lg: "px-6 py-5",
};

const maxWidthClassMap: Record<FaqAccordionMaxWidth, string> = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-none",
};

const sectionPaddingXClassMap: Record<FaqAccordionSectionPaddingX, string> = {
  none: "px-0",
  sm: "px-2",
  md: "px-4",
  lg: "px-6",
};

const sectionPaddingYClassMap: Record<FaqAccordionSectionPaddingY, string> = {
  none: "py-0",
  sm: "py-4",
  md: "py-8",
  lg: "py-12",
};

const headerAlignClassMap: Record<FaqAccordionHeaderAlign, string> = {
  left: "mr-auto text-left",
  center: "mx-auto text-center",
  right: "ml-auto text-right",
};

const panelRadiusClassMap: Record<FaqAccordionPanelRadius, string> = {
  none: "",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
};

const borderWidthValueMap: Record<FaqAccordionBorderWidth, string> = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
};

const headerTitleSizeClassMap: Record<Exclude<FaqAccordionHeaderTitleSize, "auto">, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

const faqRuntimeClientScript = `
(() => {
  if (typeof document === "undefined") return;

  const syncState = (root) => {
    const items = Array.from(root.querySelectorAll("[data-coderso-faq-item-details]")).filter(
      (node) => node instanceof HTMLDetailsElement
    );

    items.forEach((details) => {
      const summary = details.querySelector("[data-coderso-faq-summary]");
      if (!(summary instanceof HTMLElement)) return;
      summary.setAttribute("aria-expanded", details.open ? "true" : "false");
    });
  };

  document.querySelectorAll("[data-coderso-faq='1']").forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.codersoFaqBound === "true") return;
    root.dataset.codersoFaqBound = "true";

    const items = Array.from(root.querySelectorAll("[data-coderso-faq-item-details]")).filter(
      (node) => node instanceof HTMLDetailsElement
    );

    items.forEach((details) => {
      details.addEventListener("toggle", () => {
        syncState(root);
      });
    });

    syncState(root);
  });
})();
`;

export const faqAccordionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    items: {
      type: "array",
      minItems: faqAccordionItemMin,
      maxItems: faqAccordionItemMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          question: { type: "string", maxLength: faqAccordionQuestionMaxLength },
          answer: { type: "string", maxLength: faqAccordionAnswerMaxLength },
          answerFormat: { enum: ["plain", "markdown"] },
          icon: { type: "string", maxLength: faqAccordionIconMaxLength },
        },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        allowMultipleOpen: { type: "boolean" },
        defaultOpenIndex: { type: "integer", minimum: -1 },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surface: { type: "string" },
        border: { type: "string" },
        divider: { type: "string" },
        spacing: { enum: ["none", "sm", "md", "lg"] },
        maxWidth: { enum: ["sm", "md", "lg", "xl", "full"] },
        headerAlign: { enum: ["left", "center", "right"] },
        sectionPaddingX: { enum: ["none", "sm", "md", "lg"] },
        sectionPaddingY: { enum: ["none", "sm", "md", "lg"] },
        questionTextColor: { type: "string" },
        answerTextColor: { type: "string" },
        headerTitleColor: { type: "string" },
        headerDescriptionColor: { type: "string" },
        panelRadius: { enum: ["none", "sm", "md", "lg", "xl"] },
        borderWidth: { enum: ["0", "1", "2", "3"] },
        headerTitleSize: { enum: ["auto", "sm", "md", "lg", "xl"] },
        motion: { enum: ["none", "smooth"] },
      },
    },
    seo: {
      type: "object",
      additionalProperties: false,
      properties: {
        emitFaqJsonLd: { type: "boolean" },
      },
    },
  },
};

export const faqAccordionDefaults: FaqAccordionData = {
  header: {
    title: "Frequently asked questions",
    description: "Address objections with short and clear answers.",
  },
  items: [
    {
      id: "faq-1",
      question: "How long does setup take?",
      answer: "Most teams configure their first page in under one day using reusable templates.",
      answerFormat: "plain",
      icon: "",
    },
    {
      id: "faq-2",
      question: "Can editors update content without developers?",
      answer:
        "Yes. Editors can update copy, sections, and visual styles directly from the admin panel.",
      answerFormat: "plain",
      icon: "",
    },
    {
      id: "faq-3",
      question: "Does it support responsive layouts?",
      answer:
        "Widgets include responsive controls and preview modes for desktop, tablet, and mobile.",
      answerFormat: "plain",
      icon: "",
    },
  ],
  options: {
    allowMultipleOpen: false,
    defaultOpenIndex: 0,
  },
  style: {
    surface: "var(--color-bg)",
    border: "var(--color-border)",
    divider: "var(--color-border)",
    spacing: "md",
    maxWidth: "xl",
    headerAlign: "center",
    sectionPaddingX: "md",
    sectionPaddingY: "md",
    questionTextColor: "var(--color-text)",
    answerTextColor: "var(--color-text)",
    headerTitleColor: "var(--color-text)",
    headerDescriptionColor: "var(--color-text)",
    panelRadius: "lg",
    borderWidth: "1",
    headerTitleSize: "auto",
    motion: "none",
  },
  seo: {
    emitFaqJsonLd: false,
  },
};

export const faqAccordionEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "faq-accordion.wizard.starter-questions",
      title: "FAQ layout",
      role: "setup",
      writablePaths: ["variant", "items.count"],
      allowedDuplicateWritablePaths: [
        {
          path: "variant",
          reason:
            "Wizard seeds the initial FAQ layout while Visual remains the daily owner after setup.",
          expiresWithTask: "TASK-339",
        },
        {
          path: "items.count",
          reason:
            "Wizard seeds the starting FAQ item count while Visual remains the daily owner after setup.",
          expiresWithTask: "TASK-339",
        },
      ],
      readOnlyPaths: [],
    },
    {
      mode: "visual",
      id: "faq-accordion.visual.variant-layout",
      title: "Variant and layout structure",
      role: "visual",
      writablePaths: ["variant", "items.count"],
      allowedDuplicateWritablePaths: [
        {
          path: "variant",
          reason:
            "Wizard seeds the initial FAQ layout while Visual remains the daily owner after setup.",
          expiresWithTask: "TASK-339",
        },
        {
          path: "items.count",
          reason:
            "Wizard seeds the starting FAQ item count while Visual remains the daily owner after setup.",
          expiresWithTask: "TASK-339",
        },
      ],
    },
    {
      mode: "visual",
      id: "faq-accordion.visual.header-copy",
      title: "Header copy",
      role: "content",
      writablePaths: ["header.title", "header.description"],
    },
    {
      mode: "visual",
      id: "faq-accordion.visual.questions",
      title: "Questions and answers",
      role: "content",
      writablePaths: ["items.question", "items.answer", "items.answerFormat", "items.icon"],
    },
    {
      mode: "visual",
      id: "faq-accordion.visual.display-behavior",
      title: "Display behavior",
      role: "content",
      writablePaths: ["options.allowMultipleOpen", "options.defaultOpenIndex"],
    },
    {
      mode: "visual",
      id: "faq-accordion.visual.layout-typography",
      title: "Layout and typography",
      role: "layout",
      writablePaths: [
        "style.spacing",
        "style.maxWidth",
        "style.headerAlign",
        "style.sectionPaddingX",
        "style.sectionPaddingY",
        "style.headerTitleSize",
        "style.motion",
      ],
    },
    {
      mode: "visual",
      id: "faq-accordion.visual.colors-panel-style",
      title: "Colors and panel style",
      role: "visual",
      writablePaths: [
        "style.surface",
        "style.border",
        "style.divider",
        "style.questionTextColor",
        "style.answerTextColor",
        "style.headerTitleColor",
        "style.headerDescriptionColor",
        "style.panelRadius",
        "style.borderWidth",
      ],
    },
    {
      mode: "visual",
      id: "faq-accordion.visual.search-visibility",
      title: "Search visibility",
      role: "visual",
      writablePaths: ["seo.emitFaqJsonLd"],
    },
    {
      mode: "advanced",
      id: "faq-accordion.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "items", "options", "seo"],
    },
    {
      mode: "advanced",
      id: "faq-accordion.advanced.style-summary",
      title: "Style summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["style"],
    },
    {
      mode: "advanced",
      id: "faq-accordion.advanced.accessibility-diagnostics",
      title: "Accessibility diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["header", "items", "seo"],
    },
    {
      mode: "advanced",
      id: "faq-accordion.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["editorContract"],
    },
    {
      mode: "advanced",
      id: "faq-accordion.advanced.normalization-support",
      title: "Saved data status",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["items", "options", "style"],
    },
  ],
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveTrimmedOptionalString = (value: string | undefined, maxLength?: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return typeof maxLength === "number" ? trimmed.slice(0, maxLength) : trimmed;
};

const resolveTrimmedString = (value: string | undefined, fallback: string, maxLength?: number) => {
  const trimmed = resolveTrimmedOptionalString(value, maxLength);
  return trimmed ?? fallback;
};

const createFaqItemId = (index: number) => `faq-${index + 1}`;

const resolveAllowedValue = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T => (allowed.includes(value as T) ? (value as T) : fallback);

export const resolveFaqAccordionSpacing = (value: string | undefined): FaqAccordionSpacing =>
  resolveAllowedValue(value, ["none", "sm", "md", "lg"], "md");

const resolveFaqAnswerFormat = (value: string | undefined): FaqAccordionAnswerFormat =>
  resolveAllowedValue(value, ["plain", "markdown"], "plain");

const resolveFaqMaxWidth = (value: string | undefined): FaqAccordionMaxWidth =>
  resolveAllowedValue(value, ["sm", "md", "lg", "xl", "full"], "xl");

const resolveFaqHeaderAlign = (value: string | undefined): FaqAccordionHeaderAlign =>
  resolveAllowedValue(value, ["left", "center", "right"], "center");

const resolveFaqSectionPaddingX = (value: string | undefined): FaqAccordionSectionPaddingX =>
  resolveAllowedValue(value, ["none", "sm", "md", "lg"], "md");

const resolveFaqSectionPaddingY = (value: string | undefined): FaqAccordionSectionPaddingY =>
  resolveAllowedValue(value, ["none", "sm", "md", "lg"], "md");

const resolveFaqPanelRadius = (value: string | undefined): FaqAccordionPanelRadius =>
  resolveAllowedValue(value, ["none", "sm", "md", "lg", "xl"], "lg");

const resolveFaqBorderWidth = (value: string | undefined): FaqAccordionBorderWidth =>
  resolveAllowedValue(value, ["0", "1", "2", "3"], "1");

const resolveFaqHeaderTitleSize = (value: string | undefined): FaqAccordionHeaderTitleSize =>
  resolveAllowedValue(value, ["auto", "sm", "md", "lg", "xl"], "auto");

const resolveFaqMotion = (value: string | undefined): FaqAccordionMotion =>
  resolveAllowedValue(value, ["none", "smooth"], "none");

const resolveDefaultOpenIndex = (value: number | undefined, itemCount: number): number => {
  if (!Number.isFinite(value)) return itemCount > 0 ? 0 : -1;
  if (itemCount <= 0) return -1;

  const rounded = Math.floor(value as number);
  if (rounded < 0) return -1;
  if (rounded >= itemCount) return itemCount - 1;
  return rounded;
};

export const resolveFaqAccordionVariant = (variant: string): FaqAccordionVariantId => {
  if (variant === "two-column" || variant === "compact") return variant;
  return "single-column";
};

export const normalizeFaqAccordionItemCount = (value: number) => {
  if (!Number.isFinite(value)) return faqAccordionDefaults.items.length;
  return Math.min(faqAccordionItemMax, Math.max(faqAccordionItemMin, Math.floor(value)));
};

const resolveFaqMarkdownLink = (href: string | undefined) =>
  resolveWidgetLinkAttrs(href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openExternalInNewTab: true,
  });

const faqInlineTokenPattern =
  /(\[([^\]\n]{1,180})\]\(([^)\n]{1,500})\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`)/g;

type FaqMarkdownBudget = {
  tokens: number;
  nodes: number;
  listItems: number;
};

const normalizeFaqAnswerSource = (value: string | undefined) =>
  resolveTrimmedString(value, "Answer", faqAccordionAnswerMaxLength).replace(/\r\n?/g, "\n");

const pushFaqTextToken = (tokens: FaqMarkdownInlineToken[], text: string) => {
  if (text.length === 0) return;
  const previous = tokens[tokens.length - 1];
  if (previous?.kind === "text") {
    previous.text += text;
    return;
  }
  tokens.push({ kind: "text", text });
};

const parseFaqInlineTokens = (
  value: string,
  budget: FaqMarkdownBudget
): FaqMarkdownInlineToken[] => {
  const tokens: FaqMarkdownInlineToken[] = [];
  faqInlineTokenPattern.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while (
    budget.tokens < faqAccordionMarkdownTokenMax &&
    budget.nodes < faqAccordionMarkdownNodeMax &&
    (match = faqInlineTokenPattern.exec(value))
  ) {
    pushFaqTextToken(tokens, value.slice(lastIndex, match.index));
    const fullMatch = match[0];
    const linkLabel = resolveTrimmedOptionalString(match[2], faqAccordionQuestionMaxLength);
    const linkHref = resolveTrimmedOptionalString(match[3], faqAccordionLinkHrefMaxLength);
    const strongText = resolveTrimmedOptionalString(match[4], faqAccordionQuestionMaxLength);
    const emText = resolveTrimmedOptionalString(match[5], faqAccordionQuestionMaxLength);
    const codeText = resolveTrimmedOptionalString(match[6], faqAccordionQuestionMaxLength);

    if (linkLabel && linkHref) {
      const linkAttrs = resolveFaqMarkdownLink(linkHref);
      if (linkAttrs) {
        tokens.push({
          kind: "link",
          text: linkLabel,
          href: linkAttrs.href,
          target: linkAttrs.target,
          rel: linkAttrs.rel,
        });
      } else {
        pushFaqTextToken(tokens, linkLabel);
      }
    } else if (strongText) {
      tokens.push({ kind: "strong", text: strongText });
    } else if (emText) {
      tokens.push({ kind: "em", text: emText });
    } else if (codeText) {
      tokens.push({ kind: "code", text: codeText });
    } else {
      pushFaqTextToken(tokens, fullMatch);
    }

    budget.tokens += 1;
    budget.nodes += 1;
    lastIndex = faqInlineTokenPattern.lastIndex;
  }

  pushFaqTextToken(tokens, value.slice(lastIndex));
  return tokens;
};

const isFaqUnorderedListLine = (value: string) => /^\s*[-*]\s+/.test(value);
const isFaqOrderedListLine = (value: string) => /^\s*\d+\.\s+/.test(value);

const parseFaqMarkdownBlocks = (value: string): FaqMarkdownBlock[] => {
  const source = normalizeFaqAnswerSource(value);
  const lines = source.split("\n");
  const blocks: FaqMarkdownBlock[] = [];
  const budget: FaqMarkdownBudget = { tokens: 0, nodes: 0, listItems: 0 };
  let index = 0;

  while (index < lines.length && budget.nodes < faqAccordionMarkdownNodeMax) {
    const current = lines[index]?.trim() ?? "";
    if (current.length === 0) {
      index += 1;
      continue;
    }

    if (isFaqUnorderedListLine(lines[index] ?? "") || isFaqOrderedListLine(lines[index] ?? "")) {
      const listKind = isFaqOrderedListLine(lines[index] ?? "") ? "ordered-list" : "unordered-list";
      const items: FaqMarkdownInlineToken[][] = [];

      while (index < lines.length && items.length < faqAccordionMarkdownListItemMax) {
        const rawLine = lines[index] ?? "";
        const matchesKind =
          listKind === "ordered-list"
            ? isFaqOrderedListLine(rawLine)
            : isFaqUnorderedListLine(rawLine);
        if (!matchesKind) break;

        const itemText = rawLine.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim();
        items.push(parseFaqInlineTokens(itemText, budget));
        budget.listItems += 1;
        budget.nodes += 1;
        index += 1;
      }

      if (items.length > 0) {
        blocks.push({ kind: listKind, items });
      }
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const rawLine = lines[index] ?? "";
      if (rawLine.trim().length === 0) break;
      if (isFaqUnorderedListLine(rawLine) || isFaqOrderedListLine(rawLine)) break;
      paragraphLines.push(rawLine.trim());
      index += 1;
    }

    const paragraphText = paragraphLines.join(" ");
    if (paragraphText.length > 0) {
      blocks.push({
        kind: "paragraph",
        tokens: parseFaqInlineTokens(paragraphText, budget),
      });
      budget.nodes += 1;
    }
  }

  return blocks;
};

const renderFaqInlineTokens = (tokens: FaqMarkdownInlineToken[], keyPrefix: string): ReactNode =>
  tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (token.kind) {
      case "strong":
        return <strong key={key}>{token.text}</strong>;
      case "em":
        return <em key={key}>{token.text}</em>;
      case "code":
        return (
          <code key={key} className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.92em]">
            {token.text}
          </code>
        );
      case "link":
        return (
          <a
            key={key}
            href={token.href}
            target={token.target}
            rel={token.rel}
            className="font-medium underline underline-offset-4"
          >
            {token.text}
          </a>
        );
      default:
        return token.text;
    }
  });

const renderFaqMarkdownAnswer = (value: string | undefined): ReactNode => {
  const blocks = parseFaqMarkdownBlocks(value ?? "");
  if (blocks.length === 0)
    return resolveTrimmedOptionalString(value, faqAccordionAnswerMaxLength) ?? "";

  return blocks.map((block, index) => {
    if (block.kind === "paragraph") {
      return (
        <p key={`paragraph-${index}`} className="leading-relaxed">
          {renderFaqInlineTokens(block.tokens, `paragraph-${index}`)}
        </p>
      );
    }

    const ListTag = block.kind === "ordered-list" ? "ol" : "ul";
    return (
      <ListTag
        key={`${block.kind}-${index}`}
        className={joinClasses(
          "space-y-1 pl-5",
          block.kind === "ordered-list" ? "list-decimal" : "list-disc"
        )}
      >
        {block.items.map((itemTokens, itemIndex) => (
          <li key={`${block.kind}-${index}-${itemIndex}`}>
            {renderFaqInlineTokens(itemTokens, `${block.kind}-${index}-${itemIndex}`)}
          </li>
        ))}
      </ListTag>
    );
  });
};

const faqInlineTokensToText = (tokens: FaqMarkdownInlineToken[]) =>
  tokens
    .map((token) => token.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();

export function extractFaqAnswerPlainText(item: FaqAccordionItem): string {
  const answer = resolveTrimmedOptionalString(item.answer, faqAccordionAnswerMaxLength) ?? "";
  if (resolveFaqAnswerFormat(item.answerFormat) !== "markdown") {
    return answer.slice(0, faqAccordionJsonLdTextMaxLength);
  }

  const text = parseFaqMarkdownBlocks(answer)
    .map((block) => {
      if (block.kind === "paragraph") return faqInlineTokensToText(block.tokens);
      return block.items.map((tokens) => faqInlineTokensToText(tokens)).join(" ");
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, faqAccordionJsonLdTextMaxLength);
}

export function serializeJsonLdForScript(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    switch (character) {
      case "<":
        return "\\u003C";
      case ">":
        return "\\u003E";
      case "&":
        return "\\u0026";
      case "\u2028":
        return "\\u2028";
      case "\u2029":
        return "\\u2029";
      default:
        return character;
    }
  });
}

export function buildFaqAccordionJsonLd(data: FaqAccordionData) {
  const normalized = normalizeFaqAccordionData(data);
  if (!normalized.seo?.emitFaqJsonLd) return null;

  const mainEntity = normalized.items
    .map((item) => {
      const question = (item.question ?? "").trim();
      const text = extractFaqAnswerPlainText(item);
      if (question.length === 0 || text.length === 0) return null;
      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text,
        },
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (mainEntity.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

export function normalizeFaqAccordionItems(
  items: FaqAccordionItem[] | undefined,
  desiredCount?: number
): FaqAccordionItem[] {
  const source = Array.isArray(items) ? items : [];
  const fallbackQuestions = [
    "How long does setup take?",
    "Can editors update content without developers?",
    "Does it support responsive layouts?",
    "Can I reuse this on multiple pages?",
  ];
  const fallbackAnswers = [
    "Most teams configure their first page in under one day using reusable templates.",
    "Yes. Editors can update copy, sections, and visual styles directly from the admin panel.",
    "Widgets include responsive controls and preview modes for desktop, tablet, and mobile.",
    "Yes. Save it as a template and reuse it across pages.",
  ];

  const targetCount =
    typeof desiredCount === "number"
      ? normalizeFaqAccordionItemCount(desiredCount)
      : normalizeFaqAccordionItemCount(
          source.length > 0 ? source.length : faqAccordionDefaults.items.length
        );

  const normalized: FaqAccordionItem[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};
    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createFaqItemId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`faq-${candidate}`)) {
        candidate += 1;
      }
      id = `faq-${candidate}`;
    }
    usedIds.add(id);

    const question = resolveTrimmedString(
      base.question,
      fallbackQuestions[index] ?? `Question ${index + 1}`,
      faqAccordionQuestionMaxLength
    );
    const answer = resolveTrimmedString(
      base.answer,
      fallbackAnswers[index] ?? `Answer ${index + 1}`,
      faqAccordionAnswerMaxLength
    );

    normalized.push({
      id,
      question,
      answer,
      answerFormat: resolveFaqAnswerFormat(base.answerFormat),
      icon: resolveTrimmedOptionalString(base.icon, faqAccordionIconMaxLength) ?? "",
    });
  }

  return normalized;
}

export function normalizeFaqAccordionData(data: FaqAccordionData): FaqAccordionData {
  const headerDefaults = faqAccordionDefaults.header ?? {
    title: "",
    description: "",
  };
  const optionsDefaults = faqAccordionDefaults.options ?? {
    allowMultipleOpen: false,
    defaultOpenIndex: 0,
  };
  const styleDefaults = faqAccordionDefaults.style ?? {
    surface: "var(--color-bg)",
    border: "var(--color-border)",
    divider: "var(--color-border)",
    spacing: "md",
    maxWidth: "xl",
    headerAlign: "center",
    sectionPaddingX: "md",
    sectionPaddingY: "md",
    questionTextColor: "var(--color-text)",
    answerTextColor: "var(--color-text)",
    headerTitleColor: "var(--color-text)",
    headerDescriptionColor: "var(--color-text)",
    panelRadius: "lg",
    borderWidth: "1",
    headerTitleSize: "auto",
    motion: "none",
  };
  const seoDefaults = faqAccordionDefaults.seo ?? {
    emitFaqJsonLd: false,
  };
  const hasStyleObject = data.style !== undefined;
  const items = normalizeFaqAccordionItems(data.items);
  const defaultOpenIndex = resolveDefaultOpenIndex(data.options?.defaultOpenIndex, items.length);

  return {
    ...data,
    header: {
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
    },
    items,
    options: {
      allowMultipleOpen:
        typeof data.options?.allowMultipleOpen === "boolean"
          ? data.options.allowMultipleOpen
          : Boolean(optionsDefaults.allowMultipleOpen),
      defaultOpenIndex:
        typeof data.options?.defaultOpenIndex === "number"
          ? defaultOpenIndex
          : resolveDefaultOpenIndex(optionsDefaults.defaultOpenIndex, items.length),
    },
    style: {
      surface: hasStyleObject
        ? resolveClearableStyleValue(data.style?.surface)
        : styleDefaults.surface,
      border: hasStyleObject
        ? resolveClearableStyleValue(data.style?.border)
        : styleDefaults.border,
      divider: hasStyleObject
        ? resolveClearableStyleValue(data.style?.divider)
        : styleDefaults.divider,
      spacing: resolveFaqAccordionSpacing(data.style?.spacing ?? styleDefaults.spacing),
      maxWidth: resolveFaqMaxWidth(data.style?.maxWidth ?? styleDefaults.maxWidth),
      headerAlign: resolveFaqHeaderAlign(data.style?.headerAlign ?? styleDefaults.headerAlign),
      sectionPaddingX: resolveFaqSectionPaddingX(
        data.style?.sectionPaddingX ?? styleDefaults.sectionPaddingX
      ),
      sectionPaddingY: resolveFaqSectionPaddingY(
        data.style?.sectionPaddingY ?? styleDefaults.sectionPaddingY
      ),
      questionTextColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.questionTextColor)
        : styleDefaults.questionTextColor,
      answerTextColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.answerTextColor)
        : styleDefaults.answerTextColor,
      headerTitleColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.headerTitleColor)
        : styleDefaults.headerTitleColor,
      headerDescriptionColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.headerDescriptionColor)
        : styleDefaults.headerDescriptionColor,
      panelRadius: resolveFaqPanelRadius(data.style?.panelRadius ?? styleDefaults.panelRadius),
      borderWidth: resolveFaqBorderWidth(data.style?.borderWidth ?? styleDefaults.borderWidth),
      headerTitleSize: resolveFaqHeaderTitleSize(
        data.style?.headerTitleSize ?? styleDefaults.headerTitleSize
      ),
      motion: resolveFaqMotion(data.style?.motion ?? styleDefaults.motion),
    },
    seo: {
      emitFaqJsonLd:
        typeof data.seo?.emitFaqJsonLd === "boolean"
          ? data.seo.emitFaqJsonLd
          : Boolean(seoDefaults.emitFaqJsonLd),
    },
  };
}

const getFaqRuntimeClientScript = () => faqRuntimeClientScript;

export function FaqAccordionBlock({
  data,
  variant,
  blockId,
}: {
  data: FaqAccordionData;
  variant: string;
  blockId?: string;
}) {
  const resolvedVariant = resolveFaqAccordionVariant(variant);
  const normalizedData = normalizeFaqAccordionData(data);
  const style = normalizedData.style ?? faqAccordionDefaults.style!;
  const options = normalizedData.options ?? faqAccordionDefaults.options!;
  const spacing = resolveFaqAccordionSpacing(style.spacing);
  const itemCount = normalizedData.items.length;
  const defaultOpenIndex = resolveDefaultOpenIndex(options.defaultOpenIndex, itemCount);
  const allowMultipleOpen = Boolean(options.allowMultipleOpen);
  const compact = resolvedVariant === "compact";
  const rootInstanceId = createWidgetInstanceId("faq-accordion", blockId, "faq");
  const detailsGroupName = scopedId(rootInstanceId, "group");
  const showHeader =
    (normalizedData.header?.title ?? "").trim().length > 0 ||
    (normalizedData.header?.description ?? "").trim().length > 0;
  const headerTitleSize = style.headerTitleSize ?? "auto";
  const resolvedHeaderTitleSize =
    headerTitleSize === "auto" ? (compact ? "md" : "lg") : headerTitleSize;
  const borderWidthValue = borderWidthValueMap[resolveFaqBorderWidth(style.borderWidth)] ?? "1px";
  const panelStyleBase: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.surface),
      borderColor: resolveClearableStyleValue(style.border) ?? "var(--color-border)",
      borderStyle: "solid",
      borderWidth: borderWidthValue,
    }) ?? {};
  const questionColor = resolveClearableStyleValue(style.questionTextColor);
  const answerColor = resolveClearableStyleValue(style.answerTextColor);
  const headerTitleColor = resolveClearableStyleValue(style.headerTitleColor);
  const headerDescriptionColor = resolveClearableStyleValue(style.headerDescriptionColor);
  const motion = resolveFaqMotion(style.motion);
  const sectionLabelId =
    showHeader && (normalizedData.header?.title ?? "").trim().length > 0
      ? scopedId(rootInstanceId, "heading")
      : undefined;
  const jsonLd = buildFaqAccordionJsonLd(normalizedData);
  const serializedJsonLd = jsonLd ? serializeJsonLdForScript(jsonLd) : null;

  const listClassName =
    resolvedVariant === "two-column"
      ? joinClasses("grid grid-cols-1 lg:grid-cols-2", spacingClassMap[spacing])
      : joinClasses("grid grid-cols-1", spacingClassMap[spacing]);
  const panelPaddingClass =
    spacing === "none"
      ? panelPaddingClassMap.none
      : compact
        ? "px-4 py-3"
        : panelPaddingClassMap[spacing];
  const summaryClassName = compact ? "text-sm font-semibold" : "text-base font-semibold";
  const answerClassName = compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed";
  const headerDescriptionClassName = compact ? "text-sm" : "text-base";

  return (
    <section
      aria-labelledby={sectionLabelId}
      aria-label={sectionLabelId ? undefined : "Frequently asked questions"}
      className={joinClasses(
        "mx-auto w-full",
        maxWidthClassMap[style.maxWidth ?? "xl"],
        sectionPaddingXClassMap[style.sectionPaddingX ?? "md"],
        sectionPaddingYClassMap[style.sectionPaddingY ?? "md"]
      )}
      data-coderso-faq="1"
      data-faq-variant={resolvedVariant}
      data-faq-spacing={spacing}
      data-faq-count={String(itemCount)}
      data-faq-multiple-open={String(allowMultipleOpen)}
      data-faq-default-open={String(defaultOpenIndex)}
      data-faq-motion={motion}
    >
      {showHeader ? (
        <header
          className={joinClasses(
            "mb-6 max-w-3xl space-y-2",
            headerAlignClassMap[style.headerAlign ?? "center"]
          )}
        >
          {(normalizedData.header?.title ?? "").trim().length > 0 ? (
            <h3
              id={sectionLabelId}
              className={joinClasses(
                headerTitleSizeClassMap[resolvedHeaderTitleSize],
                "font-semibold"
              )}
              style={compactStyle({ color: headerTitleColor })}
            >
              {normalizedData.header?.title}
            </h3>
          ) : null}
          {(normalizedData.header?.description ?? "").trim().length > 0 ? (
            <p
              className={joinClasses(headerDescriptionClassName, "text-[var(--color-text)]/75")}
              style={compactStyle({ color: headerDescriptionColor })}
            >
              {normalizedData.header?.description}
            </p>
          ) : null}
        </header>
      ) : null}

      <div className={listClassName}>
        {normalizedData.items.map((item, index) => {
          const open = defaultOpenIndex === index;
          const summaryId = scopedId(rootInstanceId, `summary-${item.id ?? index + 1}`);
          const contentId = scopedId(rootInstanceId, `content-${item.id ?? index + 1}`);
          const icon = resolveTrimmedOptionalString(item.icon, faqAccordionIconMaxLength);
          const detailsBorderCollapseStyle =
            spacing === "none" && index > 0
              ? ({ marginTop: `calc(-1 * ${borderWidthValue})` } as CSSProperties)
              : undefined;
          const contentStyle = compactStyle({
            borderColor: resolveClearableStyleValue(style.divider) ?? "var(--color-border)",
            color: answerColor,
          });

          return (
            <div
              key={item.id ?? `faq-item-${index + 1}`}
              className={joinClasses(
                "overflow-hidden border",
                panelRadiusClassMap[style.panelRadius ?? "lg"]
              )}
              style={compactStyle({
                ...panelStyleBase,
                marginTop: detailsBorderCollapseStyle?.marginTop,
              })}
              data-faq-item={String(index + 1)}
              data-faq-item-open={String(open)}
            >
              <details
                open={open}
                name={allowMultipleOpen ? undefined : detailsGroupName}
                className="group"
                data-coderso-faq-item-details
              >
                <summary
                  id={summaryId}
                  aria-controls={contentId}
                  aria-expanded={open ? "true" : "false"}
                  className={joinClasses(
                    "flex cursor-pointer list-none items-center justify-between gap-3",
                    panelPaddingClass,
                    summaryClassName
                  )}
                  style={compactStyle({ color: questionColor })}
                  data-coderso-faq-summary
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {icon ? (
                      <span aria-hidden="true" className="inline-flex shrink-0">
                        {icon}
                      </span>
                    ) : null}
                    <span>{item.question}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={joinClasses(
                      "shrink-0 text-xs text-[var(--color-text)]/60 transition-transform",
                      motion === "smooth" ? "group-open:rotate-180" : undefined
                    )}
                  >
                    ▾
                  </span>
                </summary>
                {motion === "smooth" ? (
                  <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-out group-open:grid-rows-[1fr] group-open:opacity-100">
                    <div className="min-h-0 overflow-hidden">
                      <div
                        id={contentId}
                        role="region"
                        aria-labelledby={summaryId}
                        className={joinClasses(
                          panelPaddingClass,
                          answerClassName,
                          "space-y-2 border-t"
                        )}
                        style={contentStyle}
                      >
                        {resolveFaqAnswerFormat(item.answerFormat) === "markdown"
                          ? renderFaqMarkdownAnswer(item.answer)
                          : item.answer}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    id={contentId}
                    role="region"
                    aria-labelledby={summaryId}
                    className={joinClasses(
                      panelPaddingClass,
                      answerClassName,
                      "space-y-2 border-t text-[var(--color-text)]/80"
                    )}
                    style={contentStyle}
                  >
                    {resolveFaqAnswerFormat(item.answerFormat) === "markdown"
                      ? renderFaqMarkdownAnswer(item.answer)
                      : item.answer}
                  </div>
                )}
              </details>
            </div>
          );
        })}
      </div>
      <script dangerouslySetInnerHTML={{ __html: getFaqRuntimeClientScript() }} />
      {serializedJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializedJsonLd }} />
      ) : null}
    </section>
  );
}

export function createFaqAccordionWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<FaqAccordionData>>;
  visual: ComponentType<WidgetEditorProps<FaqAccordionData>>;
  advanced: ComponentType<WidgetEditorProps<FaqAccordionData>>;
}): WidgetDefinition<FaqAccordionData> {
  return {
    type: "faq-accordion",
    title: "FAQ Accordion",
    description: "Expandable list of questions and answers for objection handling.",
    category: "content",
    variants: [
      {
        id: "single-column",
        label: "Single Column",
        description: "Single-column list for clear reading flow.",
      },
      {
        id: "two-column",
        label: "Two Column",
        description: "Two-column FAQ layout for denser content sections.",
      },
      {
        id: "compact",
        label: "Compact",
        description: "Compact row spacing for short FAQ snippets.",
      },
    ],
    schema: faqAccordionSchema,
    defaults: faqAccordionDefaults,
    editor: editors,
    editorContract: faqAccordionEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: FaqAccordionBlock,
  };
}
