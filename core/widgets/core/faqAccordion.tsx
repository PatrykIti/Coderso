import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type FaqAccordionVariantId = "single-column" | "two-column" | "compact";
export type FaqAccordionSpacing = "none" | "sm" | "md" | "lg";

export type FaqAccordionItem = {
  id?: string;
  question?: string;
  answer?: string;
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
  };
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

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

const faqAccordionItemMin = 1;
export const faqAccordionItemMax = 12;

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
          question: { type: "string" },
          answer: { type: "string" },
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
    },
    {
      id: "faq-2",
      question: "Can editors update content without developers?",
      answer:
        "Yes. Editors can update copy, sections, and visual styles directly from the admin panel.",
    },
    {
      id: "faq-3",
      question: "Does it support responsive layouts?",
      answer:
        "Widgets include responsive controls and preview modes for desktop, tablet, and mobile.",
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
  },
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const createFaqItemId = (index: number) => `faq-${index + 1}`;

const resolveFaqAccordionSpacing = (value: string | undefined): FaqAccordionSpacing => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

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

    const question =
      typeof base.question === "string" && base.question.trim().length > 0
        ? base.question.trim()
        : (fallbackQuestions[index] ?? `Question ${index + 1}`);

    const answer =
      typeof base.answer === "string" && base.answer.trim().length > 0
        ? base.answer.trim()
        : (fallbackAnswers[index] ?? `Answer ${index + 1}`);

    normalized.push({
      id,
      question,
      answer,
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
  };

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
      surface: resolveString(data.style?.surface, styleDefaults.surface ?? "var(--color-bg)"),
      border: resolveString(data.style?.border, styleDefaults.border ?? "var(--color-border)"),
      divider: resolveString(data.style?.divider, styleDefaults.divider ?? "var(--color-border)"),
      spacing: resolveFaqAccordionSpacing(data.style?.spacing),
    },
  };
}

export function FaqAccordionBlock({ data, variant }: { data: FaqAccordionData; variant: string }) {
  const resolvedVariant = resolveFaqAccordionVariant(variant);
  const normalizedData = normalizeFaqAccordionData(data);
  const style = normalizedData.style ?? faqAccordionDefaults.style!;
  const options = normalizedData.options ?? faqAccordionDefaults.options!;

  const spacing = resolveFaqAccordionSpacing(style.spacing);
  const itemCount = normalizedData.items.length;
  const defaultOpenIndex = resolveDefaultOpenIndex(options.defaultOpenIndex, itemCount);
  const allowMultipleOpen = Boolean(options.allowMultipleOpen);

  const showHeader =
    (normalizedData.header?.title ?? "").trim().length > 0 ||
    (normalizedData.header?.description ?? "").trim().length > 0;

  const sectionStyle: CSSProperties = {
    backgroundColor: "transparent",
  };

  const panelStyle: CSSProperties = {
    backgroundColor: style.surface ?? "var(--color-bg)",
    borderColor: style.border ?? "var(--color-border)",
    borderStyle: "solid",
    borderWidth: "1px",
  };

  const compact = resolvedVariant === "compact";
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

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      style={sectionStyle}
      data-faq-variant={resolvedVariant}
      data-faq-spacing={spacing}
      data-faq-count={String(itemCount)}
      data-faq-multiple-open={String(allowMultipleOpen)}
      data-faq-default-open={String(defaultOpenIndex)}
    >
      {showHeader ? (
        <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center">
          {(normalizedData.header?.title ?? "").trim().length > 0 ? (
            <h3 className={compact ? "text-xl font-semibold" : "text-2xl font-semibold"}>
              {normalizedData.header?.title}
            </h3>
          ) : null}
          {(normalizedData.header?.description ?? "").trim().length > 0 ? (
            <p
              className={
                compact
                  ? "text-sm text-[var(--color-text)]/75"
                  : "text-base text-[var(--color-text)]/75"
              }
            >
              {normalizedData.header?.description}
            </p>
          ) : null}
        </header>
      ) : null}

      <div className={listClassName}>
        {normalizedData.items.map((item, index) => {
          const open = defaultOpenIndex === index;
          return (
            <article
              key={item.id ?? `faq-item-${index + 1}`}
              className="overflow-hidden rounded-xl border"
              style={panelStyle}
              data-faq-item={String(index + 1)}
              data-faq-item-open={String(open)}
            >
              <details open={open}>
                <summary
                  className={joinClasses(
                    "cursor-pointer list-none",
                    panelPaddingClass,
                    summaryClassName
                  )}
                >
                  {item.question}
                </summary>
                <div
                  className={joinClasses(
                    panelPaddingClass,
                    answerClassName,
                    "border-t text-[var(--color-text)]/80"
                  )}
                  style={{ borderColor: style.divider ?? "var(--color-border)" }}
                >
                  {item.answer}
                </div>
              </details>
            </article>
          );
        })}
      </div>
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
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: FaqAccordionBlock,
  };
}
