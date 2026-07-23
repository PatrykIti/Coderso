import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
} from "../../services/theme/cssColorContract";
import type { WidgetEditorContract } from "../types";

export type FooterLinkTarget = "_self" | "_blank";

export type FooterLink = {
  label: string;
  href: string;
  target?: FooterLinkTarget;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export const footerSocialTypes = [
  "linkedin",
  "twitter",
  "x",
  "github",
  "youtube",
  "facebook",
  "instagram",
  "tiktok",
  "discord",
  "pinterest",
  "mastodon",
  "twitch",
  "snapchat",
  "custom",
] as const;

export type FooterSocialType = (typeof footerSocialTypes)[number];

export type FooterSocial = {
  type: string;
  href: string;
  label?: string;
};

export type FooterBrand = {
  logoUrl?: string;
  logoAlt?: string;
  logoText?: string;
  tagline?: string;
};

export type FooterLegal = {
  enabled?: boolean;
  copyright?: string;
  privacy?: string;
  privacyLabel?: string;
  privacyTarget?: FooterLinkTarget;
  terms?: string;
  termsLabel?: string;
  termsTarget?: FooterLinkTarget;
};

export type FooterContactInfo = {
  address?: string;
  phone?: string;
  email?: string;
};

export type FooterBackToTop = {
  enabled?: boolean;
  label?: string;
};

export type FooterLayout = {
  align?: "left" | "center" | "right";
  legalAlign?: "left" | "center" | "right";
  maxWidth?: "none" | "5xl" | "6xl" | "7xl";
  columnGap?: "none" | "4" | "6" | "8";
  columnBreakpoint?: "sm" | "md" | "lg";
  sectionPaddingY?: "none" | "8" | "10" | "12";
  paddingX?: "none" | "4" | "6" | "8";
};

export type FooterStyle = {
  surfaceColor?: string;
  borderColor?: string;
  borderTopWidth?: "0" | "1" | "2" | "3";
  textColor?: string;
  headingColor?: string;
  linkColor?: string;
  legalTextColor?: string;
  socialColor?: string;
  fontSize?: "none" | "xs" | "sm" | "base";
  headingTransform?: "none" | "uppercase" | "capitalize";
  linkHoverColor?: string;
  linkActiveColor?: string;
  linkUnderline?: "none" | "hover" | "always";
  linkFontWeight?: "normal" | "medium" | "semibold";
  linkLetterSpacing?: "normal" | "wide";
};

export type FooterData = {
  columns: FooterColumn[];
  brand?: FooterBrand;
  legal?: FooterLegal;
  contact?: FooterContactInfo;
  backToTop?: FooterBackToTop;
  social?: FooterSocial[];
  socialEnabled?: boolean;
  layout?: FooterLayout;
  style?: FooterStyle;
};

export const footerColumnSlotIds = ["column-1", "column-2", "column-3"] as const;
export type FooterColumnSlotId = (typeof footerColumnSlotIds)[number];

const footerColorValueSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS["inherited-render"],
    },
  ],
} as const;

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
                target: { enum: ["_self", "_blank"] },
              },
            },
          },
        },
      },
    },
    brand: {
      type: "object",
      additionalProperties: false,
      properties: {
        logoUrl: { type: "string" },
        logoAlt: { type: "string" },
        logoText: { type: "string" },
        tagline: { type: "string" },
      },
    },
    legal: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        copyright: { type: "string" },
        privacy: { type: "string" },
        privacyLabel: { type: "string" },
        privacyTarget: { enum: ["_self", "_blank"] },
        terms: { type: "string" },
        termsLabel: { type: "string" },
        termsTarget: { enum: ["_self", "_blank"] },
      },
    },
    contact: {
      type: "object",
      additionalProperties: false,
      properties: {
        address: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
      },
    },
    backToTop: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        label: { type: "string" },
      },
    },
    socialEnabled: { type: "boolean" },
    social: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "href"],
        properties: {
          type: { type: "string" },
          href: { type: "string" },
          label: { type: "string" },
        },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        align: { enum: ["left", "center", "right"] },
        legalAlign: { enum: ["left", "center", "right"] },
        maxWidth: { enum: ["none", "5xl", "6xl", "7xl"] },
        columnGap: { enum: ["none", "4", "6", "8"] },
        columnBreakpoint: { enum: ["sm", "md", "lg"] },
        sectionPaddingY: { enum: ["none", "8", "10", "12"] },
        paddingX: { enum: ["none", "4", "6", "8"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surfaceColor: footerColorValueSchema,
        borderColor: footerColorValueSchema,
        borderTopWidth: { enum: ["0", "1", "2", "3"] },
        textColor: footerColorValueSchema,
        headingColor: footerColorValueSchema,
        linkColor: footerColorValueSchema,
        legalTextColor: footerColorValueSchema,
        socialColor: footerColorValueSchema,
        fontSize: { enum: ["none", "xs", "sm", "base"] },
        headingTransform: { enum: ["none", "uppercase", "capitalize"] },
        linkHoverColor: footerColorValueSchema,
        linkActiveColor: footerColorValueSchema,
        linkUnderline: { enum: ["none", "hover", "always"] },
        linkFontWeight: { enum: ["normal", "medium", "semibold"] },
        linkLetterSpacing: { enum: ["normal", "wide"] },
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
  legal: {
    enabled: true,
    copyright: "© 2026 Coderso",
    privacy: "/privacy",
    privacyLabel: "Privacy",
    terms: "/terms",
    termsLabel: "Terms",
  },
  socialEnabled: true,
  social: [
    { type: "x", href: "https://x.com/coderso" },
    { type: "linkedin", href: "https://www.linkedin.com/company/coderso" },
  ],
  layout: {
    align: "left",
    legalAlign: "right",
    maxWidth: "6xl",
    columnGap: "6",
    columnBreakpoint: "md",
    sectionPaddingY: "10",
    paddingX: "6",
  },
  style: {
    borderTopWidth: "1",
    fontSize: "sm",
    headingTransform: "uppercase",
    linkUnderline: "hover",
    linkFontWeight: "normal",
    linkLetterSpacing: "normal",
  },
};

export const footerEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "footer.wizard.starter-footer",
      title: "Starter footer",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["variant", "columns", "socialEnabled"],
    },
    {
      mode: "visual",
      id: "footer.visual.variant-structure",
      title: "Variant and structure",
      role: "setup",
      writablePaths: ["variant"],
    },
    {
      mode: "visual",
      id: "footer.visual.columns-links",
      title: "Columns and links",
      role: "content",
      writablePaths: [
        "columns.*.title",
        "columns.*.links.*.label",
        "columns.*.links.*.href",
        "columns.*.links.*.target",
      ],
    },
    {
      mode: "visual",
      id: "footer.visual.brand-legal",
      title: "Brand and legal",
      role: "content",
      writablePaths: ["brand", "legal"],
    },
    {
      mode: "visual",
      id: "footer.visual.utility-strip",
      title: "Utility strip",
      role: "content",
      writablePaths: ["contact", "backToTop"],
    },
    {
      mode: "visual",
      id: "footer.visual.social-links",
      title: "Social links and icon style",
      role: "content",
      writablePaths: ["socialEnabled", "social"],
    },
    {
      mode: "visual",
      id: "footer.visual.colors-borders",
      title: "Colors and borders",
      role: "visual",
      writablePaths: [
        "style.surfaceColor",
        "style.borderColor",
        "style.textColor",
        "style.headingColor",
        "style.linkColor",
        "style.legalTextColor",
        "style.socialColor",
        "style.borderTopWidth",
      ],
    },
    {
      mode: "visual",
      id: "footer.visual.typography-links",
      title: "Typography and link styling",
      role: "visual",
      writablePaths: [
        "style.fontSize",
        "style.headingTransform",
        "style.linkUnderline",
        "style.linkFontWeight",
        "style.linkLetterSpacing",
        "style.linkHoverColor",
        "style.linkActiveColor",
      ],
    },
    {
      mode: "visual",
      id: "footer.visual.layout-spacing",
      title: "Layout and spacing",
      role: "layout",
      writablePaths: [
        "layout.align",
        "layout.legalAlign",
        "layout.maxWidth",
        "layout.columnGap",
        "layout.columnBreakpoint",
        "layout.sectionPaddingY",
        "layout.paddingX",
      ],
    },
    {
      mode: "visual",
      id: "footer.visual.slots-overview",
      title: "Slots overview and insertion hints",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["slots"],
    },
    {
      mode: "advanced",
      id: "footer.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "columns", "legal", "social", "backToTop"],
    },
    {
      mode: "advanced",
      id: "footer.advanced.layout-diagnostics",
      title: "Layout diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "layout.align",
        "layout.legalAlign",
        "layout.maxWidth",
        "layout.columnGap",
        "layout.columnBreakpoint",
        "layout.sectionPaddingY",
        "layout.paddingX",
      ],
    },
    {
      mode: "advanced",
      id: "footer.advanced.style-diagnostics",
      title: "Style diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "style.surfaceColor",
        "style.borderColor",
        "style.textColor",
        "style.headingColor",
        "style.linkColor",
        "style.legalTextColor",
        "style.socialColor",
        "style.borderTopWidth",
        "style.fontSize",
        "style.headingTransform",
        "style.linkUnderline",
        "style.linkFontWeight",
        "style.linkLetterSpacing",
        "style.linkHoverColor",
        "style.linkActiveColor",
      ],
    },
    {
      mode: "advanced",
      id: "footer.advanced.support-summary",
      title: "Support summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["slots"],
    },
  ],
};
