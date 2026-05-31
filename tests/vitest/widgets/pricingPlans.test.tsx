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
  describePricingPlanCapacity,
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
  expect(html).toContain('data-pricing-hidden-count="0"');
  expect(html).toContain('role="region"');
  expect(html).toContain('aria-labelledby="pricing-plans-three-plans-title"');
  expect(html).toContain('data-pricing-badge-tone="highlight"');
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
  expect(html).toContain('data-overflow-intentional="true"');
  expect(html).toContain('data-overflow-affordance="horizontal-scroll"');
  expect(html).toContain("Scroll horizontally to compare all plans.");
  expect(html).toContain('tabindex="0"');
  expect(html).toContain('data-pricing-feature-row="1"');
  expect(html).toContain("Advanced analytics");
  expect(html).toContain("<caption");
  expect(html).toContain('scope="col"');
  expect(html).toContain('scope="row"');
  expect(html).toContain('aria-label="Upgrade for Growth"');
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
  expect(plans[0]?.features).toEqual([
    { text: "Feature A", status: "included" },
    { text: "Feature B", status: "included" },
  ]);
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

  const invalidTokens = normalizePricingPlansData({
    plans: [{}, {}] as never,
    style: { spacing: "bogus" as never, radius: "bogus" as never },
  });
  expect(invalidTokens.style?.spacing).toBe("md");
  expect(invalidTokens.style?.radius).toBe("lg");
});

test("pricing plans preserve hidden authored plans for fixed-count variants", () => {
  const html = renderToString(
    <PricingPlansBlock
      data={{
        ...pricingPlansDefaults,
        plans: [
          ...pricingPlansDefaults.plans,
          {
            id: "enterprise",
            name: "Enterprise",
            price: "$199",
            period: "/month",
            features: ["Dedicated support"],
            ctaLabel: "Talk to sales",
            ctaHref: "#",
          },
        ],
      }}
      variant="three-plans"
    />
  );

  expect(html).toContain('data-pricing-count="3"');
  expect(html).toContain('data-pricing-hidden-count="1"');
  expect(html).not.toContain("Enterprise");
});

test("pricing plans distinguish layout capacity from rendered saved plans", () => {
  const summary = describePricingPlanCapacity("four-plans", pricingPlansDefaults.plans);
  const html = renderToString(
    <PricingPlansBlock data={pricingPlansDefaults} variant="four-plans" />
  );

  expect(summary).toEqual({
    capacity: 4,
    rendered: 3,
    missing: 1,
    authored: 3,
    hidden: 0,
  });
  expect(html).toContain('data-pricing-variant="four-plans"');
  expect(html).toContain('data-pricing-count="3"');
  expect(html).not.toContain('data-pricing-count="4"');
});

test("pricing plans render plan hierarchy, structured pricing, and footer notes", () => {
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
        layout: {
          maxWidth: "wide",
          typography: "prominent",
          footerNote: "All prices exclude VAT.",
        },
        plans: [
          {
            id: "starter",
            name: "Starter",
            description: "For small teams getting started",
            badge: "For individuals",
            badgeTone: "accent",
            price: "$19",
            period: "/month",
            ctaLabel: "Start now",
            ctaHref: "/start",
            ctaStyle: "outline",
            features: [
              { text: "Email support", status: "included", icon: "check" },
              { text: "Priority onboarding", status: "premium", icon: "sparkle" },
            ],
          },
          {
            id: "growth",
            name: "Growth",
            description: "Best for growing teams",
            badge: "Most popular",
            highlightLabel: "Popular choice",
            price: "$49",
            period: "/month",
            priceDisplay: {
              mode: "structured",
              amount: 49,
              annualAmount: 490,
              currency: "USD",
              annualSavingsLabel: "2 months free",
            },
            ctaLabel: "Choose growth",
            ctaHref: "/growth",
            ctaStyle: "filled",
            surface: "#0f172a",
            highlighted: true,
            features: [
              { text: "Advanced analytics", status: "included", icon: "check" },
              { text: "Dedicated roadmap access", status: "coming-soon", icon: "clock" },
            ],
          },
        ],
      }}
      variant="two-plans"
    />
  );

  expect(html).toContain('data-pricing-variant="two-plans"');
  expect(html).toContain('data-pricing-max-width="wide"');
  expect(html).toContain('data-pricing-typography="prominent"');
  expect(html).toContain('data-pricing-highlight-label="Popular choice"');
  expect(html).toContain('data-pricing-plan-cta-style="filled"');
  expect(html).toContain("For small teams getting started");
  expect(html).toContain("$490");
  expect(html).toContain("2 months free");
  expect(html).toContain("All prices exclude VAT.");
  expect(html).toContain("Premium");
});

test("pricing plans comparison rows render sticky header and header CTA hierarchy", () => {
  const html = renderToString(
    <PricingPlansBlock
      data={{
        ...pricingPlansDefaults,
        comparison: {
          stickyHeader: true,
          showHeaderBadges: true,
          showHeaderCta: true,
        },
        plans: [
          {
            id: "starter",
            name: "Starter",
            badge: "For individuals",
            price: "$19",
            period: "/month",
            ctaLabel: "Start",
            ctaHref: "/start",
            ctaStyle: "ghost",
            features: [{ text: "Email support", status: "included", icon: "check" }],
          },
          {
            id: "growth",
            name: "Growth",
            badge: "Most popular",
            highlightLabel: "Top pick",
            price: "$49",
            period: "/month",
            ctaLabel: "Upgrade",
            ctaHref: "/upgrade",
            highlighted: true,
            features: [{ text: "Email support", status: "premium", icon: "sparkle" }],
          },
          {
            id: "scale",
            name: "Scale",
            price: "$99",
            period: "/month",
            ctaLabel: "Contact",
            ctaHref: "/contact",
            features: [{ text: "SLA", status: "coming-soon", icon: "clock" }],
          },
        ],
      }}
      variant="comparison-rows"
    />
  );

  expect(html).toContain('data-pricing-comparison-sticky="true"');
  expect(html).toContain('data-pricing-comparison-highlighted="true"');
  expect(html).toContain("Top pick");
  expect(html).toContain('aria-label="Upgrade for Growth"');
  expect(html).toContain("For individuals");
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
      variant: "two-plans",
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
        comparison: {
          stickyHeader: true,
          showHeaderBadges: true,
          showHeaderCta: true,
        },
        layout: {
          maxWidth: "wide",
          typography: "prominent",
          footerNote: "Contact us for enterprise pricing.",
        },
        plans: [
          {
            id: "starter",
            name: "Starter",
            description: "For small teams",
            price: "$19",
            period: "/month",
            badge: "New",
            badgeTone: "accent",
            ctaStyle: "outline",
            highlightLabel: "Popular choice",
            surface: "#ffffff",
            prices: {
              monthly: "$19",
              annual: "$190",
            },
            features: [
              "Email support",
              { text: "Basic analytics", status: "premium", icon: "sparkle" },
            ],
            priceDisplay: {
              mode: "structured",
              amount: 19,
              annualAmount: 190,
              currency: "USD",
              annualSavingsLabel: "2 months free",
            },
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
            features: [{ text: "Priority support", status: "coming-soon", icon: "clock" }],
            ctaLabel: "Choose",
            ctaHref: "/choose",
            highlighted: true,
          },
        ],
        style: {
          cardSurface: "#ffffff",
          cardBorder: "#cbd5e1",
          highlightRing: "#1d4ed8",
          spacing: "lg",
          radius: "xl",
          featureMarker: "status",
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

  expect(html).toContain('data-pricing-billing-toggle="static"');
  expect(html).toContain('data-pricing-billing-display="static-cycle"');
  expect(html).toContain('data-pricing-cycle="annual"');
  expect(html).toContain('aria-label="Billing cycle: Yearly pricing shown"');
  expect(html).toContain("Billing cycle:");
  expect(html).toContain("Yearly");
  expect(html).toContain("$190");
  expect(html).toContain("/year");
  expect(html).toContain("✓");
  expect(html).toContain('role="status"');
  expect(html).not.toContain('data-state="active"');
  expect(html).not.toContain("Scale");
});

test("pricing plans clamp negative structured amounts to zero", () => {
  const normalized = normalizePricingPlansData({
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
        priceDisplay: {
          mode: "structured",
          amount: -19,
          annualAmount: -190,
          currency: "usd",
        },
      },
      pricingPlansDefaults.plans[1] ?? {},
    ],
  });

  expect(normalized.plans[0]?.priceDisplay).toMatchObject({
    mode: "structured",
    amount: 0,
    annualAmount: 0,
    currency: "USD",
  });

  const html = renderToString(<PricingPlansBlock data={normalized} variant="three-plans" />);
  expect(html).toContain("$0");
  expect(html).toContain("/year");
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
  expect(html).toContain("Layout plan count");
  expect(html).toContain("Daily editing happens in Visual");
  expect(html).toContain('data-widget-control-readonly="true"');
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
  expect(html).toContain("Billing toggle");
  expect(html).toContain("Plans, features, and actions");
  expect(html).toContain("Layout and notes");
  expect(html).toContain("Colors and emphasis");
  expect(html).toContain('data-widget-editor-section="pricing-plans.visual.variant-structure"');
  expect(html).toContain('data-widget-editor-section="pricing-plans.visual.header-copy"');
  expect(html).toContain('data-widget-editor-section="pricing.billing"');
  expect(html).toContain('data-widget-editor-section="pricing-plans.visual.plan-actions"');
  expect(html).toContain('data-widget-editor-section="pricing-plans.visual.layout-notes"');
  expect(html).toContain('data-widget-editor-section="pricing-plans.visual.colors-emphasis"');
  expect(html).toContain('data-widget-control-path="plans.0.surface"');
  expect(html).toContain('data-widget-control-path="style.cardSurface"');
  expect(html).toContain('data-widget-control-path="style.spacing"');
  expect(html).toContain('data-widget-control-path="style.radius"');
  expect(html).toContain('data-widget-control-path="style.featureMarker"');
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

  expect(html).toContain("Visual-owned tokens");
  expect(html).toContain("Fix and reset");
  expect(html).toContain("Runtime summary");
  expect(html).toContain('data-widget-editor-section="pricing-plans.advanced.visual-tokens"');
  expect(html).toContain('data-widget-editor-section="pricing-plans.advanced.fix-reset"');
  expect(html).toContain('data-widget-editor-section="pricing-plans.advanced.runtime-summary"');
  expect(html).not.toContain("Raw payload snapshot");
  expect(html).not.toContain("<pre");
  expect(html).not.toContain("Plans, features, and actions");
});
