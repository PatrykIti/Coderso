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
};

const footerColumnCountByVariant = {
  "columns-2": 2,
  "columns-3": 3,
  minimal: 1,
} as const;

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
  const gridClass =
    visibleColumnCount === 3
      ? "md:grid-cols-3"
      : visibleColumnCount === 1
        ? "md:grid-cols-1"
        : "md:grid-cols-2";
  const legal = data.legal ?? footerDefaults.legal;
  const social = Array.isArray(data.social) ? data.social : footerDefaults.social;
  const bottomSlotBlocks = slots?.bottom ?? [];

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-10 text-sm text-[var(--color-text)]/70">
      <div className={`mx-auto grid w-full max-w-6xl gap-6 ${gridClass}`}>
        {columns.map((column, index) => {
          const slotId = footerColumnSlotIds[index];
          const slotBlocks = slotId ? slots?.[slotId] ?? [] : [];
          return (
          <div key={`${column.title}-${index}`} className="space-y-2">
            <p className="text-xs font-semibold uppercase text-[var(--color-text)]/80">
              {column.title}
            </p>
            <ul className="space-y-1">
              {column.links.map((link, linkIndex) => (
                <li key={`${link.label}-${link.href}-${linkIndex}`}>
                  <a href={link.href}>{link.label}</a>
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
      <div className="mx-auto mt-8 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4 text-xs">
        <span>{legal?.copyright}</span>
        <div className="flex flex-wrap items-center gap-4">
          {bottomSlotBlocks.map((slotBlock) => (
            <WidgetRenderer
              key={slotBlock.id}
              block={slotBlock}
              previewDevice={previewDevice}
            />
          ))}
          {legal?.privacy ? <a href={legal.privacy}>Privacy</a> : null}
          {legal?.terms ? <a href={legal.terms}>Terms</a> : null}
          {social?.map((socialEntry, socialIndex) => (
            <a
              key={`${socialEntry.type}-${socialEntry.href}-${socialIndex}`}
              href={socialEntry.href}
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
    render: FooterBlock,
  };
}
