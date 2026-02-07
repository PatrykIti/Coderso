import type { ComponentType } from "react";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
} from "../types";

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export type FooterSocial = {
  type: string;
  href: string;
};

export type FooterLegal = {
  copyright?: string;
  privacy?: string;
  terms?: string;
};

export type FooterData = {
  columns: FooterColumn[];
  legal?: FooterLegal;
  social?: FooterSocial[];
  layout?: {
    align?: "left" | "center" | "right";
    legalAlign?: "left" | "center" | "right";
    maxWidth?: "5xl" | "6xl" | "7xl";
    columnGap?: "4" | "6" | "8";
    sectionPaddingY?: "8" | "10" | "12";
  };
  style?: {
    surfaceColor?: string;
    borderColor?: string;
    borderTopWidth?: "0" | "1" | "2" | "3";
    textColor?: string;
    headingColor?: string;
    linkColor?: string;
    legalTextColor?: string;
    socialColor?: string;
    fontSize?: "xs" | "sm" | "base";
    headingTransform?: "none" | "uppercase" | "capitalize";
  };
};

export const footerColumnSlotIds = [
  "column-1",
  "column-2",
  "column-3",
] as const;
export type FooterColumnSlotId = (typeof footerColumnSlotIds)[number];

export const footerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["columns"],
  properties: {
    columns: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "links"],
        properties: {
          title: { type: "string" },
          links: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "href"],
              properties: {
                label: { type: "string" },
                href: { type: "string" },
              },
            },
          },
        },
      },
    },
    legal: {
      type: "object",
      additionalProperties: false,
      properties: {
        copyright: { type: "string" },
        privacy: { type: "string" },
        terms: { type: "string" },
      },
    },
    social: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "href"],
        properties: {
          type: { type: "string" },
          href: { type: "string" },
        },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        align: { enum: ["left", "center", "right"] },
        legalAlign: { enum: ["left", "center", "right"] },
        maxWidth: { enum: ["5xl", "6xl", "7xl"] },
        columnGap: { enum: ["4", "6", "8"] },
        sectionPaddingY: { enum: ["8", "10", "12"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surfaceColor: { type: "string" },
        borderColor: { type: "string" },
        borderTopWidth: { enum: ["0", "1", "2", "3"] },
        textColor: { type: "string" },
        headingColor: { type: "string" },
        linkColor: { type: "string" },
        legalTextColor: { type: "string" },
        socialColor: { type: "string" },
        fontSize: { enum: ["xs", "sm", "base"] },
        headingTransform: { enum: ["none", "uppercase", "capitalize"] },
      },
    },
  },
};

export const footerDefaults: FooterData = {
  columns: [
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Careers", href: "/careers" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Support", href: "/support" },
      ],
    },
    {
      title: "Product",
      links: [
        { label: "Features", href: "/features" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
  ],
  legal: { copyright: "© 2026 Nextless", privacy: "/privacy", terms: "/terms" },
  social: [
    { type: "twitter", href: "https://twitter.com" },
    { type: "linkedin", href: "https://linkedin.com" },
  ],
  layout: {
    align: "left",
    legalAlign: "right",
    maxWidth: "6xl",
    columnGap: "6",
    sectionPaddingY: "10",
  },
  style: {
    borderTopWidth: "1",
    fontSize: "sm",
    headingTransform: "uppercase",
  },
};

const footerColumnCountByVariant = {
  "columns-2": 2,
  "columns-3": 3,
  minimal: 1,
} as const;

const maxWidthClassMap = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

const gapClassMap = {
  "4": "gap-4",
  "6": "gap-6",
  "8": "gap-8",
} as const;

const sectionPaddingYClassMap = {
  "8": "py-8",
  "10": "py-10",
  "12": "py-12",
} as const;

const fontSizeClassMap = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
} as const;

const headingTransformClassMap = {
  none: "normal-case",
  uppercase: "uppercase",
  capitalize: "capitalize",
} as const;

const alignClassMap = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

const justifyClassMap = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const;

const borderWidthValueMap = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
} as const;

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const normalizeFooterLink = (link: FooterLink, index: number): FooterLink => {
  const label = link.label?.trim() || `Link ${index + 1}`;
  const href = link.href?.trim() || "#";
  return { label, href };
};

const normalizeFooterColumn = (column: FooterColumn, index: number): FooterColumn => {
  const title = column.title?.trim() || `Column ${index + 1}`;
  const links = Array.isArray(column.links)
    ? column.links.map(normalizeFooterLink)
    : [];
  return { title, links };
};

export const resolveFooterColumnCount = (variant: string) =>
  footerColumnCountByVariant[variant as keyof typeof footerColumnCountByVariant] ?? 2;

export function resolveFooterColumnsForVariant(
  columns: FooterColumn[],
  variant: string
): FooterColumn[] {
  const requestedCount = resolveFooterColumnCount(variant);
  const input = Array.isArray(columns) ? columns : [];
  const normalizedInput = input.map(normalizeFooterColumn);
  const normalizedDefaults = footerDefaults.columns.map(normalizeFooterColumn);
  const result: FooterColumn[] = [];

  for (let index = 0; index < requestedCount; index += 1) {
    const base = normalizedInput[index] ?? normalizedDefaults[index] ?? {
      title: `Column ${index + 1}`,
      links: [],
    };
    result.push(base);
  }

  return result;
}

export function FooterBlock({
  data,
  variant,
  slots,
  previewDevice,
}: {
  data: FooterData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
}) {
  const columns = resolveFooterColumnsForVariant(data.columns, variant);
  const visibleColumnCount = columns.length;
  const layout = data.layout ?? {};
  const style = data.style ?? {};
  const align = layout.align ?? "left";
  const legalAlign = layout.legalAlign ?? "right";
  const gridClass =
    visibleColumnCount === 3
      ? "md:grid-cols-3"
      : visibleColumnCount === 1
        ? "md:grid-cols-1"
        : "md:grid-cols-2";
  const legal = data.legal ?? footerDefaults.legal;
  const social = Array.isArray(data.social) ? data.social : footerDefaults.social;
  const bottomSlotBlocks = slots?.bottom ?? [];
  const outerStyle = {
    backgroundColor: style.surfaceColor ?? "var(--color-bg)",
    borderColor: style.borderColor ?? "var(--color-border)",
    borderTopWidth: borderWidthValueMap[style.borderTopWidth ?? "1"] ?? "1px",
    color: style.textColor ?? "var(--color-text)",
  };
  const headingStyle = {
    color: style.headingColor ?? style.textColor ?? "var(--color-text)",
  };
  const linkStyle = {
    color: style.linkColor ?? style.textColor ?? "var(--color-text)",
  };
  const legalStyle = {
    color: style.legalTextColor ?? style.textColor ?? "var(--color-text)",
  };
  const socialStyle = {
    color: style.socialColor ?? style.linkColor ?? style.textColor ?? "var(--color-text)",
  };

  return (
    <footer
      className={joinClasses(
        "border-t px-6",
        sectionPaddingYClassMap[layout.sectionPaddingY ?? "10"] ?? "py-10",
        fontSizeClassMap[style.fontSize ?? "sm"] ?? "text-sm"
      )}
      style={outerStyle}
    >
      <div
        className={joinClasses(
          "mx-auto grid w-full",
          maxWidthClassMap[layout.maxWidth ?? "6xl"] ?? "max-w-6xl",
          gapClassMap[layout.columnGap ?? "6"] ?? "gap-6",
          gridClass
        )}
      >
        {columns.map((column, index) => {
          const slotId = footerColumnSlotIds[index];
          const slotBlocks = slotId ? slots?.[slotId] ?? [] : [];
          return (
            <div
              key={`${column.title}-${index}`}
              className={joinClasses("space-y-2", alignClassMap[align] ?? "text-left")}
            >
              <p
                className={joinClasses(
                  "text-xs font-semibold",
                  headingTransformClassMap[style.headingTransform ?? "uppercase"] ??
                    "uppercase"
                )}
                style={headingStyle}
              >
                {column.title}
              </p>
              <ul className="space-y-1">
                {column.links.map((link, linkIndex) => (
                  <li key={`${link.label}-${link.href}-${linkIndex}`}>
                    <a href={link.href} style={linkStyle}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              {slotBlocks.length > 0 ? (
                <div className="pt-2">
                  <div className="flex flex-col gap-3">
                    {slotBlocks.map((slotBlock) => (
                      <WidgetRenderer
                        key={slotBlock.id}
                        block={slotBlock}
                        previewDevice={previewDevice}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div
        className={joinClasses(
          "mx-auto mt-8 flex w-full flex-wrap items-center gap-4 border-t pt-4 text-xs",
          maxWidthClassMap[layout.maxWidth ?? "6xl"] ?? "max-w-6xl",
          justifyClassMap[legalAlign] ?? "justify-end"
        )}
        style={{
          borderColor: style.borderColor ?? "var(--color-border)",
        }}
      >
        <span style={legalStyle}>{legal?.copyright}</span>
        <div className={joinClasses("flex flex-wrap items-center gap-4")}>
          {bottomSlotBlocks.map((slotBlock) => (
            <WidgetRenderer
              key={slotBlock.id}
              block={slotBlock}
              previewDevice={previewDevice}
            />
          ))}
          {legal?.privacy ? (
            <a href={legal.privacy} style={linkStyle}>
              Privacy
            </a>
          ) : null}
          {legal?.terms ? (
            <a href={legal.terms} style={linkStyle}>
              Terms
            </a>
          ) : null}
          {social?.map((socialEntry, socialIndex) => (
            <a
              key={`${socialEntry.type}-${socialEntry.href}-${socialIndex}`}
              href={socialEntry.href}
              style={socialStyle}
            >
              {socialEntry.type}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export function createFooterWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<FooterData>>;
  visual: ComponentType<WidgetEditorProps<FooterData>>;
  advanced: ComponentType<WidgetEditorProps<FooterData>>;
}): WidgetDefinition<FooterData> {
  return {
    type: "footer",
    title: "Footer",
    description: "Footer with links and company info.",
    category: "navigation",
    slots: [
      { id: "column-1", label: "Column 1" },
      { id: "column-2", label: "Column 2" },
      { id: "column-3", label: "Column 3" },
      { id: "bottom", label: "Bottom Strip" },
    ],
    variants: [
      { id: "columns-2", label: "Columns 2" },
      { id: "columns-3", label: "Columns 3" },
      { id: "minimal", label: "Minimal" },
    ],
    schema: footerSchema,
    defaults: footerDefaults,
    editor: editors,
    editorCapabilities: { visualOwnsVariantSelection: true },
    render: FooterBlock,
  };
}
