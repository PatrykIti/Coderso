import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type NewsletterData = {
  title?: string;
  description?: string;
  placeholder?: string;
  consent?: { enabled?: boolean; label?: string };
  submit?: { label: string; successMessage?: string };
  integration?: { actionUrl?: string };
};

export const newsletterSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    placeholder: { type: "string" },
    consent: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        label: { type: "string" },
      },
    },
    submit: {
      type: "object",
      additionalProperties: false,
      required: ["label"],
      properties: {
        label: { type: "string" },
        successMessage: { type: "string" },
      },
    },
    integration: {
      type: "object",
      additionalProperties: false,
      properties: {
        actionUrl: { type: "string" },
      },
    },
  },
};

export const newsletterDefaults: NewsletterData = {
  title: "Join our newsletter",
  description: "Get the latest updates straight to your inbox.",
  placeholder: "you@example.com",
  consent: { enabled: true, label: "I agree to receive updates." },
  submit: { label: "Subscribe", successMessage: "Thanks for joining!" },
  integration: { actionUrl: "" },
};

export function NewsletterBlock({
  data,
}: {
  data: NewsletterData;
  variant: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
      {data.title ? (
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          {data.title}
        </h3>
      ) : null}
      {data.description ? (
        <p className="text-sm text-[var(--color-text)]/70">{data.description}</p>
      ) : null}
      <form className="flex flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          placeholder={data.placeholder}
        />
        <button className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)]">
          {data.submit?.label}
        </button>
      </form>
      {data.consent?.enabled && data.consent.label ? (
        <label className="flex items-center gap-2 text-xs text-[var(--color-text)]/60">
          <input type="checkbox" /> {data.consent.label}
        </label>
      ) : null}
    </section>
  );
}

export function createNewsletterWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<NewsletterData>>;
  visual: ComponentType<WidgetEditorProps<NewsletterData>>;
  advanced: ComponentType<WidgetEditorProps<NewsletterData>>;
}): WidgetDefinition<NewsletterData> {
  return {
    type: "newsletter",
    title: "Newsletter",
    description: "Email signup form.",
    category: "forms",
    variants: [
      { id: "inline", label: "Inline" },
      { id: "stacked", label: "Stacked" },
      { id: "minimal", label: "Minimal" },
    ],
    schema: newsletterSchema,
    defaults: newsletterDefaults,
    editor: editors,
    render: NewsletterBlock,
  };
}
