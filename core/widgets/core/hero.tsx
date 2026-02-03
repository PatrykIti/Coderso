import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type HeroCta = {
  label: string;
  href: string;
};

export type HeroMedia = {
  type: "none" | "image" | "video";
  src?: string;
  alt?: string;
  ratio?: string;
  overlay?: string;
};

export type HeroData = {
  headline: string;
  subhead?: string;
  body?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  media?: HeroMedia;
  layout?: {
    align?: "left" | "center" | "right";
    maxWidth?: "sm" | "md" | "lg" | "xl";
  };
  style?: {
    paddingTop?: string;
    paddingBottom?: string;
  };
  responsive?: {
    hideMediaOnMobile?: boolean;
  };
};

export const heroSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline"],
  properties: {
    headline: { type: "string" },
    subhead: { type: "string" },
    body: { type: "string" },
    primaryCta: {
      type: "object",
      additionalProperties: false,
      required: ["label", "href"],
      properties: {
        label: { type: "string" },
        href: { type: "string" },
      },
    },
    secondaryCta: {
      type: "object",
      additionalProperties: false,
      required: ["label", "href"],
      properties: {
        label: { type: "string" },
        href: { type: "string" },
      },
    },
    media: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { enum: ["none", "image", "video"] },
        src: { type: "string" },
        alt: { type: "string" },
        ratio: { type: "string" },
        overlay: { type: "string" },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        align: { enum: ["left", "center", "right"] },
        maxWidth: { enum: ["sm", "md", "lg", "xl"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        paddingTop: { type: "string" },
        paddingBottom: { type: "string" },
      },
    },
    responsive: {
      type: "object",
      additionalProperties: false,
      properties: {
        hideMediaOnMobile: { type: "boolean" },
      },
    },
  },
};

export const heroDefaults: HeroData = {
  headline: "Build faster with Nextless",
  subhead: "Launch modern sites without rebuilding the app.",
  body: "",
  primaryCta: { label: "Get started", href: "#" },
  secondaryCta: { label: "Learn more", href: "#" },
  media: { type: "none" },
  layout: { align: "center", maxWidth: "xl" },
  style: { paddingTop: "xl", paddingBottom: "xl" },
  responsive: { hideMediaOnMobile: false },
};

export function HeroBlock({ data }: { data: HeroData; variant: string }) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-12 text-center">
      <h1 className="text-3xl font-semibold text-[var(--color-text)]">
        {data.headline}
      </h1>
      {data.subhead ? (
        <p className="text-lg text-[var(--color-text)]/70">{data.subhead}</p>
      ) : null}
      {data.body ? <p className="text-base text-[var(--color-text)]/70">{data.body}</p> : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {data.primaryCta ? (
          <a
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)]"
            href={data.primaryCta.href}
          >
            {data.primaryCta.label}
          </a>
        ) : null}
        {data.secondaryCta ? (
          <a
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
            href={data.secondaryCta.href}
          >
            {data.secondaryCta.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function createHeroWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<HeroData>>;
  visual: ComponentType<WidgetEditorProps<HeroData>>;
  advanced: ComponentType<WidgetEditorProps<HeroData>>;
}): WidgetDefinition<HeroData> {
  return {
    type: "hero",
    title: "Hero",
    description: "Top-of-page hero section with CTA.",
    category: "layout",
    canHaveChildren: true,
    variants: [
      { id: "centered", label: "Centered" },
      { id: "split", label: "Split" },
      { id: "media-left", label: "Media Left" },
    ],
    schema: heroSchema,
    defaults: heroDefaults,
    editor: editors,
    render: HeroBlock,
  };
}
