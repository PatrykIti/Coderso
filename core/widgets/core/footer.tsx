import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

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
  ],
  legal: { copyright: "© 2026 Nextless", privacy: "/privacy", terms: "/terms" },
  social: [
    { type: "twitter", href: "https://twitter.com" },
    { type: "linkedin", href: "https://linkedin.com" },
  ],
};

export function FooterBlock({
  data,
  variant,
}: {
  data: FooterData;
  variant: string;
}) {
  const isMinimal = variant === "minimal";
  const columns = isMinimal ? data.columns.slice(0, 1) : data.columns;
  const gridClass = variant === "columns-3" ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-10 text-sm text-[var(--color-text)]/70">
      <div
        className={`mx-auto grid w-full max-w-6xl gap-6 ${
          isMinimal ? "md:grid-cols-1" : gridClass
        }`}
      >
        {columns.map((column, index) => (
          <div key={`${column.title}-${index}`} className="space-y-2">
            <p className="text-xs font-semibold uppercase text-[var(--color-text)]/80">
              {column.title}
            </p>
            <ul className="space-y-1">
              {column.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-8 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4 text-xs">
        <span>{data.legal?.copyright}</span>
        <div className="flex flex-wrap items-center gap-4">
          {data.legal?.privacy ? <a href={data.legal.privacy}>Privacy</a> : null}
          {data.legal?.terms ? <a href={data.legal.terms}>Terms</a> : null}
          {data.social?.map((social) => (
            <a key={social.href} href={social.href}>
              {social.type}
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
