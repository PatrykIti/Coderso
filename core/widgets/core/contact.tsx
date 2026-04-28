import type { CSSProperties, ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

export const contactFieldOptions = ["name", "email", "phone", "message"] as const;

export type ContactFieldId = (typeof contactFieldOptions)[number];
export type ContactVariantId = "form-left" | "form-right" | "minimal";
export type ContactSpacing = "sm" | "md" | "lg" | "xl";
export type ContactColumns = "one" | "two";
export type ContactBorderWidth = "0" | "1" | "2" | "3";

export type ContactData = {
  form?: {
    fields?: ContactFieldId[];
    required?: ContactFieldId[];
    submitLabel?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
  };
  map?: {
    enabled?: boolean;
    embedUrl?: string;
  };
  style?: {
    spacing?: ContactSpacing;
    background?: string;
    columns?: ContactColumns;
    surfaceColor?: string;
    borderColor?: string;
    borderWidth?: ContactBorderWidth;
  };
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

const spacingClassMap: Record<ContactSpacing, string> = {
  sm: "gap-4 py-6",
  md: "gap-6 py-8",
  lg: "gap-8 py-10",
  xl: "gap-10 py-12",
};

const variantDescriptionMap: Record<ContactVariantId, string> = {
  "form-left": "Form on the left and contact details on the right.",
  "form-right": "Contact details on the left and form on the right.",
  minimal: "Contact details focus with optional map embed.",
};

const fieldOptionSet = new Set<string>(contactFieldOptions);

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveNonEmptyString = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  return value.trim().length > 0 ? value : fallback;
};

const resolveContactSpacing = (value: string | undefined): ContactSpacing => {
  if (value === "sm" || value === "lg" || value === "xl") return value;
  return "md";
};

const resolveContactColumns = (value: string | undefined): ContactColumns => {
  if (value === "one") return "one";
  return "two";
};

const resolveContactBorderWidth = (value: string | undefined): ContactBorderWidth => {
  if (value === "0" || value === "2" || value === "3") return value;
  return "1";
};

const normalizeFieldList = (
  value: unknown,
  fallback: ContactFieldId[]
): ContactFieldId[] => {
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

const resolveMapEmbedUrl = (value: string | undefined) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

export const contactSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    form: {
      type: "object",
      additionalProperties: false,
      properties: {
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
      },
    },
    contact: {
      type: "object",
      additionalProperties: false,
      properties: {
        phone: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
        hours: { type: "string" },
      },
    },
    map: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        embedUrl: { type: "string" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        spacing: { enum: ["sm", "md", "lg", "xl"] },
        background: { type: "string" },
        columns: { enum: ["one", "two"] },
        surfaceColor: { type: "string" },
        borderColor: { type: "string" },
        borderWidth: { enum: ["0", "1", "2", "3"] },
      },
    },
  },
};

export const contactDefaults: ContactData = {
  form: {
    fields: ["name", "email", "message"],
    required: ["email", "message"],
    submitLabel: "Send message",
  },
  contact: {
    phone: "+1 555 123 456",
    email: "hello@example.com",
    address: "123 Market Street",
    hours: "Mon-Fri 9-5",
  },
  map: { enabled: false, embedUrl: "" },
  style: {
    spacing: "md",
    background: "transparent",
    columns: "two",
    surfaceColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    borderWidth: "1",
  },
};

export const resolveContactVariant = (variant: string): ContactVariantId => {
  if (variant === "form-right" || variant === "minimal") return variant;
  return "form-left";
};

export function normalizeContactData(data: ContactData): ContactData {
  const formDefaults = contactDefaults.form ?? {
    fields: ["name", "email", "message"],
    required: ["email", "message"],
    submitLabel: "Send message",
  };
  const contactDefaultsSection = contactDefaults.contact ?? {};
  const mapDefaults = contactDefaults.map ?? { enabled: false, embedUrl: "" };
  const styleDefaults = contactDefaults.style ?? {
    spacing: "md",
    background: "transparent",
    columns: "two",
    surfaceColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    borderWidth: "1",
  };

  const fields = normalizeFieldList(data.form?.fields, formDefaults.fields ?? []);
  const requiredCandidates = normalizeFieldList(
    data.form?.required,
    formDefaults.required ?? []
  );
  const fieldSet = new Set<ContactFieldId>(fields);
  const required = requiredCandidates.filter((item) => fieldSet.has(item));

  return {
    ...data,
    form: {
      fields,
      required,
      submitLabel: resolveNonEmptyString(
        data.form?.submitLabel,
        formDefaults.submitLabel ?? "Send message"
      ),
    },
    contact: {
      phone: resolveString(data.contact?.phone, contactDefaultsSection.phone ?? ""),
      email: resolveString(data.contact?.email, contactDefaultsSection.email ?? ""),
      address: resolveString(data.contact?.address, contactDefaultsSection.address ?? ""),
      hours: resolveString(data.contact?.hours, contactDefaultsSection.hours ?? ""),
    },
    map: {
      enabled: data.map?.enabled ?? mapDefaults.enabled ?? false,
      embedUrl: resolveString(data.map?.embedUrl, mapDefaults.embedUrl ?? ""),
    },
    style: {
      spacing: resolveContactSpacing(data.style?.spacing),
      background: resolveString(
        data.style?.background,
        styleDefaults.background ?? "transparent"
      ),
      columns: resolveContactColumns(data.style?.columns),
      surfaceColor: resolveString(
        data.style?.surfaceColor,
        styleDefaults.surfaceColor ?? "var(--color-bg)"
      ),
      borderColor: resolveString(
        data.style?.borderColor,
        styleDefaults.borderColor ?? "var(--color-border)"
      ),
      borderWidth: resolveContactBorderWidth(data.style?.borderWidth),
    },
  };
}

export function ContactBlock({
  data,
  variant,
}: {
  data: ContactData;
  variant: string;
}) {
  const normalizedData = normalizeContactData(data);
  const resolvedVariant = resolveContactVariant(variant);

  const form = normalizedData.form ?? contactDefaults.form!;
  const contact = normalizedData.contact ?? contactDefaults.contact!;
  const map = normalizedData.map ?? contactDefaults.map!;
  const style = normalizedData.style ?? contactDefaults.style!;

  const requiredFields = new Set<ContactFieldId>(form.required ?? []);
  const mapEmbedUrl = resolveMapEmbedUrl(map.embedUrl);
  const showMap = Boolean(map.enabled) && mapEmbedUrl.length > 0;
  const showForm = resolvedVariant !== "minimal";

  const detailsOrderClass = resolvedVariant === "form-right" ? "md:order-1" : "md:order-2";
  const formOrderClass = resolvedVariant === "form-right" ? "md:order-2" : "md:order-1";
  const columnsClass =
    resolvedVariant === "minimal"
      ? "grid-cols-1"
      : style.columns === "one"
        ? "md:grid-cols-1"
        : "md:grid-cols-2";
  const sectionStyle: CSSProperties = {
    backgroundColor: style.background ?? "transparent",
  };
  const panelBorderWidth = style.borderWidth ?? "1";
  const panelStyle: CSSProperties = {
    backgroundColor: style.surfaceColor ?? "var(--color-bg)",
    borderColor: style.borderColor ?? "var(--color-border)",
    borderStyle: "solid",
    borderWidth: `${panelBorderWidth}px`,
  };

  return (
    <section
      className={joinClasses(
        "mx-auto grid w-full max-w-5xl px-4",
        spacingClassMap[style.spacing ?? "md"],
        columnsClass
      )}
      style={sectionStyle}
      data-contact-variant={resolvedVariant}
      data-contact-spacing={style.spacing}
      data-contact-columns={resolvedVariant === "minimal" ? "one" : style.columns}
      data-contact-map={String(showMap)}
      data-contact-border-width={panelBorderWidth}
    >
      {showForm ? (
        <form
          className={joinClasses(
            "space-y-3 rounded-xl p-4",
            formOrderClass
          )}
          style={panelStyle}
        >
          {form.fields?.map((field) =>
            field === "message" ? (
              <label key={field} className="space-y-1">
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {contactFieldLabelMap[field]}
                </span>
                <textarea
                  required={requiredFields.has(field)}
                  className="h-28 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  placeholder={contactFieldPlaceholderMap[field]}
                  data-contact-field={field}
                />
              </label>
            ) : (
              <label key={field} className="space-y-1">
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {contactFieldLabelMap[field]}
                </span>
                <input
                  type={contactFieldInputTypeMap[field]}
                  required={requiredFields.has(field)}
                  className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  placeholder={contactFieldPlaceholderMap[field]}
                  data-contact-field={field}
                />
              </label>
            )
          )}
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)]"
          >
            {form.submitLabel}
          </button>
        </form>
      ) : null}

      <div
        className={joinClasses(
          "space-y-3 rounded-xl p-4 text-sm text-[var(--color-text)]/75",
          detailsOrderClass
        )}
        style={panelStyle}
      >
        {contact.phone ? <p>Phone: {contact.phone}</p> : null}
        {contact.email ? <p>Email: {contact.email}</p> : null}
        {contact.address ? <p>Address: {contact.address}</p> : null}
        {contact.hours ? <p>Hours: {contact.hours}</p> : null}

        {showMap ? (
          <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
            <iframe
              src={mapEmbedUrl}
              title="Contact map"
              loading="lazy"
              className="h-56 w-full border-0"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

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
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: ContactBlock,
  };
}
