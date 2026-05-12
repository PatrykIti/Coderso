import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  PricingPlansAdvancedEditor,
  PricingPlansVisualEditor,
  PricingPlansWizardEditor,
} from "../../../core/admin/ui/widgets/editors/PricingPlansEditors";
import {
  createPricingPlansWidget,
  normalizePricingPlanCount,
  normalizePricingPlans,
  normalizePricingPlansData,
  pricingPlansDefaults,
  PricingPlansBlock,
  type PricingPlansData,
} from "../../../core/widgets/core/pricingPlans";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<PricingPlansData>> = () => null;

test("pricing plans renders defaults", () => {
  const html = renderToString(
    <PricingPlansBlock data={pricingPlansDefaults} variant="three-plans" />
  );

  expect(html).toContain(pricingPlansDefaults.header?.title ?? "");
  expect(html).toContain('data-pricing-variant="three-plans"');
  expect(html).toContain('data-pricing-count="3"');
});

test("pricing plans comparison rows render deterministic table markers", () => {
  const html = renderToString(
    <PricingPlansBlock
      data={{
        ...pricingPlansDefaults,
        plans: [
          {
            id: "p1",
            name: "Starter",
            price: "$19",
            period: "/month",
            features: ["Email support", "Basic analytics"],
            ctaLabel: "Start",
            ctaHref: "#",
          },
          {
            id: "p2",
            name: "Growth",
            price: "$49",
            period: "/month",
            features: ["Email support", "Advanced analytics"],
            highlighted: true,
            ctaLabel: "Upgrade",
            ctaHref: "#",
          },
          {
            id: "p3",
            name: "Scale",
            price: "$99",
            period: "/month",
            features: ["SLA", "Advanced analytics"],
            ctaLabel: "Contact",
            ctaHref: "#",
          },
        ],
      }}
      variant="comparison-rows"
    />
  );

  expect(html).toContain('data-pricing-variant="comparison-rows"');
  expect(html).toContain('data-pricing-comparison="true"');
  expect(html).toContain('data-pricing-feature-row="1"');
  expect(html).toContain("Advanced analytics");
});

test("pricing plans normalization keeps deterministic ids and count bounds", () => {
  const plans = normalizePricingPlans(
    [
      {
        id: "same",
        name: "",
        price: "",
        features: [" Feature A ", "", "Feature B"],
      },
      {
        id: "same",
        name: "Growth",
        price: "$49",
        features: ["Feature B", "Feature C"],
      },
    ],
    2
  );

  expect(plans).toHaveLength(2);
  expect(plans[0]?.id).toBe("same");
  expect(plans[1]?.id).toBe("plan-2");
  expect(plans[0]?.name).toBeTruthy();
  expect(plans[0]?.price).toBeTruthy();
  expect(plans[0]?.features).toEqual(["Feature A", "Feature B"]);
  expect(normalizePricingPlanCount(99)).toBe(6);
  expect(normalizePricingPlanCount(0)).toBe(2);

  const normalized = normalizePricingPlansData({ plans: [] });
  expect(normalized.plans).toHaveLength(3);
  expect(normalized.billingToggle).toEqual({
    enabled: false,
    monthlyLabel: "Monthly",
    annualLabel: "Annual",
    defaultCycle: "monthly",
  });
  expect(normalized.style?.spacing).toBe("md");
  expect(normalized.style?.featureMarker).toBe("bullet");
});

test("pricing plans validator accepts expanded model", () => {
  clearWidgets();
  const widget = createPricingPlansWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "pricing-1",
      type: "pricing-plans",
      variant: "four-plans",
      data: {
        header: {
          title: "Plans",
          description: "Compare offers",
        },
        billingToggle: {
          enabled: true,
          monthlyLabel: "Monthly",
          annualLabel: "Yearly",
          defaultCycle: "annual",
        },
        plans: [
          {
            id: "starter",
            name: "Starter",
            price: "$19",
            period: "/month",
            badge: "New",
            prices: {
              monthly: "$19",
              annual: "$190",
            },
            features: ["Email support", "Basic analytics"],
            ctaLabel: "Start",
            ctaHref: "/start",
            highlighted: false,
          },
          {
            id: "growth",
            name: "Growth",
            price: "$49",
            period: "/month",
            badge: "Most popular",
            features: ["Priority support", "Advanced analytics"],
            ctaLabel: "Choose",
            ctaHref: "/choose",
            highlighted: true,
          },
          {
            id: "scale",
            name: "Scale",
            price: "$99",
            period: "/month",
            features: ["SLA", "Audit logs"],
            ctaLabel: "Contact",
            ctaHref: "/contact",
            highlighted: false,
          },
          {
            id: "enterprise",
            name: "Enterprise",
            price: "Custom",
            period: "",
            features: ["Dedicated support"],
            ctaLabel: "Talk to sales",
            ctaHref: "/sales",
            highlighted: false,
          },
        ],
        style: {
          cardSurface: "#ffffff",
          cardBorder: "#cbd5e1",
          highlightRing: "#1d4ed8",
          spacing: "lg",
          radius: "xl",
          featureMarker: "check",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("pricing plans cleared card surfaces omit card and table backgrounds", () => {
  const normalized = normalizePricingPlansData({
    ...pricingPlansDefaults,
    style: {},
  });
  const cardHtml = renderToString(<PricingPlansBlock data={normalized} variant="three-plans" />);
  const tableHtml = renderToString(
    <PricingPlansBlock data={normalized} variant="comparison-rows" />
  );

  expect(normalized.style?.cardSurface).toBeUndefined();
  expect(normalized.style?.cardBorder).toBeUndefined();
  expect(cardHtml).not.toContain("background-color:var(--color-bg)");
  expect(tableHtml).not.toContain("background-color:var(--color-bg)");
});

test("pricing plans render annual cycle and feature marker when billing toggle is enabled", () => {
  const html = renderToString(
    <PricingPlansBlock
      data={{
        ...pricingPlansDefaults,
        billingToggle: {
          enabled: true,
          monthlyLabel: "Monthly",
          annualLabel: "Yearly",
          defaultCycle: "annual",
        },
        plans: [
          {
            id: "starter",
            name: "Starter",
            price: "$19",
            period: "/month",
            prices: { monthly: "$19", annual: "$190" },
            features: ["Email support"],
          },
          {
            id: "growth",
            name: "Growth",
            price: "$49",
            period: "/month",
            prices: { monthly: "$49", annual: "$490" },
            features: ["Priority support"],
            highlighted: true,
          },
        ],
        style: {
          ...pricingPlansDefaults.style,
          featureMarker: "check",
        },
      }}
      variant="three-plans"
    />
  );

  expect(html).toContain('data-pricing-billing-toggle="1"');
  expect(html).toContain('data-pricing-cycle="annual"');
  expect(html).toContain("Yearly");
  expect(html).toContain("$190");
  expect(html).toContain("✓");
});

test("pricing plans strip unsafe CTA hrefs from normalized plans", () => {
  const normalized = normalizePricingPlansData({
    ...pricingPlansDefaults,
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "$19",
        ctaLabel: "Start",
        ctaHref: "/start",
      },
      {
        id: "growth",
        name: "Growth",
        price: "$49",
        ctaLabel: "Break",
        ctaHref: "javascript:alert(1)",
      },
    ],
  });

  expect(normalized.plans[0]?.ctaHref).toBe("/start");
  expect(normalized.plans[1]?.ctaHref).toBeUndefined();

  const html = renderToString(<PricingPlansBlock data={normalized} variant="three-plans" />);
  expect(html).toContain('href="/start"');
  expect(html).not.toContain("javascript:alert");
});

test("pricing plans validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createPricingPlansWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "pricing-2",
      type: "pricing-plans",
      variant: "unknown",
      data: pricingPlansDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("pricing plans wizard renders onboarding fields", () => {
  const html = renderToString(
    <PricingPlansWizardEditor
      value={pricingPlansDefaults}
      onChange={() => undefined}
      variant="three-plans"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Pricing layout");
  expect(html).toContain("Section title");
  expect(html).toContain("Plans count");
  expect(html).toContain("Basic plan setup");
});

test("pricing plans visual renders section-based IA", () => {
  const html = renderToString(
    <PricingPlansVisualEditor
      value={pricingPlansDefaults}
      onChange={() => undefined}
      variant="three-plans"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and plan structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Plans, features, and actions");
  expect(html).toContain("Colors and emphasis");
});

test("pricing plans advanced keeps technical-only scope", () => {
  const html = renderToString(
    <PricingPlansAdvancedEditor
      value={pricingPlansDefaults}
      onChange={() => undefined}
      variant="comparison-rows"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Display tokens");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Plans, features, and actions");
});
