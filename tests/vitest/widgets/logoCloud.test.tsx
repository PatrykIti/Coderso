import React from "react";
import type { ComponentType } from "react";
import { expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import {
  LogoCloudAdvancedEditor,
  LogoCloudVisualEditor,
  LogoCloudWizardEditor,
} from "../../../core/admin/ui/widgets/editors/LogoCloudEditors";
import {
  createLogoCloudWidget,
  logoCloudDefaults,
  logoCloudLogoMax,
  LogoCloudBlock,
  normalizeLogoCloudData,
  normalizeLogoCloudLogoCount,
  normalizeLogoCloudLogos,
  type LogoCloudData,
} from "../../../core/widgets/core/logoCloud";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<LogoCloudData>> = () => null;

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ value }: { value: unknown }) => (
    <div data-media-picker="true">{typeof value === "string" ? value : "none"}</div>
  ),
}));

test("logo cloud renders defaults", () => {
  const html = renderToString(<LogoCloudBlock data={logoCloudDefaults} variant="grid" />);

  expect(html).toContain(logoCloudDefaults.header?.title ?? "");
  expect(html).toContain('data-logo-cloud-variant="grid"');
  expect(html).toContain('data-logo-cloud-count="6"');
  expect(html).toContain("<h2");
  expect(html).toContain("aria-labelledby=");
});

test("logo cloud normalization keeps deterministic ids and bounds", () => {
  const logos = normalizeLogoCloudLogos(
    [
      { id: "same", name: "One", href: "#" },
      { id: "same", name: "", href: "#" },
    ],
    2
  );

  expect(logos).toHaveLength(2);
  expect(logos[0]?.id).toBe("same");
  expect(logos[1]?.id).toBe("logo-2");
  expect(logos[1]?.name).toBeTruthy();
  expect(normalizeLogoCloudLogoCount(999)).toBe(logoCloudLogoMax);
  expect(normalizeLogoCloudLogoCount(0)).toBe(1);

  const normalized = normalizeLogoCloudData({ logos: [] });
  expect(normalized.logos).toHaveLength(6);
  expect(normalized.header?.eyebrow).toBe("");
  expect(normalized.style?.logoHeight).toBe("md");
  expect(normalized.style?.sectionBackground).toBeUndefined();
  expect(normalized.style?.headerAlign).toBe("center");
  expect(normalized.style?.headerSize).toBe("md");
  expect(normalized.style?.rowMode).toBe("wrap");
  expect(normalized.style?.motionMode).toBe("static");
  expect(normalized.style?.tileRadius).toBe("lg");
  expect(normalized.style?.tileBorderWidth).toBe("sm");
  expect(normalized.style?.openLinksInNewTab).toBe(false);
  expect(normalized.cta?.enabled).toBe(false);
  expect(normalized.cta?.target).toBe("same-tab");
});

test("logo cloud cleared section and tile styles omit forced inline surfaces", () => {
  const html = renderToString(
    <LogoCloudBlock
      data={normalizeLogoCloudData({
        ...logoCloudDefaults,
        style: {
          sectionBackground: "",
          logoHeight: "md",
          grayscale: true,
          hoverColor: true,
          gap: "md",
          alignment: "center",
        },
      })}
      variant="grid"
    />
  );

  expect(html).not.toContain('style="background-color:');
  expect(html).not.toContain("bg-[var(--color-bg)]");
  expect(html).not.toContain("background-color:transparent");
});

test("logo cloud keeps fallback section label and bounds none logo height safely", () => {
  const html = renderToString(
    <LogoCloudBlock
      data={normalizeLogoCloudData({
        header: {
          title: "",
          description: "",
        },
        logos: [
          {
            id: "logo-a",
            name: "Acme",
            image: "https://cdn.example.com/acme-tall.svg",
            href: "#",
          },
        ],
        style: {
          ...logoCloudDefaults.style,
          logoHeight: "none",
        },
      })}
      variant="grid"
    />
  );

  expect(html).toContain('aria-label="Partner logos"');
  expect(html).toContain('data-logo-cloud-height="none"');
  expect(html).toContain("max-h-16");
  expect(html).not.toContain("<h3");
});

test("logo cloud renders eyebrow, section background, and header typography controls", () => {
  const html = renderToString(
    <LogoCloudBlock
      data={normalizeLogoCloudData({
        header: {
          eyebrow: "Our partners",
          title: "Trusted by product teams",
          description: "Reference logos for launch credibility.",
        },
        logos: logoCloudDefaults.logos.map((logo, index) =>
          index === 0
            ? {
                ...logo,
                alt: "Acme partner logo",
                image: "https://cdn.example.com/acme.svg",
              }
            : logo
        ),
        style: {
          ...logoCloudDefaults.style,
          sectionBackground: "#f8fafc",
          headerAlign: "start",
          headerSize: "lg",
        },
      })}
      variant="grid"
    />
  );

  expect(html).toContain("Our partners");
  expect(html).toContain('style="background-color:#f8fafc"');
  expect(html).toContain('data-logo-cloud-header-align="start"');
  expect(html).toContain('data-logo-cloud-header-size="lg"');
  expect(html).toContain('alt="Acme partner logo"');
  expect(html).toContain("text-left");
  expect(html).toContain("text-3xl");
});

test("logo cloud falls back to logo name when image alt text is not provided", () => {
  const html = renderToString(
    <LogoCloudBlock
      data={normalizeLogoCloudData({
        logos: [
          {
            id: "logo-a",
            name: "Acme legacy",
            image: "https://cdn.example.com/acme.svg",
            href: "#",
          },
        ],
      })}
      variant="grid"
    />
  );

  expect(html).toContain('alt="Acme legacy"');
  expect(html).not.toContain('alt="undefined"');
});

test("logo cloud renders strip single-row and marquee layout markers", () => {
  const html = renderToString(
    <LogoCloudBlock
      data={normalizeLogoCloudData({
        logos: [
          { id: "logo-a", name: "Acme", image: "https://cdn.example.com/acme.svg", href: "#" },
          {
            id: "logo-b",
            name: "North Labs",
            image: "https://cdn.example.com/north.svg",
            href: "#",
          },
        ],
        style: {
          ...logoCloudDefaults.style,
          rowMode: "single-row",
          motionMode: "marquee",
        },
      })}
      variant="strip"
    />
  );

  expect(html).toContain('data-logo-cloud-row-mode="single-row"');
  expect(html).toContain('data-logo-cloud-motion="marquee"');
  expect(html).toContain("logo-cloud-marquee-track");
});

test("logo cloud dense layout keeps six columns for xl while easing smaller breakpoints", () => {
  const html = renderToString(
    <LogoCloudBlock
      data={normalizeLogoCloudData({
        logos: logoCloudDefaults.logos,
        style: {
          ...logoCloudDefaults.style,
          rowMode: "single-row",
          motionMode: "marquee",
        },
      })}
      variant="dense"
    />
  );

  expect(html).toContain('data-logo-cloud-row-mode="wrap"');
  expect(html).toContain('data-logo-cloud-motion="static"');
  expect(html).toContain("md:grid-cols-4");
  expect(html).toContain("xl:grid-cols-6");
});

test("logo cloud renders bounded tile markers plus safe CTA and new-tab link behavior", () => {
  const html = renderToString(
    <LogoCloudBlock
      data={normalizeLogoCloudData({
        cta: {
          enabled: true,
          label: "Talk to sales",
          href: "https://example.com/contact",
          target: "new-tab",
        },
        logos: [
          {
            id: "logo-a",
            name: "Acme",
            image: "https://cdn.example.com/acme.svg",
            href: "/partners/acme",
          },
        ],
        style: {
          ...logoCloudDefaults.style,
          tileRadius: "full",
          tileBorderWidth: "md",
          openLinksInNewTab: true,
        },
      })}
      variant="grid"
    />
  );

  expect(html).toContain('data-logo-cloud-tile-radius="full"');
  expect(html).toContain('data-logo-cloud-tile-border-width="md"');
  expect(html).toContain('data-logo-cloud-open-in-new-tab="true"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('data-logo-cloud-cta="true"');
  expect(html).toContain("Talk to sales");
  expect(html).toContain("rounded-full");
  expect(html).toContain("border-2");
});

test("logo cloud omits unsafe or incomplete CTA links", () => {
  const html = renderToString(
    <LogoCloudBlock
      data={normalizeLogoCloudData({
        cta: {
          enabled: true,
          label: "Unsafe CTA",
          href: "javascript:alert(1)",
          target: "new-tab",
        },
        logos: logoCloudDefaults.logos,
      })}
      variant="grid"
    />
  );

  expect(html).not.toContain('data-logo-cloud-cta="true"');
  expect(html).not.toContain("Unsafe CTA");
});

test("logo cloud validator accepts expanded model", () => {
  clearWidgets();
  const widget = createLogoCloudWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "logo-cloud-1",
      type: "logo-cloud",
      variant: "dense",
      data: {
        header: {
          eyebrow: "Partners",
          title: "Trusted by partners",
          description: "Build confidence with recognisable logos.",
        },
        cta: {
          enabled: true,
          label: "Talk to sales",
          href: "/sales",
          target: "new-tab",
        },
        logos: [
          {
            id: "logo-a",
            name: "Acme",
            alt: "Acme partner logo",
            image: "https://cdn.example.com/acme.svg",
            href: "https://acme.example.com",
          },
          {
            id: "logo-b",
            name: "North Labs",
            image: "https://cdn.example.com/north.svg",
            href: "https://north.example.com",
          },
        ],
        style: {
          logoHeight: "lg",
          grayscale: true,
          hoverColor: true,
          gap: "lg",
          alignment: "center",
          sectionBackground: "#f8fafc",
          headerAlign: "start",
          headerSize: "lg",
          rowMode: "single-row",
          motionMode: "marquee",
          tileRadius: "xl",
          tileBorderWidth: "md",
          openLinksInNewTab: true,
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("logo cloud validator rejects unknown nested keys", () => {
  clearWidgets();
  registerWidget(
    createLogoCloudWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "logo-cloud-invalid-header",
      type: "logo-cloud",
      variant: "grid",
      data: {
        ...logoCloudDefaults,
        header: {
          ...logoCloudDefaults.header,
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "logo-cloud-invalid-logo",
      type: "logo-cloud",
      variant: "grid",
      data: {
        ...logoCloudDefaults,
        cta: {
          enabled: true,
          label: "Talk to sales",
          href: "/sales",
          target: "same-tab",
          extra: "nope",
        },
        logos: [
          {
            id: "logo-a",
            name: "Acme",
            image: "https://cdn.example.com/acme.svg",
            extra: "nope",
          },
        ],
        style: {
          ...logoCloudDefaults.style,
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});

test("logo cloud validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createLogoCloudWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "logo-cloud-2",
      type: "logo-cloud",
      variant: "unknown",
      data: logoCloudDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("logo cloud wizard renders onboarding fields", () => {
  const html = renderToString(
    <LogoCloudWizardEditor
      value={logoCloudDefaults}
      onChange={() => undefined}
      variant="grid"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Logo cloud layout");
  expect(html).toContain("Section title");
  expect(html).toContain("Starter logos");
  expect(html).toContain("Image URL");
  expect(html).toContain("Alt text");
  expect(html).toContain("Media library");
});

test("logo cloud visual renders section-based IA", () => {
  const html = renderToString(
    <LogoCloudVisualEditor
      value={logoCloudDefaults}
      onChange={() => undefined}
      variant="grid"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Logos list and links");
  expect(html).toContain("Section CTA");
  expect(html).toContain("Display style");
  expect(html).toContain("Strip row behavior");
  expect(html).toContain("Strip motion");
  expect(html).toContain("Open logo links in new tab");
});

test("logo cloud advanced keeps technical-only scope", () => {
  const html = renderToString(
    <LogoCloudAdvancedEditor
      value={logoCloudDefaults}
      onChange={() => undefined}
      variant="strip"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Technical layout diagnostics");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).toContain("Logo height");
  expect(html).toContain("Alignment");
  expect(html).not.toContain("Logos list and links");
});
