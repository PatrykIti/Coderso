import type { ComponentType } from "react";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import type { WidgetBlock } from "../types";

export type NavigationItem = {
  label: string;
  href: string;
  children?: Array<{
    label: string;
    href: string;
  }>;
};

export type NavigationLogo = {
  type: "text" | "image";
  value: string;
  href?: string;
  alt?: string;
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
        alt: { type: "string" },
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
          children: {
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

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const variantSupportsCta = (variant: string) =>
  variant === "with-cta" || variant === "split";

export function NavigationBlock({
  data,
  variant,
  slots,
}: {
  data: NavigationData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
}) {
  const showCta = variantSupportsCta(variant);
  const splitLayout = variant === "split";
  const alignmentClass =
    data.layout?.alignment === "center"
      ? "justify-center"
      : data.layout?.alignment === "right"
        ? "justify-end"
        : "justify-start";
  const behavior = data.behavior ?? {};
  const rightSlotBlocks = slots?.right ?? [];
  const hasRightActions = rightSlotBlocks.length > 0 || Boolean(showCta && data.cta);

  const navClass = joinClasses(
    "w-full px-6 py-4",
    behavior.transparent
      ? "border-b border-transparent bg-transparent"
      : "border-b border-[var(--color-border)] bg-[var(--color-bg)]",
    behavior.sticky && "sticky top-0 z-40"
  );

  return (
    <nav
      className={navClass}
      data-collapse-on-scroll={behavior.collapseOnScroll ? "true" : undefined}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-text)]">
          {data.logo.type === "image" ? (
            <img src={data.logo.value} alt={data.logo.alt ?? "Logo"} className="h-6 w-auto" />
          ) : (
            <span>{data.logo.value}</span>
          )}
        </div>
        <div
          className={joinClasses(
            "flex flex-1 items-center",
            splitLayout ? "justify-center" : alignmentClass
          )}
        >
          <ul className="flex items-center gap-4 text-sm text-[var(--color-text)]/70">
            {data.items.map((item, index) => (
              <li key={`${item.href || item.label}-${index}`} className="group relative">
                <a href={item.href}>{item.label}</a>
                {item.children?.length ? (
                  <ul className="absolute left-0 top-full z-20 mt-2 hidden min-w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-sm group-hover:block group-focus-within:block">
                    {item.children.map((child, childIndex) => (
                      <li key={`${child.href || child.label}-${childIndex}`}>
                        <a
                          href={child.href}
                          className="block rounded px-2 py-1 text-sm text-[var(--color-text)]/80 hover:bg-[var(--color-surface)]"
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        {hasRightActions ? (
          <div className="flex items-center gap-3 pl-4">
            {rightSlotBlocks.map((slotBlock) => (
              <WidgetRenderer key={slotBlock.id} block={slotBlock} />
            ))}
            {showCta && data.cta ? (
              <a
                className="rounded-md bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-bg)]"
                href={data.cta.href}
              >
                {data.cta.label}
              </a>
            ) : null}
          </div>
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
    slots: [{ id: "right", label: "Right Actions" }],
    variants: [
      { id: "simple", label: "Simple" },
      { id: "with-cta", label: "With CTA" },
      { id: "split", label: "Split" },
    ],
    schema: navigationSchema,
    defaults: navigationDefaults,
    editor: editors,
    editorCapabilities: { visualOwnsVariantSelection: true },
    render: NavigationBlock,
  };
}
