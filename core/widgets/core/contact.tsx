import type { CSSProperties, ComponentType } from "react";

import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
} from "../../services/theme/cssColorContract";
import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableCssColorValue } from "./clearableStyle";
import { getFormRuntimeClientScript } from "./formRuntimeScript";
import { resolveWidgetLinkAttrs } from "./widgetSafeHref";
import type { NormalizedFormField } from "../../services/forms/validation";

export const contactFieldOptions = ["name", "email", "phone", "message"] as const;
export const contactDetailOptions = ["phone", "email", "address", "hours"] as const;

export type ContactFieldId = (typeof contactFieldOptions)[number];
export type ContactDetailKey = (typeof contactDetailOptions)[number];
export type ContactVariantId = "form-left" | "form-right" | "minimal";
export type ContactSpacing = "none" | "sm" | "md" | "lg" | "xl";
export type ContactColumns = "one" | "two";
export type ContactBorderWidth = "0" | "1" | "2" | "3";
export type ContactIconKey = "none" | "phone" | "mail" | "map-pin" | "clock";
export type ContactFieldAutocomplete = "name" | "email" | "tel" | "off";
export type ContactFieldSpan = "half" | "full";
export type ContactFieldLayout = "one" | "two";
export type ContactSubmissionMode = "static" | "forms-runtime";
export type ContactMapHeight = "sm" | "md" | "lg" | "xl";
export type ContactMaxWidth = "none" | "md" | "lg" | "xl" | "2xl";
export type ContactPaddingX = "none" | "sm" | "md" | "lg";
export type ContactRadius = "sm" | "md" | "lg" | "xl" | "full";
export type ContactSocialPlatform =
  | "x"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "youtube"
  | "custom";

export type ContactFieldSettings = {
  label?: string;
  placeholder?: string;
  autocomplete?: ContactFieldAutocomplete;
  span?: ContactFieldSpan;
};

export type ContactDetailDisplay = {
  label?: string;
  icon?: ContactIconKey;
};

export type ContactSocialLink = {
  id?: string;
  platform?: ContactSocialPlatform;
  label?: string;
  href?: string;
};

export type ContactSubmissionSettings = {
  mode?: ContactSubmissionMode;
  staticMessage?: string;
  formId?: string;
  fieldMap?: Partial<Record<ContactFieldId, string>>;
  successMessage?: string;
  errorMessage?: string;
};

export type ContactResolvedRuntimeData = {
  formId?: string;
  formName?: string;
  description?: string | null;
  status?: string;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: "public" | "internal";
  submissionNonce?: string | null;
  botProtection?: {
    provider?: "recaptcha_v3";
    siteKey?: string;
    action?: "public_write";
  } | null;
  fields?: NormalizedFormField[];
  error?: string;
};

export type ContactData = {
  title?: string;
  description?: string;
  form?: {
    title?: string;
    fields?: ContactFieldId[];
    required?: ContactFieldId[];
    submitLabel?: string;
    fieldLayout?: ContactFieldLayout;
    fieldSettings?: Partial<Record<ContactFieldId, ContactFieldSettings>>;
    submission?: ContactSubmissionSettings;
  };
  contact?: {
    title?: string;
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
    details?: Partial<Record<ContactDetailKey, ContactDetailDisplay>>;
    social?: ContactSocialLink[];
  };
  map?: {
    enabled?: boolean;
    embedUrl?: string;
    title?: string;
    description?: string;
    height?: ContactMapHeight;
    fallbackCopy?: string;
  };
  style?: {
    spacing?: ContactSpacing;
    background?: string;
    columns?: ContactColumns;
    surfaceColor?: string;
    borderColor?: string;
    borderWidth?: ContactBorderWidth;
    textColor?: string;
    mutedTextColor?: string;
    buttonBackgroundColor?: string;
    buttonTextColor?: string;
    buttonBorderColor?: string;
    maxWidth?: ContactMaxWidth;
    paddingX?: ContactPaddingX;
    panelRadius?: ContactRadius;
    buttonRadius?: ContactRadius;
  };
  resolved?: ContactResolvedRuntimeData;
};

const contactFieldLabelMap: Record<ContactFieldId, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  message: "Message",
};

const contactFieldPlaceholderMap: Record<ContactFieldId, string> = {
  name: "Your name",
  email: "you@example.com",
  phone: "+1 555 123 456",
  message: "Tell us how we can help...",
};

const contactFieldInputTypeMap: Record<ContactFieldId, string> = {
  name: "text",
  email: "email",
  phone: "tel",
  message: "text",
};

const contactFieldAutocompleteMap: Record<ContactFieldId, ContactFieldAutocomplete> = {
  name: "name",
  email: "email",
  phone: "tel",
  message: "off",
};

export const contactRuntimeFieldTypeMap: Record<ContactFieldId, NormalizedFormField["type"]> = {
  name: "text",
  email: "email",
  phone: "phone",
  message: "textarea",
};

const contactDetailLabelMap: Record<ContactDetailKey, string> = {
  phone: "Phone",
  email: "Email",
  address: "Address",
  hours: "Hours",
};

const contactDetailIconMap: Record<ContactDetailKey, ContactIconKey> = {
  phone: "phone",
  email: "mail",
  address: "map-pin",
  hours: "clock",
};

const spacingClassMap: Record<ContactSpacing, string> = {
  none: "gap-0 py-0",
  sm: "gap-4 py-6",
  md: "gap-6 py-8",
  lg: "gap-8 py-10",
  xl: "gap-10 py-12",
};

const maxWidthClassMap: Record<ContactMaxWidth, string> = {
  none: "",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
};

const paddingXClassMap: Record<ContactPaddingX, string> = {
  none: "px-0",
  sm: "px-2",
  md: "px-4",
  lg: "px-6",
};

const radiusClassMap: Record<ContactRadius, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

const mapHeightClassMap: Record<ContactMapHeight, string> = {
  sm: "h-40",
  md: "h-56",
  lg: "h-72",
  xl: "h-96",
};

const variantDescriptionMap: Record<ContactVariantId, string> = {
  "form-left": "Form on the left and contact details on the right.",
  "form-right": "Contact details on the left and form on the right.",
  minimal: "Contact details focus with optional map embed.",
};

const fieldOptionSet = new Set<string>(contactFieldOptions);
const iconOptionSet = new Set<ContactIconKey>(["none", "phone", "mail", "map-pin", "clock"]);
const socialPlatformSet = new Set<ContactSocialPlatform>([
  "x",
  "linkedin",
  "facebook",
  "instagram",
  "youtube",
  "custom",
]);

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveNonEmptyString = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeOptionalString = (value: string | undefined) => {
  if (typeof value !== "string") return "";
  return value;
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const resolveContactSpacing = (value: string | undefined): ContactSpacing => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return "md";
};

const resolveContactColumns = (value: string | undefined): ContactColumns => {
  if (value === "one" || value === "two") return value;
  return "two";
};

const resolveContactBorderWidth = (value: string | undefined): ContactBorderWidth => {
  if (value === "0" || value === "1" || value === "2" || value === "3") return value;
  return "1";
};

const resolveContactFieldLayout = (value: string | undefined): ContactFieldLayout => {
  if (value === "two") return "two";
  return "one";
};

const resolveContactSubmissionMode = (value: string | undefined): ContactSubmissionMode => {
  if (value === "forms-runtime") return "forms-runtime";
  return "static";
};

const resolveContactMapHeight = (value: string | undefined): ContactMapHeight => {
  if (value === "sm" || value === "md" || value === "lg" || value === "xl") return value;
  return "md";
};

const resolveContactMaxWidth = (value: string | undefined): ContactMaxWidth => {
  if (value === "none" || value === "md" || value === "lg" || value === "xl" || value === "2xl") {
    return value;
  }
  return "xl";
};

const resolveContactPaddingX = (value: string | undefined): ContactPaddingX => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg") return value;
  return "md";
};

const resolveContactRadius = (value: string | undefined): ContactRadius => {
  if (value === "sm" || value === "md" || value === "lg" || value === "xl" || value === "full") {
    return value;
  }
  return "md";
};

const resolveContactAutocomplete = (
  field: ContactFieldId,
  value: string | undefined
): ContactFieldAutocomplete => {
  if (value === "name" || value === "email" || value === "tel" || value === "off") return value;
  return contactFieldAutocompleteMap[field];
};

const resolveContactFieldSpan = (value: string | undefined): ContactFieldSpan => {
  if (value === "half" || value === "full") return value;
  return "full";
};

const resolveContactIconKey = (
  value: string | undefined,
  fallback: ContactIconKey
): ContactIconKey => {
  if (value && iconOptionSet.has(value as ContactIconKey)) return value as ContactIconKey;
  return fallback;
};

const normalizeFieldList = (value: unknown, fallback: ContactFieldId[]): ContactFieldId[] => {
  const source = Array.isArray(value) ? value : [];
  const normalized: ContactFieldId[] = [];
  const seen = new Set<ContactFieldId>();

  for (const item of source) {
    if (typeof item !== "string") continue;
    const next = item.trim().toLowerCase();
    if (!fieldOptionSet.has(next)) continue;
    const field = next as ContactFieldId;
    if (seen.has(field)) continue;
    seen.add(field);
    normalized.push(field);
  }

  if (normalized.length > 0) return normalized;
  return [...fallback];
};

const normalizeContactFieldSettings = (
  field: ContactFieldId,
  value: ContactFieldSettings | undefined
): ContactFieldSettings => ({
  label: resolveNonEmptyString(value?.label, contactFieldLabelMap[field]),
  placeholder: resolveString(value?.placeholder, contactFieldPlaceholderMap[field]),
  autocomplete: resolveContactAutocomplete(field, value?.autocomplete),
  span: resolveContactFieldSpan(value?.span),
});

const normalizeContactDetailDisplay = (
  key: ContactDetailKey,
  value: ContactDetailDisplay | undefined
): ContactDetailDisplay => ({
  label: resolveNonEmptyString(value?.label, contactDetailLabelMap[key]),
  icon: resolveContactIconKey(value?.icon, contactDetailIconMap[key]),
});

const normalizeContactSocialLinks = (value: unknown): ContactSocialLink[] => {
  const source = Array.isArray(value) ? value : [];

  return source.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as ContactSocialLink;
    const platform = socialPlatformSet.has(row.platform ?? "custom")
      ? (row.platform ?? "custom")
      : "custom";

    return [
      {
        id: resolveNonEmptyString(row.id, `contact-social-${index + 1}`),
        platform,
        label: normalizeOptionalString(row.label),
        href: normalizeOptionalString(row.href),
      },
    ];
  });
};

const normalizeContactSubmission = (value: ContactSubmissionSettings | undefined) => ({
  mode: resolveContactSubmissionMode(value?.mode),
  staticMessage: resolveNonEmptyString(
    value?.staticMessage,
    "This contact form is not connected yet."
  ),
  formId: resolveString(value?.formId, ""),
  fieldMap: {
    name: resolveString(value?.fieldMap?.name, ""),
    email: resolveString(value?.fieldMap?.email, ""),
    phone: resolveString(value?.fieldMap?.phone, ""),
    message: resolveString(value?.fieldMap?.message, ""),
  },
  successMessage: resolveNonEmptyString(value?.successMessage, "Thanks for your message."),
  errorMessage: resolveNonEmptyString(
    value?.errorMessage,
    "Unable to send your message. Please try again."
  ),
});

const resolveMapEmbedUrl = (value: string | undefined) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const isGoogleMapsHost =
      host === "google.com" ||
      host === "maps.google.com" ||
      /^google\.[a-z.]+$/.test(host) ||
      /^maps\.google\.[a-z.]+$/.test(host);
    if (!isGoogleMapsHost) return "";
    return parsed.toString();
  } catch {
    return "";
  }
};

export const getContactMapUrlState = (value: string | undefined) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      valid: false,
      safeUrl: "",
      message: "Add a Google Maps HTTPS embed URL.",
    };
  }

  const safeUrl = resolveMapEmbedUrl(value);
  if (!safeUrl) {
    return {
      valid: false,
      safeUrl: "",
      message: "Use a valid HTTPS Google Maps embed URL.",
    };
  }

  return {
    valid: true,
    safeUrl,
    message: "Valid Google Maps HTTPS embed is ready for runtime.",
  };
};

export const buildContactMapEmbedUrl = (location: string | undefined) => {
  const trimmed = typeof location === "string" ? location.trim() : "";
  if (!trimmed) return "";

  const url = new URL("https://www.google.com/maps");
  url.searchParams.set("q", trimmed.slice(0, 200));
  url.searchParams.set("output", "embed");
  return url.toString();
};

export const readContactMapLocation = (embedUrl: string | undefined) => {
  if (typeof embedUrl !== "string" || embedUrl.trim().length === 0) return "";

  try {
    const parsed = new URL(embedUrl);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("google.") && host !== "maps.google.com") return "";
    return parsed.searchParams.get("q")?.trim() ?? "";
  } catch {
    return "";
  }
};

export const buildContactSocialHref = (
  platform: ContactSocialPlatform | undefined,
  profile: string | undefined
) => {
  const normalizedPlatform = socialPlatformSet.has(platform ?? "custom")
    ? (platform ?? "custom")
    : "custom";
  const trimmedProfile = typeof profile === "string" ? profile.trim() : "";
  if (!trimmedProfile || normalizedPlatform === "custom") return "";
  let profileSource = trimmedProfile;

  if (/^https?:\/\//i.test(trimmedProfile)) {
    profileSource = readContactSocialProfile(normalizedPlatform, trimmedProfile);
    if (!profileSource) return "";
  }

  const handle = profileSource.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
  if (!handle) return "";
  const encodedHandle = handle
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  switch (normalizedPlatform) {
    case "x":
      return `https://x.com/${encodedHandle}`;
    case "linkedin": {
      const parts = handle.split("/").filter(Boolean);
      if ((parts[0] === "company" || parts[0] === "in") && parts[1]) {
        return `https://www.linkedin.com/${parts[0]}/${encodeURIComponent(parts[1])}`;
      }
      return `https://www.linkedin.com/company/${encodedHandle}`;
    }
    case "facebook":
      return `https://www.facebook.com/${encodedHandle}`;
    case "instagram":
      return `https://www.instagram.com/${encodedHandle}`;
    case "youtube":
      return `https://www.youtube.com/@${encodedHandle}`;
    default:
      return "";
  }
};

export const readContactSocialProfile = (
  platform: ContactSocialPlatform | undefined,
  href: string | undefined
) => {
  if (typeof href !== "string" || href.trim().length === 0) return "";

  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const parts = parsed.pathname.split("/").filter(Boolean);

    switch (platform) {
      case "x":
        return host === "x.com" || host === "twitter.com" ? (parts[0] ?? "") : "";
      case "linkedin":
        if (host !== "linkedin.com") return "";
        if (parts[0] === "company") return parts[1] ?? "";
        if (parts[0] === "in" && parts[1]) return `in/${parts[1]}`;
        return "";
      case "facebook":
        return host === "facebook.com" ? (parts[0] ?? "") : "";
      case "instagram":
        return host === "instagram.com" ? (parts[0] ?? "") : "";
      case "youtube":
        return host === "youtube.com" ? (parts[0]?.replace(/^@/, "") ?? "") : "";
      default:
        return "";
    }
  } catch {
    return "";
  }
};

const socialHostByPlatform: Record<Exclude<ContactSocialPlatform, "custom">, Set<string>> = {
  x: new Set(["x.com", "twitter.com"]),
  linkedin: new Set(["linkedin.com"]),
  facebook: new Set(["facebook.com"]),
  instagram: new Set(["instagram.com"]),
  youtube: new Set(["youtube.com"]),
};

const normalizeContactSocialHref = (link: ContactSocialLink) => {
  const platform = link.platform ?? "custom";
  if (platform === "custom") return undefined;
  const attrs = resolveWidgetLinkAttrs(link.href, {
    allowHttp: true,
    openExternalInNewTab: true,
  });
  if (!attrs) return undefined;

  try {
    const parsed = new URL(attrs.href);
    if (parsed.protocol !== "https:") return undefined;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!socialHostByPlatform[platform].has(host)) return undefined;
    return attrs;
  } catch {
    return undefined;
  }
};

const contactColorValueSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS["inherited-render"],
    },
  ],
} as const;

export const contactSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    form: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        fields: {
          type: "array",
          items: { enum: [...contactFieldOptions] },
          minItems: 1,
          uniqueItems: true,
        },
        required: {
          type: "array",
          items: { enum: [...contactFieldOptions] },
          uniqueItems: true,
        },
        submitLabel: { type: "string" },
        fieldLayout: { enum: ["one", "two"] },
        fieldSettings: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                placeholder: { type: "string" },
                autocomplete: { enum: ["name", "email", "tel", "off"] },
                span: { enum: ["half", "full"] },
              },
            },
            email: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                placeholder: { type: "string" },
                autocomplete: { enum: ["name", "email", "tel", "off"] },
                span: { enum: ["half", "full"] },
              },
            },
            phone: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                placeholder: { type: "string" },
                autocomplete: { enum: ["name", "email", "tel", "off"] },
                span: { enum: ["half", "full"] },
              },
            },
            message: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                placeholder: { type: "string" },
                autocomplete: { enum: ["name", "email", "tel", "off"] },
                span: { enum: ["half", "full"] },
              },
            },
          },
        },
        submission: {
          type: "object",
          additionalProperties: false,
          properties: {
            mode: { enum: ["static", "forms-runtime"] },
            staticMessage: { type: "string" },
            formId: { type: "string" },
            fieldMap: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                message: { type: "string" },
              },
            },
            successMessage: { type: "string" },
            errorMessage: { type: "string" },
          },
        },
      },
    },
    contact: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
        hours: { type: "string" },
        details: {
          type: "object",
          additionalProperties: false,
          properties: {
            phone: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                icon: { enum: ["none", "phone", "mail", "map-pin", "clock"] },
              },
            },
            email: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                icon: { enum: ["none", "phone", "mail", "map-pin", "clock"] },
              },
            },
            address: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                icon: { enum: ["none", "phone", "mail", "map-pin", "clock"] },
              },
            },
            hours: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                icon: { enum: ["none", "phone", "mail", "map-pin", "clock"] },
              },
            },
          },
        },
        social: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              platform: {
                enum: ["x", "linkedin", "facebook", "instagram", "youtube", "custom"],
              },
              label: { type: "string" },
              href: { type: "string" },
            },
          },
        },
      },
    },
    map: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        embedUrl: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        height: { enum: ["sm", "md", "lg", "xl"] },
        fallbackCopy: { type: "string" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        spacing: { enum: ["none", "sm", "md", "lg", "xl"] },
        background: contactColorValueSchema,
        columns: { enum: ["one", "two"] },
        surfaceColor: contactColorValueSchema,
        borderColor: contactColorValueSchema,
        borderWidth: { enum: ["0", "1", "2", "3"] },
        textColor: contactColorValueSchema,
        mutedTextColor: contactColorValueSchema,
        buttonBackgroundColor: contactColorValueSchema,
        buttonTextColor: contactColorValueSchema,
        buttonBorderColor: contactColorValueSchema,
        maxWidth: { enum: ["none", "md", "lg", "xl", "2xl"] },
        paddingX: { enum: ["none", "sm", "md", "lg"] },
        panelRadius: { enum: ["sm", "md", "lg", "xl", "full"] },
        buttonRadius: { enum: ["sm", "md", "lg", "xl", "full"] },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        formId: { type: "string" },
        formName: { type: "string" },
        description: { type: ["string", "null"] },
        status: { type: "string" },
        successMessage: { type: ["string", "null"] },
        successRedirectUrl: { type: ["string", "null"] },
        submissionAccess: { enum: ["public", "internal"] },
        submissionNonce: { type: ["string", "null"] },
        botProtection: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            provider: { enum: ["recaptcha_v3"] },
            siteKey: { type: "string" },
            action: { enum: ["public_write"] },
          },
        },
        error: { type: "string" },
        fields: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              type: { type: "string" },
              label: { type: "string" },
              name: { type: "string" },
              required: { type: "boolean" },
              orderIndex: { type: "number" },
              settings: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
  },
} as const;

export const contactDefaults: ContactData = {
  title: "",
  description: "",
  form: {
    title: "",
    fields: ["name", "email", "message"],
    required: ["email", "message"],
    submitLabel: "Send message",
    fieldLayout: "one",
    fieldSettings: {
      name: {
        label: "Name",
        placeholder: "Your name",
        autocomplete: "name",
        span: "full",
      },
      email: {
        label: "Email",
        placeholder: "you@example.com",
        autocomplete: "email",
        span: "full",
      },
      phone: {
        label: "Phone",
        placeholder: "+1 555 123 456",
        autocomplete: "tel",
        span: "full",
      },
      message: {
        label: "Message",
        placeholder: "Tell us how we can help...",
        autocomplete: "off",
        span: "full",
      },
    },
    submission: {
      mode: "static",
      staticMessage: "This contact form is not connected yet.",
      formId: "",
      fieldMap: {
        name: "",
        email: "",
        phone: "",
        message: "",
      },
      successMessage: "Thanks for your message.",
      errorMessage: "Unable to send your message. Please try again.",
    },
  },
  contact: {
    title: "",
    phone: "+1 555 123 456",
    email: "hello@example.com",
    address: "123 Market Street",
    hours: "Mon-Fri 9-5",
    details: {
      phone: { label: "Phone", icon: "phone" },
      email: { label: "Email", icon: "mail" },
      address: { label: "Address", icon: "map-pin" },
      hours: { label: "Hours", icon: "clock" },
    },
    social: [],
  },
  map: {
    enabled: false,
    embedUrl: "",
    title: "",
    description: "",
    height: "md",
    fallbackCopy: "Map is unavailable.",
  },
  style: {
    spacing: "md",
    background: undefined,
    columns: "two",
    surfaceColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    borderWidth: "1",
    textColor: undefined,
    mutedTextColor: undefined,
    buttonBackgroundColor: undefined,
    buttonTextColor: undefined,
    buttonBorderColor: undefined,
    maxWidth: "xl",
    paddingX: "md",
    panelRadius: "xl",
    buttonRadius: "md",
  },
};

export const contactEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "contact.wizard.layout",
      title: "Contact layout",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["variant"],
    },
    {
      mode: "wizard",
      id: "contact.wizard.form",
      title: "Contact form",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["form.fields", "form.submitLabel"],
    },
    {
      mode: "visual",
      id: "contact.visual.variant-header",
      title: "Variant and section header",
      role: "setup",
      writablePaths: ["variant", "title", "description"],
    },
    {
      mode: "visual",
      id: "contact.visual.form-fields-required",
      title: "Form fields and required rules",
      role: "content",
      writablePaths: ["form.title", "form.fields", "form.required", "form.submitLabel"],
    },
    {
      mode: "visual",
      id: "contact.visual.field-copy-layout",
      title: "Field labels, placeholders, and layout",
      role: "content",
      writablePaths: ["form.fieldLayout", "form.fieldSettings"],
    },
    {
      mode: "visual",
      id: "contact.visual.submission-runtime",
      title: "Submission runtime binding",
      role: "source",
      writablePaths: [
        "form.submission.mode",
        "form.submission.formId",
        "form.submission.fieldMap",
        "form.submission.staticMessage",
        "form.submission.successMessage",
        "form.submission.errorMessage",
      ],
    },
    {
      mode: "visual",
      id: "contact.visual.details-business",
      title: "Contact details and business info",
      role: "content",
      writablePaths: [
        "contact.title",
        "contact.phone",
        "contact.email",
        "contact.address",
        "contact.hours",
        "contact.details",
        "contact.social",
      ],
    },
    {
      mode: "visual",
      id: "contact.visual.map-display",
      title: "Map source and display behavior",
      role: "content",
      writablePaths: [
        "map.enabled",
        "map.embedUrl",
        "map.title",
        "map.description",
        "map.height",
        "map.fallbackCopy",
      ],
    },
    {
      mode: "visual",
      id: "contact.visual.surface-styling",
      title: "Colors, borders, and surface styling",
      role: "visual",
      writablePaths: [
        "style.surfaceColor",
        "style.background",
        "style.borderColor",
        "style.borderWidth",
        "style.textColor",
        "style.mutedTextColor",
        "style.buttonBackgroundColor",
        "style.buttonTextColor",
        "style.buttonBorderColor",
        "style.panelRadius",
        "style.buttonRadius",
      ],
    },
    {
      mode: "visual",
      id: "contact.visual.layout-spacing",
      title: "Section layout and spacing",
      role: "layout",
      writablePaths: ["style.spacing", "style.columns", "style.maxWidth", "style.paddingX"],
    },
    {
      mode: "advanced",
      id: "contact.advanced.map-runtime",
      title: "Map source and runtime metadata",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "map.enabled",
        "map.embedUrl",
        "map.title",
        "map.description",
        "map.height",
        "map.fallbackCopy",
      ],
    },
    {
      mode: "advanced",
      id: "contact.advanced.normalization",
      title: "Normalization and fallback controls",
      role: "technical",
      writablePaths: [],
      readOnlyPaths: [
        "form.fields",
        "form.required",
        "form.fieldSettings",
        "contact.details",
        "style",
      ],
    },
    {
      mode: "advanced",
      id: "contact.advanced.runtime-summary",
      title: "Runtime diagnostics summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["form.fields", "contact.details", "contact.social", "resolved"],
    },
  ],
};

export const resolveContactVariant = (variant: string): ContactVariantId => {
  if (variant === "form-right" || variant === "minimal") return variant;
  return "form-left";
};

export function normalizeContactData(data: ContactData): ContactData {
  const formDefaults = contactDefaults.form!;
  const contactDefaultsSection = contactDefaults.contact!;
  const mapDefaults = contactDefaults.map!;
  const styleDefaults = contactDefaults.style!;
  const hasStyleObject = data.style !== undefined;
  const normalizeColor = (value: unknown) =>
    resolveClearableCssColorValue(value, "inherited-render");

  const fields = normalizeFieldList(data.form?.fields, formDefaults.fields ?? []);
  const requiredCandidates = normalizeFieldList(data.form?.required, formDefaults.required ?? []);
  const fieldSet = new Set<ContactFieldId>(fields);
  const required = requiredCandidates.filter((item) => fieldSet.has(item));

  const fieldSettings = Object.fromEntries(
    contactFieldOptions.map((field) => [
      field,
      normalizeContactFieldSettings(field, data.form?.fieldSettings?.[field]),
    ])
  ) as Record<ContactFieldId, ContactFieldSettings>;

  const detailDisplay = Object.fromEntries(
    contactDetailOptions.map((key) => [
      key,
      normalizeContactDetailDisplay(key, data.contact?.details?.[key]),
    ])
  ) as Record<ContactDetailKey, ContactDetailDisplay>;

  return {
    ...data,
    title: resolveString(data.title, contactDefaults.title ?? ""),
    description: resolveString(data.description, contactDefaults.description ?? ""),
    form: {
      title: resolveString(data.form?.title, formDefaults.title ?? ""),
      fields,
      required,
      submitLabel: resolveNonEmptyString(
        data.form?.submitLabel,
        formDefaults.submitLabel ?? "Send message"
      ),
      fieldLayout: resolveContactFieldLayout(data.form?.fieldLayout),
      fieldSettings,
      submission: normalizeContactSubmission(data.form?.submission),
    },
    contact: {
      title: resolveString(data.contact?.title, contactDefaultsSection.title ?? ""),
      phone: resolveString(data.contact?.phone, contactDefaultsSection.phone ?? ""),
      email: resolveString(data.contact?.email, contactDefaultsSection.email ?? ""),
      address: resolveString(data.contact?.address, contactDefaultsSection.address ?? ""),
      hours: resolveString(data.contact?.hours, contactDefaultsSection.hours ?? ""),
      details: detailDisplay,
      social: normalizeContactSocialLinks(data.contact?.social),
    },
    map: {
      enabled: data.map?.enabled ?? mapDefaults.enabled ?? false,
      embedUrl: resolveString(data.map?.embedUrl, mapDefaults.embedUrl ?? ""),
      title: resolveString(data.map?.title, mapDefaults.title ?? ""),
      description: resolveString(data.map?.description, mapDefaults.description ?? ""),
      height: resolveContactMapHeight(data.map?.height),
      fallbackCopy: resolveNonEmptyString(
        data.map?.fallbackCopy,
        mapDefaults.fallbackCopy ?? "Map is unavailable."
      ),
    },
    style: {
      spacing: resolveContactSpacing(data.style?.spacing),
      background: hasStyleObject
        ? normalizeColor(data.style?.background)
        : styleDefaults.background,
      columns: resolveContactColumns(data.style?.columns),
      surfaceColor: hasStyleObject
        ? normalizeColor(data.style?.surfaceColor)
        : styleDefaults.surfaceColor,
      borderColor:
        normalizeColor(data.style?.borderColor) ??
        styleDefaults.borderColor ??
        "var(--color-border)",
      borderWidth: resolveContactBorderWidth(data.style?.borderWidth),
      textColor: hasStyleObject ? normalizeColor(data.style?.textColor) : styleDefaults.textColor,
      mutedTextColor: hasStyleObject
        ? normalizeColor(data.style?.mutedTextColor)
        : styleDefaults.mutedTextColor,
      buttonBackgroundColor: hasStyleObject
        ? normalizeColor(data.style?.buttonBackgroundColor)
        : styleDefaults.buttonBackgroundColor,
      buttonTextColor: hasStyleObject
        ? normalizeColor(data.style?.buttonTextColor)
        : styleDefaults.buttonTextColor,
      buttonBorderColor: hasStyleObject
        ? normalizeColor(data.style?.buttonBorderColor)
        : styleDefaults.buttonBorderColor,
      maxWidth: resolveContactMaxWidth(data.style?.maxWidth),
      paddingX: resolveContactPaddingX(data.style?.paddingX),
      panelRadius: data.style?.panelRadius
        ? resolveContactRadius(data.style?.panelRadius)
        : (styleDefaults.panelRadius ?? "xl"),
      buttonRadius: data.style?.buttonRadius
        ? resolveContactRadius(data.style?.buttonRadius)
        : (styleDefaults.buttonRadius ?? "md"),
    },
  };
}

type ContactIconProps = {
  icon: ContactIconKey;
};

function ContactIcon({ icon }: ContactIconProps) {
  if (icon === "none") return null;

  const commonProps = {
    "aria-hidden": true,
    className: "h-4 w-4 text-[var(--color-text)]/70",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.75,
    viewBox: "0 0 24 24",
  };

  if (icon === "phone") {
    return (
      <svg {...commonProps}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.17 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72l.34 2.72a2 2 0 0 1-.57 1.72L7.1 9.9a16 16 0 0 0 7 7l1.74-1.73a2 2 0 0 1 1.72-.57l2.72.34A2 2 0 0 1 22 16.92Z" />
      </svg>
    );
  }

  if (icon === "mail") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  if (icon === "map-pin") {
    return (
      <svg {...commonProps}>
        <path d="M12 21s-6-5.33-6-11a6 6 0 1 1 12 0c0 5.67-6 11-6 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const phoneHrefPattern = /[^\d+]/g;
const emailHrefPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const supportedRuntimeFieldTypes = new Set(["text", "email", "phone", "textarea"]);

const toContactHref = (key: ContactDetailKey, value: string) => {
  const text = value.trim();
  if (text.length === 0) return undefined;

  if (key === "email" && emailHrefPattern.test(text)) {
    return `mailto:${text}`;
  }

  if (key === "phone") {
    const normalized = text.replace(phoneHrefPattern, "");
    return normalized.length > 0 ? `tel:${normalized}` : undefined;
  }

  return undefined;
};

type ContactRuntimeFieldMatch = {
  contactField: ContactFieldId;
  formField: NormalizedFormField;
};

const resolveContactRuntimeFields = (
  contactFields: ContactFieldId[],
  resolvedFields: NormalizedFormField[],
  fieldMap: Partial<Record<ContactFieldId, string>> | undefined
): ContactRuntimeFieldMatch[] => {
  const byName = new Map(resolvedFields.map((field) => [field.name, field]));
  const usedNames = new Set<string>();

  return contactFields.flatMap((contactField) => {
    const mappedName = resolveString(fieldMap?.[contactField], contactField).trim();
    if (!mappedName) return [];
    const formField = byName.get(mappedName);
    if (!formField) return [];
    if (usedNames.has(formField.name)) return [];
    if (!supportedRuntimeFieldTypes.has(formField.type)) return [];
    if (formField.type !== contactRuntimeFieldTypeMap[contactField]) return [];
    usedNames.add(formField.name);
    return [{ contactField, formField }];
  });
};

type ContactFieldControlProps = {
  field: ContactFieldId;
  idBase: string;
  settings: ContactFieldSettings;
  required: boolean;
  name?: string;
  twoColumn: boolean;
  textStyle?: CSSProperties;
  fieldBorderStyle?: CSSProperties;
};

function ContactFieldControl({
  field,
  idBase,
  settings,
  required,
  name,
  twoColumn,
  textStyle,
  fieldBorderStyle,
}: ContactFieldControlProps) {
  const fieldId = `${idBase}-${field}`;
  const fieldName = name ?? field;
  const wrapperClassName =
    twoColumn && settings.span !== "half" ? "md:col-span-2 space-y-1" : "space-y-1";

  return (
    <div className={wrapperClassName}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-[var(--color-text)]"
        style={textStyle}
      >
        {settings.label}
      </label>
      {field === "message" ? (
        <textarea
          id={fieldId}
          name={fieldName}
          required={required}
          rows={5}
          autoComplete={settings.autocomplete}
          className="h-28 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder={settings.placeholder}
          data-contact-field={field}
          style={fieldBorderStyle}
        />
      ) : (
        <input
          id={fieldId}
          name={fieldName}
          type={contactFieldInputTypeMap[field]}
          required={required}
          autoComplete={settings.autocomplete}
          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder={settings.placeholder}
          data-contact-field={field}
          style={fieldBorderStyle}
        />
      )}
    </div>
  );
}

function formatDetailValue(key: ContactDetailKey, value: string, href: string | undefined) {
  if (href) {
    return (
      <a href={href} className="text-[var(--color-text)]/80 underline-offset-2 hover:underline">
        {value}
      </a>
    );
  }

  return <span className={key === "address" ? "whitespace-pre-line" : undefined}>{value}</span>;
}

function redactContactDiagnostics(value: ContactData) {
  const normalized = normalizeContactData(value) as ContactData & {
    resolved?: {
      submissionNonce?: string | null;
      [key: string]: unknown;
    };
  };

  if (!normalized.resolved) return normalized;

  return {
    ...normalized,
    resolved: {
      ...normalized.resolved,
      ...(normalized.resolved.submissionNonce !== undefined
        ? { submissionNonce: "[redacted]" }
        : {}),
    },
  };
}

export function ContactBlock({
  data,
  variant,
  blockId,
}: {
  data: ContactData;
  variant: string;
  blockId?: string;
}) {
  const normalizedData = normalizeContactData(data);
  const resolvedVariant = resolveContactVariant(variant);

  const form = normalizedData.form ?? contactDefaults.form!;
  const contact = normalizedData.contact ?? contactDefaults.contact!;
  const map = normalizedData.map ?? contactDefaults.map!;
  const style = normalizedData.style ?? contactDefaults.style!;

  const requiredFields = new Set<ContactFieldId>(form.required ?? []);
  const mapUrlState = getContactMapUrlState(map.embedUrl);
  const showMap = Boolean(map.enabled) && mapUrlState.valid;
  const showForm = resolvedVariant !== "minimal";
  const twoColumnFields = form.fieldLayout === "two";
  const resolved = normalizedData.resolved;
  const visibleFields = form.fields ?? [];
  const resolvedFields = resolved?.fields ?? [];
  const hasConditionalRuntimeFields = resolvedFields.some((field) => {
    const operator =
      field.settings &&
      typeof field.settings === "object" &&
      "logic" in field.settings &&
      field.settings.logic &&
      typeof field.settings.logic === "object" &&
      "operator" in field.settings.logic
        ? field.settings.logic.operator
        : undefined;
    return typeof operator === "string" && operator !== "always";
  });
  const hasMultiStepRuntimeFields = resolvedFields.some((field) => {
    const step =
      field.settings && typeof field.settings === "object" && "formStep" in field.settings
        ? field.settings.formStep
        : field.settings && typeof field.settings === "object" && "step" in field.settings
          ? field.settings.step
          : undefined;
    return typeof step === "number" && Number.isFinite(step) && step > 1;
  });
  const runtimeFields = resolveContactRuntimeFields(
    visibleFields,
    resolvedFields,
    form.submission?.fieldMap
  );
  const hasSubmissionNonce =
    typeof resolved?.submissionNonce === "string" && resolved.submissionNonce.trim().length > 0;
  const canSubmit =
    showForm &&
    form.submission?.mode === "forms-runtime" &&
    (form.submission?.formId ?? "").trim().length > 0 &&
    resolved !== undefined &&
    !resolved.error &&
    resolved.submissionAccess === "public" &&
    hasSubmissionNonce &&
    !hasConditionalRuntimeFields &&
    !hasMultiStepRuntimeFields &&
    runtimeFields.length > 0 &&
    runtimeFields.length === visibleFields.length &&
    runtimeFields.length === resolvedFields.length;
  const configuredFormMode = form.submission?.mode ?? "static";
  const effectiveFormMode = canSubmit ? "forms-runtime" : "static";
  const runtimeBoundary = (() => {
    if (!showForm) return "hidden";
    if (configuredFormMode !== "forms-runtime") return "static";
    if ((form.submission?.formId ?? "").trim().length === 0) return "missing-form-id";
    if (!resolved) return "runtime-data-missing";
    if (resolved.error) return resolved.error;
    if (resolved.submissionAccess !== "public") return "internal";
    if (!hasSubmissionNonce) return "nonce-missing";
    if (hasConditionalRuntimeFields) return "conditional-fields";
    if (hasMultiStepRuntimeFields) return "multi-step-fields";
    if (
      runtimeFields.length === 0 ||
      runtimeFields.length !== visibleFields.length ||
      runtimeFields.length !== resolvedFields.length
    ) {
      return "field-mismatch";
    }
    return "interactive";
  })();
  const formSuccessMessage = (
    form.submission?.successMessage ||
    resolved?.successMessage ||
    contactDefaults.form?.submission?.successMessage ||
    ""
  ).trim();
  const formErrorMessage = (
    form.submission?.errorMessage ||
    contactDefaults.form?.submission?.errorMessage ||
    "Unable to send your message. Please try again."
  ).trim();
  const staticMessage = (
    form.submission?.staticMessage ||
    contactDefaults.form?.submission?.staticMessage ||
    ""
  ).trim();

  const detailsOrderClass = resolvedVariant === "form-right" ? "md:order-1" : "md:order-2";
  const formOrderClass = resolvedVariant === "form-right" ? "md:order-2" : "md:order-1";
  const columnsClass =
    resolvedVariant === "minimal"
      ? "grid-cols-1"
      : style.columns === "one"
        ? "md:grid-cols-1"
        : "md:grid-cols-2";
  const renderColor = (value: unknown) => resolveClearableCssColorValue(value, "inherited-render");

  const sectionStyle: CSSProperties =
    compactStyle({
      backgroundColor: renderColor(style.background),
    }) ?? {};

  const panelBorderWidth = style.borderWidth ?? "1";
  const panelRadius = style.panelRadius ?? "xl";
  const buttonRadius = style.buttonRadius ?? "md";
  const panelStyle: CSSProperties =
    compactStyle({
      backgroundColor: renderColor(style.surfaceColor),
      borderColor: renderColor(style.borderColor) ?? "var(--color-border)",
      borderStyle: "solid",
      borderWidth: `${panelBorderWidth}px`,
    }) ?? {};
  const headingTextStyle = compactStyle({
    color: renderColor(style.textColor),
  });
  const bodyTextStyle = compactStyle({
    color: renderColor(style.mutedTextColor),
  });
  const fieldBorderStyle = compactStyle({
    borderColor: renderColor(style.borderColor) ?? "var(--color-border)",
  });
  const submitButtonStyle = compactStyle({
    backgroundColor: renderColor(style.buttonBackgroundColor),
    color: renderColor(style.buttonTextColor),
    borderColor: renderColor(style.buttonBorderColor) ?? "transparent",
    borderStyle: "solid",
    borderWidth: "1px",
  });

  const contactIdBase = blockId ?? "contact";
  const sectionTitleId = normalizedData.title ? `${contactIdBase}-title` : undefined;
  const sectionDescriptionId = normalizedData.description
    ? `${contactIdBase}-description`
    : undefined;
  const formTitleId = form.title ? `${contactIdBase}-form-title` : undefined;
  const detailsTitleId = contact.title ? `${contactIdBase}-details-title` : undefined;
  const mapTitleId = map.title ? `${contactIdBase}-map-title` : undefined;

  const details = contactDetailOptions.flatMap((key) => {
    const value = contact[key];
    if (typeof value !== "string" || value.trim().length === 0) return [];
    const display = contact.details?.[key] ?? normalizeContactDetailDisplay(key, undefined);
    return [
      {
        key,
        value,
        label: display.label ?? contactDetailLabelMap[key],
        icon: display.icon ?? contactDetailIconMap[key],
        href: toContactHref(key, value),
      },
    ];
  });

  const socialLinks = (contact.social ?? []).flatMap((link, index) => {
    const linkAttrs = normalizeContactSocialHref(link);
    if (!linkAttrs) return [];
    const label = link.label?.trim();
    if (!label) return [];
    return [
      {
        id: link.id ?? `contact-social-${index + 1}`,
        label,
        linkAttrs,
      },
    ] as const;
  });

  const sectionAriaLabel = sectionTitleId === undefined ? "Contact section" : undefined;

  return (
    <section
      className={joinClasses(
        "mx-auto grid w-full",
        maxWidthClassMap[style.maxWidth ?? "xl"],
        paddingXClassMap[style.paddingX ?? "md"],
        spacingClassMap[style.spacing ?? "md"],
        columnsClass
      )}
      style={sectionStyle}
      aria-labelledby={sectionTitleId}
      aria-describedby={sectionDescriptionId}
      aria-label={sectionAriaLabel}
      data-contact-variant={resolvedVariant}
      data-contact-spacing={style.spacing}
      data-contact-columns={resolvedVariant === "minimal" ? "one" : style.columns}
      data-contact-map={String(showMap)}
      data-contact-border-width={panelBorderWidth}
      data-contact-max-width={style.maxWidth}
      data-contact-padding-x={style.paddingX}
    >
      {normalizedData.title || normalizedData.description ? (
        <div className={showForm ? "md:col-span-2" : undefined}>
          {normalizedData.title ? (
            <h2
              id={sectionTitleId}
              className="text-2xl font-semibold text-[var(--color-text)]"
              style={headingTextStyle}
            >
              {normalizedData.title}
            </h2>
          ) : null}
          {normalizedData.description ? (
            <p
              id={sectionDescriptionId}
              className={joinClasses(
                "text-sm text-[var(--color-text)]/75",
                normalizedData.title ? "mt-2" : undefined
              )}
              style={bodyTextStyle}
            >
              {normalizedData.description}
            </p>
          ) : null}
        </div>
      ) : null}

      {showForm ? (
        <div
          className={joinClasses("space-y-4 p-4", radiusClassMap[panelRadius], formOrderClass)}
          style={panelStyle}
          role="group"
          aria-labelledby={formTitleId}
          aria-label={formTitleId ? undefined : "Contact form"}
          data-contact-form-mode={effectiveFormMode}
          data-contact-form-configured-mode={configuredFormMode}
          data-contact-runtime-boundary={runtimeBoundary}
        >
          {form.title ? (
            <h3
              id={formTitleId}
              className="text-lg font-semibold text-[var(--color-text)]"
              style={headingTextStyle}
            >
              {form.title}
            </h3>
          ) : null}
          {canSubmit ? (
            <form
              method="post"
              action={`/forms/${encodeURIComponent(form.submission?.formId ?? "")}/submissions`}
              data-form-id={form.submission?.formId ?? ""}
              data-nextless-form-runtime="1"
              data-form-success-message={formSuccessMessage}
              data-form-submit-label={form.submitLabel}
              data-form-captcha-site-key={resolved?.botProtection?.siteKey ?? ""}
              data-form-captcha-action={resolved?.botProtection?.action ?? ""}
              className="space-y-4"
              aria-labelledby={formTitleId}
              aria-label={formTitleId ? undefined : "Contact form"}
            >
              <div
                className={joinClasses(
                  "grid gap-4",
                  twoColumnFields ? "md:grid-cols-2" : undefined
                )}
              >
                {runtimeFields.map(({ contactField, formField }) => (
                  <ContactFieldControl
                    key={contactField}
                    field={contactField}
                    idBase={`${contactIdBase}-field`}
                    settings={
                      form.fieldSettings?.[contactField] ??
                      normalizeContactFieldSettings(contactField, undefined)
                    }
                    required={formField.required}
                    name={formField.name}
                    twoColumn={twoColumnFields}
                    textStyle={headingTextStyle}
                    fieldBorderStyle={fieldBorderStyle}
                  />
                ))}
              </div>
              {resolved?.submissionNonce ? (
                <input
                  type="hidden"
                  name="__nl_form_nonce"
                  value={resolved.submissionNonce}
                  data-form-security-nonce="1"
                />
              ) : null}
              {resolved?.botProtection?.siteKey ? (
                <input type="hidden" name="captchaToken" value="" data-form-security-captcha="1" />
              ) : null}
              <div className="space-y-2">
                <button
                  type="submit"
                  data-form-submit="1"
                  aria-busy="false"
                  className={joinClasses(
                    "border bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)]",
                    radiusClassMap[buttonRadius]
                  )}
                  style={submitButtonStyle}
                >
                  {form.submitLabel}
                </button>
                <p
                  className="hidden text-xs text-[var(--color-text)]/65"
                  data-form-embed-success="true"
                  style={bodyTextStyle}
                >
                  {formSuccessMessage}
                </p>
                <p className="hidden text-xs text-rose-600" data-form-embed-error="true">
                  {formErrorMessage}
                </p>
              </div>
            </form>
          ) : (
            <>
              <div
                className={joinClasses(
                  "grid gap-4",
                  twoColumnFields ? "md:grid-cols-2" : undefined
                )}
              >
                {visibleFields.map((field) => (
                  <ContactFieldControl
                    key={field}
                    field={field}
                    idBase={`${contactIdBase}-field`}
                    settings={
                      form.fieldSettings?.[field] ?? normalizeContactFieldSettings(field, undefined)
                    }
                    required={requiredFields.has(field)}
                    twoColumn={twoColumnFields}
                    textStyle={headingTextStyle}
                    fieldBorderStyle={fieldBorderStyle}
                  />
                ))}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  data-form-submit="1"
                  aria-busy="false"
                  className={joinClasses(
                    "border bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)]",
                    radiusClassMap[buttonRadius]
                  )}
                  style={submitButtonStyle}
                >
                  {form.submitLabel}
                </button>
                {staticMessage.length > 0 ? (
                  <p
                    className="text-xs text-[var(--color-text)]/65"
                    role="status"
                    style={bodyTextStyle}
                  >
                    {staticMessage}
                  </p>
                ) : null}
              </div>
            </>
          )}
          {canSubmit ? (
            <script dangerouslySetInnerHTML={{ __html: getFormRuntimeClientScript() }} />
          ) : null}
        </div>
      ) : null}

      <div
        className={joinClasses(
          "space-y-4 p-4 text-sm text-[var(--color-text)]/75",
          radiusClassMap[panelRadius],
          detailsOrderClass
        )}
        style={panelStyle}
        aria-labelledby={detailsTitleId}
        aria-label={detailsTitleId ? undefined : "Contact details"}
        data-contact-details={String(details.length)}
        data-contact-social-count={String(socialLinks.length)}
      >
        {contact.title ? (
          <h3
            id={detailsTitleId}
            className="text-lg font-semibold text-[var(--color-text)]"
            style={headingTextStyle}
          >
            {contact.title}
          </h3>
        ) : null}

        {details.length > 0 ? (
          <address className="not-italic">
            <dl className="space-y-3">
              {details.map((detail) => (
                <div key={detail.key} className="space-y-1">
                  <dt
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text)]/65"
                    style={bodyTextStyle}
                  >
                    <ContactIcon icon={detail.icon} />
                    <span>{detail.label}</span>
                  </dt>
                  <dd className="text-sm text-[var(--color-text)]/85" style={bodyTextStyle}>
                    {formatDetailValue(detail.key, detail.value, detail.href)}
                  </dd>
                </div>
              ))}
            </dl>
          </address>
        ) : null}

        {socialLinks.length > 0 ? (
          <ul className="flex flex-wrap gap-2 text-xs">
            {socialLinks.map((link) => (
              <li key={link.id}>
                <a
                  {...link.linkAttrs}
                  className={joinClasses(
                    "inline-flex border border-[var(--color-border)] px-2 py-1 text-[var(--color-text)]/80 transition hover:border-[var(--color-primary)] hover:text-[var(--color-text)]",
                    radiusClassMap[buttonRadius]
                  )}
                  style={{
                    ...fieldBorderStyle,
                    ...bodyTextStyle,
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {map.title || map.description || map.enabled ? (
          <div className="space-y-2">
            {map.title ? (
              <h3
                id={mapTitleId}
                className="text-base font-semibold text-[var(--color-text)]"
                style={headingTextStyle}
              >
                {map.title}
              </h3>
            ) : null}
            {map.description ? (
              <p className="text-sm text-[var(--color-text)]/75" style={bodyTextStyle}>
                {map.description}
              </p>
            ) : null}
            {showMap ? (
              <div
                className={joinClasses(
                  "overflow-hidden border border-[var(--color-border)]",
                  radiusClassMap[panelRadius]
                )}
                style={fieldBorderStyle}
              >
                <iframe
                  src={mapUrlState.safeUrl}
                  title={map.title || "Contact map"}
                  loading="lazy"
                  allowFullScreen
                  className={joinClasses(mapHeightClassMap[map.height ?? "md"], "w-full border-0")}
                  referrerPolicy="no-referrer-when-downgrade"
                  aria-labelledby={mapTitleId}
                />
              </div>
            ) : map.enabled ? (
              <p
                className="rounded-md border border-dashed px-3 py-2 text-xs text-[var(--color-text)]/65"
                role="status"
                style={bodyTextStyle}
              >
                {map.fallbackCopy || "Map is unavailable."}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export const getContactDiagnosticsSnapshot = (value: ContactData) =>
  JSON.stringify(redactContactDiagnostics(value), null, 2);

export function createContactWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ContactData>>;
  visual: ComponentType<WidgetEditorProps<ContactData>>;
  advanced: ComponentType<WidgetEditorProps<ContactData>>;
}): WidgetDefinition<ContactData> {
  return {
    type: "contact",
    title: "Contact",
    description: "Contact form and details.",
    category: "forms",
    variants: [
      {
        id: "form-left",
        label: "Form Left",
        description: variantDescriptionMap["form-left"],
      },
      {
        id: "form-right",
        label: "Form Right",
        description: variantDescriptionMap["form-right"],
      },
      {
        id: "minimal",
        label: "Minimal",
        description: variantDescriptionMap.minimal,
      },
    ],
    schema: contactSchema,
    defaults: contactDefaults,
    editor: editors,
    editorContract: contactEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: ContactBlock,
  };
}
