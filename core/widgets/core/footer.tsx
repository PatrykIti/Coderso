import type { CSSProperties, ComponentType } from "react";
import { useId } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import type { DeviceTarget, WidgetBlock, WidgetDefinition, WidgetEditorBundle } from "../types";
import { compactStyle, resolveClearableCssColorValue } from "./clearableStyle";
import {
  footerColumnSlotIds,
  footerDefaults,
  footerEditorContract,
  footerSchema,
  footerSocialTypes,
  type FooterBackToTop,
  type FooterBrand,
  type FooterColumn,
  type FooterContactInfo,
  type FooterData,
  type FooterLayout,
  type FooterLegal,
  type FooterLink,
  type FooterLinkTarget,
  type FooterSocial,
  type FooterSocialType,
  type FooterStyle,
} from "./footerContract";
import { FooterSocialIcon } from "./footerSocialIcons";
import { normalizeWidgetSafeHref } from "./widgetSafeHref";

export {
  footerColumnSlotIds,
  footerDefaults,
  footerEditorContract,
  footerSchema,
  footerSocialTypes,
} from "./footerContract";
export type {
  FooterBackToTop,
  FooterBrand,
  FooterColumn,
  FooterColumnSlotId,
  FooterContactInfo,
  FooterData,
  FooterLayout,
  FooterLegal,
  FooterLink,
  FooterLinkTarget,
  FooterSocial,
  FooterSocialType,
  FooterStyle,
} from "./footerContract";

type FooterResolvedLinkAttrs = {
  href: string;
  target?: "_blank";
  rel?: string;
};

type NormalizedFooterLegal = {
  enabled: boolean;
  copyright?: string;
  privacy?: string;
  privacyLabel: string;
  privacyTarget?: FooterLinkTarget;
  terms?: string;
  termsLabel: string;
  termsTarget?: FooterLinkTarget;
};

type NormalizedFooterSocial = {
  type: FooterSocialType;
  href: string;
  label: string;
};

type NormalizedFooterContactInfo = {
  address?: string;
  phoneLabel?: string;
  phoneHref?: string;
  emailLabel?: string;
  emailHref?: string;
};

type NormalizedFooterBackToTop = {
  label: string;
};

type FooterCssVars = CSSProperties & {
  "--footer-link-hover-color"?: string;
  "--footer-link-active-color"?: string;
};

const knownFooterSocialTypeSet = new Set<FooterSocialType>(footerSocialTypes);

const footerSocialLabelMap: Record<FooterSocialType, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter",
  x: "X",
  github: "GitHub",
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  discord: "Discord",
  pinterest: "Pinterest",
  mastodon: "Mastodon",
  twitch: "Twitch",
  snapchat: "Snapchat",
  custom: "Custom",
};

const footerColumnCountByVariant = {
  "columns-2": 2,
  "columns-3": 3,
  minimal: 1,
} as const;

const maxWidthClassMap = {
  none: "",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

const gapClassMap = {
  none: "gap-0",
  "4": "gap-4",
  "6": "gap-6",
  "8": "gap-8",
} as const;

const columnBreakpointClassMap = {
  sm: {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
  },
  md: {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
  },
  lg: {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
  },
} as const;

const minimalBreakpointClassMap = {
  sm: "sm:flex-row sm:items-center sm:justify-between",
  md: "md:flex-row md:items-center md:justify-between",
  lg: "lg:flex-row lg:items-center lg:justify-between",
} as const;

const sectionPaddingYClassMap = {
  none: "py-0",
  "8": "py-8",
  "10": "py-10",
  "12": "py-12",
} as const;

const paddingXClassMap = {
  none: "px-0",
  "4": "px-4",
  "6": "px-6",
  "8": "px-8",
} as const;

const fontSizeClassMap = {
  none: "",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
} as const;

const headingTransformClassMap = {
  none: "normal-case",
  uppercase: "uppercase",
  capitalize: "capitalize",
} as const;

const linkUnderlineClassMap = {
  none: "no-underline",
  hover: "no-underline underline-offset-4 hover:underline",
  always: "underline underline-offset-4",
} as const;

const linkFontWeightClassMap = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
} as const;

const linkLetterSpacingClassMap = {
  normal: "tracking-normal",
  wide: "tracking-wide",
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

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  if (item === undefined) return items;
  next.splice(toIndex, 0, item);
  return next;
};

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toTitleCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const hasOwn = (value: unknown, key: string) =>
  typeof value === "object" && value !== null && Object.prototype.hasOwnProperty.call(value, key);

const normalizeFooterHref = (value: unknown) =>
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });

export const normalizeFooterImageSrc = (value: unknown) =>
  normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: false,
    allowHttp: true,
  });

const normalizeFooterRenderColor = (value: unknown) =>
  resolveClearableCssColorValue(value, "inherited-render");

const normalizeFooterInteractiveColor = normalizeFooterRenderColor;

const normalizeFooterTarget = (value: unknown): FooterLinkTarget | undefined =>
  value === "_blank" || value === "_self" ? value : undefined;

const isExternalHttpHref = (href: string) =>
  href.startsWith("http://") || href.startsWith("https://");

const resolveFooterLinkAttrs = (
  href: unknown,
  target?: FooterLinkTarget
): FooterResolvedLinkAttrs | undefined => {
  const safeHref = normalizeFooterHref(href);
  if (!safeHref) return undefined;
  if (target === "_blank") {
    return { href: safeHref, target: "_blank", rel: "noopener noreferrer" };
  }
  if (isExternalHttpHref(safeHref)) {
    return { href: safeHref, rel: "noopener noreferrer" };
  }
  return { href: safeHref };
};

const resolveFooterSocialLinkAttrs = (href: unknown): FooterResolvedLinkAttrs | undefined => {
  const safeHref = normalizeFooterHref(href);
  if (!safeHref) return undefined;
  if (isExternalHttpHref(safeHref)) {
    return { href: safeHref, target: "_blank", rel: "noopener noreferrer" };
  }
  return { href: safeHref };
};

const normalizeFooterLink = (link: FooterLink, index: number): FooterLink | null => {
  const label = toTrimmedString(link.label) ?? `Link ${index + 1}`;
  const href = normalizeFooterHref(link.href);
  if (!href) return null;
  return {
    label,
    href,
    target: normalizeFooterTarget(link.target),
  };
};

const normalizeFooterColumn = (column: FooterColumn, index: number): FooterColumn => {
  const title = toTrimmedString(column.title) ?? `Column ${index + 1}`;
  const links = Array.isArray(column.links)
    ? column.links.map(normalizeFooterLink).filter((link): link is FooterLink => link !== null)
    : [];
  return { title, links };
};

export const resolveFooterColumnCount = (variant: string) =>
  footerColumnCountByVariant[variant as keyof typeof footerColumnCountByVariant] ?? 2;

export const resolveFooterSocialType = (value: unknown): FooterSocialType => {
  const normalized = toTrimmedString(value)?.toLowerCase();
  if (normalized && knownFooterSocialTypeSet.has(normalized as FooterSocialType)) {
    return normalized as FooterSocialType;
  }
  return "custom";
};

export const resolveFooterSocialLabel = (type: unknown, explicitLabel?: string) => {
  const normalizedType = resolveFooterSocialType(type);
  if (normalizedType !== "custom") {
    return footerSocialLabelMap[normalizedType];
  }
  const label = toTrimmedString(explicitLabel);
  if (label) return label;
  const rawType = toTrimmedString(type);
  return rawType ? toTitleCase(rawType) : footerSocialLabelMap.custom;
};

const normalizeFooterLegal = (value: unknown): NormalizedFooterLegal => {
  const defaultLegal = footerDefaults.legal ?? {};
  const privacy = hasOwn(value, "privacy")
    ? normalizeFooterHref((value as FooterLegal).privacy)
    : normalizeFooterHref(defaultLegal.privacy);
  const terms = hasOwn(value, "terms")
    ? normalizeFooterHref((value as FooterLegal).terms)
    : normalizeFooterHref(defaultLegal.terms);

  return {
    enabled: (value as FooterLegal | undefined)?.enabled !== false,
    copyright: hasOwn(value, "copyright")
      ? toTrimmedString((value as FooterLegal).copyright)
      : toTrimmedString(defaultLegal.copyright),
    privacy,
    privacyLabel:
      toTrimmedString((value as FooterLegal | undefined)?.privacyLabel) ??
      toTrimmedString(defaultLegal.privacyLabel) ??
      "Privacy",
    privacyTarget: normalizeFooterTarget((value as FooterLegal | undefined)?.privacyTarget),
    terms,
    termsLabel:
      toTrimmedString((value as FooterLegal | undefined)?.termsLabel) ??
      toTrimmedString(defaultLegal.termsLabel) ??
      "Terms",
    termsTarget: normalizeFooterTarget((value as FooterLegal | undefined)?.termsTarget),
  };
};

const normalizeFooterBrand = (value: unknown): FooterBrand | undefined => {
  const logoUrl = normalizeFooterImageSrc((value as FooterBrand | undefined)?.logoUrl);
  const logoText = toTrimmedString((value as FooterBrand | undefined)?.logoText);
  const tagline = toTrimmedString((value as FooterBrand | undefined)?.tagline);
  const logoAlt =
    toTrimmedString((value as FooterBrand | undefined)?.logoAlt) ??
    logoText ??
    (logoUrl ? "Footer logo" : undefined);

  if (!logoUrl && !logoText && !tagline) return undefined;

  return {
    logoUrl,
    logoAlt,
    logoText,
    tagline,
  };
};

const footerEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeFooterContactInfo = (value: unknown): NormalizedFooterContactInfo | undefined => {
  const address = toTrimmedString((value as FooterContactInfo | undefined)?.address);
  const rawPhone = toTrimmedString((value as FooterContactInfo | undefined)?.phone);
  const rawEmail = toTrimmedString((value as FooterContactInfo | undefined)?.email);

  const normalizedPhone =
    rawPhone && /^[+\d][\d\s().-]{2,}$/.test(rawPhone)
      ? rawPhone.replace(/[\s().-]+/g, "")
      : undefined;
  const phoneHref =
    normalizedPhone && /^\+?\d{3,20}$/.test(normalizedPhone) ? `tel:${normalizedPhone}` : undefined;

  const normalizedEmail =
    rawEmail && footerEmailPattern.test(rawEmail) ? rawEmail.toLowerCase() : undefined;
  const emailHref = normalizedEmail ? `mailto:${normalizedEmail}` : undefined;

  if (!address && !phoneHref && !emailHref) return undefined;

  return {
    address,
    phoneLabel: phoneHref ? rawPhone : undefined,
    phoneHref,
    emailLabel: emailHref ? rawEmail : undefined,
    emailHref,
  };
};

const normalizeFooterBackToTop = (value: unknown): NormalizedFooterBackToTop | undefined => {
  if ((value as FooterBackToTop | undefined)?.enabled !== true) return undefined;
  return {
    label: toTrimmedString((value as FooterBackToTop | undefined)?.label) ?? "Back to top",
  };
};

const normalizeFooterSocialEntry = (
  entry: FooterSocial,
  index: number
): NormalizedFooterSocial | null => {
  const linkAttrs = resolveFooterSocialLinkAttrs(entry?.href);
  if (!linkAttrs) return null;

  return {
    type: resolveFooterSocialType(entry?.type),
    href: linkAttrs.href,
    label: resolveFooterSocialLabel(entry?.type, entry?.label) || `Social link ${index + 1}`,
  };
};

const resolveFooterGridClass = (count: number, breakpoint: FooterLayout["columnBreakpoint"]) => {
  const normalizedCount = count === 1 || count === 3 ? count : 2;
  const normalizedBreakpoint = breakpoint ?? "md";
  return columnBreakpointClassMap[normalizedBreakpoint][normalizedCount];
};

function FooterBrandBlock({
  brand,
  labelId,
  textStyle,
  metaStyle,
  compact,
}: {
  brand: FooterBrand | undefined;
  labelId?: string;
  textStyle: CSSProperties;
  metaStyle: CSSProperties;
  compact?: boolean;
}) {
  if (!brand) return null;

  return (
    <div className={joinClasses("space-y-2", compact ? "max-w-md" : "max-w-lg")}>
      <div className="flex items-center gap-3">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.logoAlt ?? "Footer logo"}
            loading="lazy"
            className="h-10 w-auto rounded-sm"
          />
        ) : null}
        {brand.logoText ? (
          <p id={labelId} className="text-base font-semibold" style={textStyle}>
            {brand.logoText}
          </p>
        ) : null}
      </div>
      {brand.tagline ? (
        <p className={compact ? "text-sm" : "text-sm"} style={metaStyle}>
          {brand.tagline}
        </p>
      ) : null}
    </div>
  );
}

function renderSlotBlocks(blocks: WidgetBlock[], previewDevice?: DeviceTarget) {
  if (blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((slotBlock) => (
        <WidgetRenderer key={slotBlock.id} block={slotBlock} previewDevice={previewDevice} />
      ))}
    </div>
  );
}

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
    const base = normalizedInput[index] ??
      normalizedDefaults[index] ?? {
        title: `Column ${index + 1}`,
        links: [],
      };
    result.push(base);
  }

  return result;
}

export function reorderFooterColumnsAndSlots({
  columns,
  slots,
  variant,
  fromIndex,
  toIndex,
}: {
  columns: FooterColumn[];
  slots?: Record<string, WidgetBlock[]>;
  variant: string;
  fromIndex: number;
  toIndex: number;
}): {
  columns: FooterColumn[];
  slots?: Record<string, WidgetBlock[]>;
} {
  const visibleCount = resolveFooterColumnCount(variant);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= visibleCount ||
    toIndex >= visibleCount ||
    fromIndex === toIndex
  ) {
    return { columns, slots };
  }

  const visibleColumns = resolveFooterColumnsForVariant(columns, variant);
  const hiddenColumns =
    Array.isArray(columns) && columns.length > visibleCount ? columns.slice(visibleCount) : [];
  const reorderedColumns = moveItem(visibleColumns, fromIndex, toIndex);
  const nextColumns = [...reorderedColumns, ...hiddenColumns];

  if (!slots) {
    return { columns: nextColumns, slots };
  }

  const nextSlotOrder = moveItem([...footerColumnSlotIds], fromIndex, toIndex);
  const nextSlots: Record<string, WidgetBlock[]> = { ...slots };

  footerColumnSlotIds.forEach((slotId, index) => {
    const sourceSlotId = nextSlotOrder[index] ?? slotId;
    nextSlots[slotId] = slots[sourceSlotId] ?? [];
  });

  return {
    columns: nextColumns,
    slots: nextSlots,
  };
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
  const footerLabelId = useId();
  const columns = resolveFooterColumnsForVariant(data.columns, variant);
  const visibleColumnCount = columns.length;
  const hasStyleObject = typeof data.style === "object" && data.style !== null;
  const layout: FooterLayout = {
    ...footerDefaults.layout,
    ...data.layout,
  };
  const style: FooterStyle = {
    ...footerDefaults.style,
    ...data.style,
  };
  const align = layout.align ?? "left";
  const legalAlign = layout.legalAlign ?? "right";
  const legal = normalizeFooterLegal(data.legal);
  const brand = normalizeFooterBrand(data.brand);
  const contact = normalizeFooterContactInfo(data.contact);
  const backToTop = normalizeFooterBackToTop(data.backToTop);
  const social = (Array.isArray(data.social) ? data.social : (footerDefaults.social ?? []))
    .map(normalizeFooterSocialEntry)
    .filter((entry): entry is NormalizedFooterSocial => entry !== null);
  const socialVisible = data.socialEnabled !== false && social.length > 0;
  const bottomSlotBlocks = slots?.bottom ?? [];
  const firstColumnSlotBlocks = slots?.[footerColumnSlotIds[0]] ?? [];
  const showLegalContent =
    legal.enabled && Boolean(legal.copyright || legal.privacy || legal.terms);
  const footerTextColor = normalizeFooterRenderColor(style.textColor) ?? "var(--color-text)";
  const footerBorderColor = normalizeFooterRenderColor(style.borderColor) ?? "var(--color-border)";
  const outerStyle: CSSProperties =
    compactStyle({
      backgroundColor: hasStyleObject
        ? normalizeFooterRenderColor(data.style?.surfaceColor)
        : normalizeFooterRenderColor(style.surfaceColor),
      borderColor: footerBorderColor,
      borderTopWidth: borderWidthValueMap[style.borderTopWidth ?? "1"] ?? "1px",
      color: footerTextColor,
    }) ?? {};
  const headingStyle =
    compactStyle({
      color: normalizeFooterRenderColor(style.headingColor) ?? footerTextColor,
    }) ?? {};
  const brandMetaStyle =
    compactStyle({
      color: normalizeFooterRenderColor(style.legalTextColor) ?? footerTextColor,
    }) ?? {};
  const legalStyle =
    compactStyle({
      color: normalizeFooterRenderColor(style.legalTextColor) ?? footerTextColor,
    }) ?? {};
  const socialStyle =
    compactStyle({
      color:
        normalizeFooterRenderColor(style.socialColor) ??
        normalizeFooterRenderColor(style.linkColor) ??
        footerTextColor,
    }) ?? {};
  const hoverColor = normalizeFooterInteractiveColor(style.linkHoverColor);
  const activeColor = normalizeFooterInteractiveColor(style.linkActiveColor);
  const linkStyle =
    compactStyle({
      color: normalizeFooterRenderColor(style.linkColor) ?? footerTextColor,
      "--footer-link-hover-color": hoverColor,
      "--footer-link-active-color": activeColor,
    } as FooterCssVars) ?? {};
  const linkClassName = joinClasses(
    "transition-colors",
    linkFontWeightClassMap[style.linkFontWeight ?? "normal"] ?? "font-normal",
    linkLetterSpacingClassMap[style.linkLetterSpacing ?? "normal"] ?? "tracking-normal",
    linkUnderlineClassMap[style.linkUnderline ?? "hover"] ??
      "no-underline hover:underline underline-offset-4",
    hoverColor ? "hover:text-[var(--footer-link-hover-color)]" : undefined,
    activeColor ? "active:text-[var(--footer-link-active-color)]" : undefined
  );
  const innerClassName = joinClasses(
    "mx-auto w-full",
    maxWidthClassMap[layout.maxWidth ?? "6xl"] ?? "max-w-6xl"
  );
  const showBottomStrip =
    showLegalContent ||
    socialVisible ||
    bottomSlotBlocks.length > 0 ||
    Boolean(contact) ||
    Boolean(backToTop);

  const renderContactInfo = () => {
    if (!contact) return null;
    return (
      <address className="flex flex-wrap items-center gap-4 not-italic" style={legalStyle}>
        {contact.address ? <span className="whitespace-pre-line">{contact.address}</span> : null}
        {contact.phoneHref && contact.phoneLabel ? (
          <a href={contact.phoneHref} className={linkClassName} style={linkStyle}>
            {contact.phoneLabel}
          </a>
        ) : null}
        {contact.emailHref && contact.emailLabel ? (
          <a href={contact.emailHref} className={linkClassName} style={linkStyle}>
            {contact.emailLabel}
          </a>
        ) : null}
      </address>
    );
  };

  const renderBackToTopLink = () => {
    if (!backToTop) return null;
    return (
      <a href="#top" data-footer-back-to-top="1" className={linkClassName} style={linkStyle}>
        {backToTop.label}
      </a>
    );
  };

  const renderColumnsFooter = () => (
    <>
      {brand ? (
        <div className="mb-8">
          <FooterBrandBlock
            brand={brand}
            labelId={brand.logoText ? footerLabelId : undefined}
            textStyle={headingStyle}
            metaStyle={brandMetaStyle}
          />
        </div>
      ) : null}
      <div
        className={joinClasses(
          "grid w-full",
          gapClassMap[layout.columnGap ?? "6"] ?? "gap-6",
          resolveFooterGridClass(visibleColumnCount, layout.columnBreakpoint)
        )}
      >
        {columns.map((column, index) => {
          const slotId = footerColumnSlotIds[index];
          const slotBlocks = slotId ? (slots?.[slotId] ?? []) : [];
          return (
            <div
              key={`${column.title}-${index}`}
              className={joinClasses("space-y-3", alignClassMap[align] ?? "text-left")}
            >
              <h3
                className={joinClasses(
                  "text-xs font-semibold",
                  headingTransformClassMap[style.headingTransform ?? "uppercase"] ?? "uppercase"
                )}
                style={headingStyle}
              >
                {column.title}
              </h3>
              {column.links.length > 0 ? (
                <ul className="space-y-2">
                  {column.links.map((link, linkIndex) => {
                    const linkAttrs = resolveFooterLinkAttrs(link.href, link.target);
                    if (!linkAttrs) return null;
                    return (
                      <li key={`${link.label}-${link.href}-${linkIndex}`}>
                        <a {...linkAttrs} className={linkClassName} style={linkStyle}>
                          {link.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {slotBlocks.length > 0 ? (
                <div className="pt-1">{renderSlotBlocks(slotBlocks, previewDevice)}</div>
              ) : null}
            </div>
          );
        })}
      </div>
      {showBottomStrip ? (
        <div
          className={joinClasses(
            "mt-8 flex flex-wrap items-center gap-4 border-t pt-4 text-xs",
            justifyClassMap[legalAlign] ?? "justify-end"
          )}
          style={{ borderColor: footerBorderColor }}
        >
          {legal.enabled && legal.copyright ? (
            <span style={legalStyle}>{legal.copyright}</span>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            {renderContactInfo()}
            {bottomSlotBlocks.map((slotBlock) => (
              <WidgetRenderer key={slotBlock.id} block={slotBlock} previewDevice={previewDevice} />
            ))}
            {legal.enabled && legal.privacy
              ? (() => {
                  const linkAttrs = resolveFooterLinkAttrs(legal.privacy, legal.privacyTarget);
                  if (!linkAttrs) return null;
                  return (
                    <a {...linkAttrs} className={linkClassName} style={linkStyle}>
                      {legal.privacyLabel}
                    </a>
                  );
                })()
              : null}
            {legal.enabled && legal.terms
              ? (() => {
                  const linkAttrs = resolveFooterLinkAttrs(legal.terms, legal.termsTarget);
                  if (!linkAttrs) return null;
                  return (
                    <a {...linkAttrs} className={linkClassName} style={linkStyle}>
                      {legal.termsLabel}
                    </a>
                  );
                })()
              : null}
            {socialVisible ? (
              <ul className="flex flex-wrap items-center gap-2" aria-label="Footer social links">
                {social.map((socialEntry, socialIndex) => {
                  const linkAttrs = resolveFooterSocialLinkAttrs(socialEntry.href);
                  if (!linkAttrs) return null;
                  const accessibleLabel =
                    linkAttrs.target === "_blank"
                      ? `${socialEntry.label} (opens in new tab)`
                      : socialEntry.label;
                  return (
                    <li key={`${socialEntry.type}-${socialEntry.href}-${socialIndex}`}>
                      <a
                        {...linkAttrs}
                        aria-label={accessibleLabel}
                        title={accessibleLabel}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)]/70 transition-colors hover:border-[var(--color-primary)]"
                        style={socialStyle}
                      >
                        <FooterSocialIcon type={socialEntry.type} />
                        <span className="sr-only">{accessibleLabel}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {renderBackToTopLink()}
          </div>
        </div>
      ) : null}
    </>
  );

  const renderMinimalFooter = () => {
    const primaryColumn = columns[0] ?? { title: "Column 1", links: [] };
    const hasInlineLinks = primaryColumn.links.length > 0;
    const secondarySlotBlocks = [...firstColumnSlotBlocks, ...bottomSlotBlocks];

    return (
      <div className="space-y-4">
        <div
          className={joinClasses(
            "flex flex-col gap-4",
            minimalBreakpointClassMap[layout.columnBreakpoint ?? "md"] ??
              "md:flex-row md:items-center md:justify-between"
          )}
        >
          <div className="flex flex-col gap-3">
            <FooterBrandBlock
              brand={brand}
              labelId={brand?.logoText ? footerLabelId : undefined}
              textStyle={headingStyle}
              metaStyle={brandMetaStyle}
              compact
            />
            {hasInlineLinks ? (
              <nav aria-label={`${primaryColumn.title} links`}>
                <ul className="flex flex-wrap items-center gap-3">
                  {primaryColumn.links.map((link, index) => {
                    const linkAttrs = resolveFooterLinkAttrs(link.href, link.target);
                    if (!linkAttrs) return null;
                    return (
                      <li key={`${link.label}-${link.href}-${index}`}>
                        <a {...linkAttrs} className={linkClassName} style={linkStyle}>
                          {link.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ) : null}
          </div>
          {showLegalContent || socialVisible || Boolean(contact) || Boolean(backToTop) ? (
            <div
              className={joinClasses(
                "flex flex-wrap items-center gap-4",
                justifyClassMap[legalAlign]
              )}
            >
              {legal.enabled && legal.copyright ? (
                <span style={legalStyle}>{legal.copyright}</span>
              ) : null}
              {renderContactInfo()}
              {legal.enabled && legal.privacy
                ? (() => {
                    const linkAttrs = resolveFooterLinkAttrs(legal.privacy, legal.privacyTarget);
                    if (!linkAttrs) return null;
                    return (
                      <a {...linkAttrs} className={linkClassName} style={linkStyle}>
                        {legal.privacyLabel}
                      </a>
                    );
                  })()
                : null}
              {legal.enabled && legal.terms
                ? (() => {
                    const linkAttrs = resolveFooterLinkAttrs(legal.terms, legal.termsTarget);
                    if (!linkAttrs) return null;
                    return (
                      <a {...linkAttrs} className={linkClassName} style={linkStyle}>
                        {legal.termsLabel}
                      </a>
                    );
                  })()
                : null}
              {socialVisible ? (
                <ul className="flex flex-wrap items-center gap-2" aria-label="Footer social links">
                  {social.map((socialEntry, socialIndex) => {
                    const linkAttrs = resolveFooterSocialLinkAttrs(socialEntry.href);
                    if (!linkAttrs) return null;
                    const accessibleLabel =
                      linkAttrs.target === "_blank"
                        ? `${socialEntry.label} (opens in new tab)`
                        : socialEntry.label;
                    return (
                      <li key={`${socialEntry.type}-${socialEntry.href}-${socialIndex}`}>
                        <a
                          {...linkAttrs}
                          aria-label={accessibleLabel}
                          title={accessibleLabel}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)]/70 transition-colors hover:border-[var(--color-primary)]"
                          style={socialStyle}
                        >
                          <FooterSocialIcon type={socialEntry.type} />
                          <span className="sr-only">{accessibleLabel}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {renderBackToTopLink()}
            </div>
          ) : null}
        </div>
        {secondarySlotBlocks.length > 0 ? (
          <div
            className="border-t pt-4"
            style={{
              borderColor: footerBorderColor,
            }}
          >
            {renderSlotBlocks(secondarySlotBlocks, previewDevice)}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <footer
      aria-labelledby={brand?.logoText ? footerLabelId : undefined}
      aria-label={brand?.logoText ? undefined : "Site footer"}
      className={joinClasses(
        "border-t",
        paddingXClassMap[layout.paddingX ?? "6"] ?? "px-6",
        sectionPaddingYClassMap[layout.sectionPaddingY ?? "10"] ?? "py-10",
        fontSizeClassMap[style.fontSize ?? "sm"] ?? "text-sm"
      )}
      style={outerStyle}
    >
      <div className={innerClassName}>
        {variant === "minimal" ? renderMinimalFooter() : renderColumnsFooter()}
      </div>
    </footer>
  );
}

export function createFooterWidget(
  editors: WidgetEditorBundle<FooterData>
): WidgetDefinition<FooterData> {
  return {
    type: "footer",
    title: "Footer",
    description: "Footer with brand, links, and company info.",
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
    editorContract: footerEditorContract,
    editorCapabilities: { visualOwnsVariantSelection: true },
    render: FooterBlock,
  };
}
