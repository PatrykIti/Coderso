import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type NavigationItem = {
  label: string;
  href: string;
};

export type NavigationLogo = {
  type: "text" | "image";
  value: string;
  href?: string;
};

export type NavigationCta = {
  label: string;
  href: string;
};

export type NavigationBehavior = {
  sticky?: boolean;
  transparent?: boolean;
  collapseOnScroll?: boolean;
};

export type NavigationData = {
  logo: NavigationLogo;
  items: NavigationItem[];
  cta?: NavigationCta;
  behavior?: NavigationBehavior;
  layout?: { alignment?: "left" | "center" | "right" };
};

export const navigationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["logo", "items"],
  properties: {
    logo: {
      type: "object",
      additionalProperties: false,
      required: ["type", "value"],
      properties: {
        type: { enum: ["text", "image"] },
        value: { type: "string" },
        href: { type: "string" },
      },
    },
    items: {
      type: "array",
      minItems: 2,
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
    cta: {
      type: "object",
      additionalProperties: false,
      required: ["label", "href"],
      properties: {
        label: { type: "string" },
        href: { type: "string" },
      },
    },
    behavior: {
      type: "object",
      additionalProperties: false,
      properties: {
        sticky: { type: "boolean" },
        transparent: { type: "boolean" },
        collapseOnScroll: { type: "boolean" },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        alignment: { enum: ["left", "center", "right"] },
      },
    },
  },
};

export const navigationDefaults: NavigationData = {
  logo: { type: "text", value: "Nextless", href: "/" },
  items: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Get started", href: "/start" },
  behavior: { sticky: false, transparent: false, collapseOnScroll: false },
  layout: { alignment: "left" },
};

export function NavigationBlock({
  data,
  variant,
}: {
  data: NavigationData;
  variant: string;
}) {
  const showCta = variant === "with-cta";
  const splitLayout = variant === "split";
  const alignment =
    data.layout?.alignment === "center"
      ? "justify-center"
      : data.layout?.alignment === "right"
        ? "justify-end"
        : "justify-start";

  return (
    <nav className="w-full border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-text)]">
          {data.logo.type === "image" ? (
            <img src={data.logo.value} alt="Logo" className="h-6 w-auto" />
          ) : (
            <span>{data.logo.value}</span>
          )}
        </div>
        <div className={`flex flex-1 items-center ${splitLayout ? "justify-center" : alignment}`}>
          <ul className="flex items-center gap-4 text-sm text-[var(--color-text)]/70">
            {data.items.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
        {showCta && data.cta ? (
          <a
            className="rounded-md bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-bg)]"
            href={data.cta.href}
          >
            {data.cta.label}
          </a>
        ) : null}
      </div>
    </nav>
  );
}

export function createNavigationWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<NavigationData>>;
  visual: ComponentType<WidgetEditorProps<NavigationData>>;
  advanced: ComponentType<WidgetEditorProps<NavigationData>>;
}): WidgetDefinition<NavigationData> {
  return {
    type: "navigation",
    title: "Navigation",
    description: "Site menu with logo and links.",
    category: "navigation",
    variants: [
      { id: "simple", label: "Simple" },
      { id: "with-cta", label: "With CTA" },
      { id: "split", label: "Split" },
    ],
    schema: navigationSchema,
    defaults: navigationDefaults,
    editor: editors,
    render: NavigationBlock,
  };
}
