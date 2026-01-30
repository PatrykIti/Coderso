import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type ContactData = {
  form?: {
    fields: string[];
    submitLabel: string;
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
};

export const contactSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    form: {
      type: "object",
      additionalProperties: false,
      required: ["fields", "submitLabel"],
      properties: {
        fields: { type: "array", items: { type: "string" }, minItems: 1 },
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
  },
};

export const contactDefaults: ContactData = {
  form: { fields: ["name", "email", "message"], submitLabel: "Send message" },
  contact: {
    phone: "+1 555 123 456",
    email: "hello@example.com",
    address: "123 Market Street",
    hours: "Mon-Fri 9-5",
  },
  map: { enabled: false, embedUrl: "" },
};

export function ContactBlock({
  data,
}: {
  data: ContactData;
  variant: string;
}) {
  return (
    <section className="grid gap-6 px-4 py-8 md:grid-cols-2">
      <form className="space-y-3">
        {(data.form?.fields ?? []).map((field) => (
          <input
            key={field}
            className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
            placeholder={field}
          />
        ))}
        <button className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)]">
          {data.form?.submitLabel}
        </button>
      </form>
      <div className="space-y-2 text-sm text-[var(--color-text)]/70">
        {data.contact?.phone ? <p>Phone: {data.contact.phone}</p> : null}
        {data.contact?.email ? <p>Email: {data.contact.email}</p> : null}
        {data.contact?.address ? <p>Address: {data.contact.address}</p> : null}
        {data.contact?.hours ? <p>Hours: {data.contact.hours}</p> : null}
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
      { id: "form-left", label: "Form Left" },
      { id: "form-right", label: "Form Right" },
      { id: "minimal", label: "Minimal" },
    ],
    schema: contactSchema,
    defaults: contactDefaults,
    editor: editors,
    render: ContactBlock,
  };
}
