import type { ComponentType } from "react";
import { lazy } from "react";
import { afterEach, describe, expect, test } from "vitest";

import {
  assertRegisteredWidgetEditorContracts,
  clearWidgets,
  getWidget,
  getWidgetEditorContractDiagnostics,
  listWidgetEditorContractDiagnostics,
  registerWidget,
} from "../../../core/widgets/registry";
import {
  validateWidgetEditorContract,
  type WidgetEditorContractValidation,
} from "../../../core/widgets/editorContract";
import { createHeroWidget } from "../../../core/widgets/core/hero";
import { appointmentFormEditorContract } from "../../../core/widgets/core/appointmentForm";
import { bookingCalendarEditorContract } from "../../../core/widgets/core/bookingCalendar";
import { compareTimelineEditorContract } from "../../../core/widgets/core/compareTimeline";
import { contactEditorContract } from "../../../core/widgets/core/contact";
import { contentListEditorContract } from "../../../core/widgets/core/contentList";
import { ctaBannerEditorContract } from "../../../core/widgets/core/ctaBanner";
import { dividerEditorContract } from "../../../core/widgets/core/divider";
import { entryTeaserEditorContract } from "../../../core/widgets/core/entryTeaser";
import { faqAccordionEditorContract } from "../../../core/widgets/core/faqAccordion";
import { featureGridEditorContract } from "../../../core/widgets/core/featureGrid";
import { footerEditorContract } from "../../../core/widgets/core/footer";
import { galleryMosaicEditorContract } from "../../../core/widgets/core/galleryMosaic";
import { gridColumnsEditorContract } from "../../../core/widgets/core/gridColumns";
import { logoCloudEditorContract } from "../../../core/widgets/core/logoCloud";
import { navigationEditorContract } from "../../../core/widgets/core/navigation";
import { newsletterEditorContract } from "../../../core/widgets/core/newsletter";
import { pricingPlansEditorContract } from "../../../core/widgets/core/pricingPlans";
import { productCompareEditorContract } from "../../../core/widgets/core/productCompare";
import { productGalleryEditorContract } from "../../../core/widgets/core/productGallery";
import { productTableEditorContract } from "../../../core/widgets/core/productTable";
import { richTextSectionEditorContract } from "../../../core/widgets/core/richTextSection";
import { sectionEditorContract } from "../../../core/widgets/core/section";
import { spacerEditorContract } from "../../../core/widgets/core/spacer";
import { splitLayoutEditorContract } from "../../../core/widgets/core/splitLayout";
import { stackEditorContract } from "../../../core/widgets/core/stack";
import { teamEditorContract } from "../../../core/widgets/core/team";
import { testimonialsEditorContract } from "../../../core/widgets/core/testimonials";
import { timelineEditorContract } from "../../../core/widgets/core/timeline";
import { toggleBlockEditorContract } from "../../../core/widgets/core/toggleBlock";
import type {
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
} from "../../../core/widgets/types";

type WidgetData = Record<string, unknown>;

const NoopEditor: ComponentType<WidgetEditorProps<WidgetData>> = () => null;
const NoopRender: WidgetDefinition<WidgetData>["render"] = () => null;

function contract(sections: WidgetEditorContract["sections"]): WidgetEditorContract {
  return { version: 2, sections };
}

function unsafeContract(value: unknown): WidgetEditorContract {
  return value as WidgetEditorContract;
}

function validContract(): WidgetEditorContract {
  return contract([
    {
      mode: "wizard",
      id: "wiz-foundation",
      title: "Initial questions",
      role: "setup",
      writablePaths: ["content.intent"],
    },
    {
      mode: "visual",
      id: "vis-content",
      title: "Primary copy",
      role: "content",
      writablePaths: ["content.title"],
    },
    {
      mode: "advanced",
      id: "adv-technical",
      title: "Technical controls",
      role: "technical",
      writablePaths: ["behavior.anchorId"],
    },
  ]);
}

function widgetDefinition(
  type: string,
  editorContract?: WidgetEditorContract
): WidgetDefinition<WidgetData> {
  return {
    type,
    title: "Test widget",
    category: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object" },
    defaults: {},
    editor: {
      wizard: NoopEditor,
      visual: NoopEditor,
      advanced: NoopEditor,
    },
    ...(editorContract ? { editorContract } : {}),
    render: NoopRender,
  };
}

function lazyEditorBundle(): WidgetDefinition<WidgetData>["editor"] {
  const lazyNoop = lazy(async () => ({ default: NoopEditor }));
  return {
    wizard: lazyNoop,
    visual: lazyNoop,
    advanced: lazyNoop,
  };
}

function errorCodes(validation: WidgetEditorContractValidation): string[] {
  return validation.errors.map((error) => error.code);
}

afterEach(() => {
  clearWidgets();
});

describe("widget editor contract validation", () => {
  test("allows missing contracts in soft migration mode but rejects them in strict mode", () => {
    const soft = validateWidgetEditorContract({ type: "sample-widget" });
    const strict = validateWidgetEditorContract(
      { type: "sample-widget" },
      { requireContract: true }
    );

    expect(soft.valid).toBe(true);
    expect(strict.valid).toBe(false);
    expect(errorCodes(strict)).toContain("editor_contract_missing");
  });

  test("accepts a complete v2 contract with one owner per writable path", () => {
    const validation = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: validContract(),
    });

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  test("accepts repeatable wildcard path segments for editor contracts", () => {
    const validation = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: contract([
        {
          mode: "wizard",
          id: "wiz-foundation",
          title: "Initial questions",
          role: "setup",
          writablePaths: ["content.items.count"],
        },
        {
          mode: "visual",
          id: "vis-repeatable-items",
          title: "Repeatable items",
          role: "content",
          writablePaths: ["content.items.*.title", "content.items.*.summary"],
        },
        {
          mode: "advanced",
          id: "adv-repeatable-summary",
          title: "Repeatable summary",
          role: "summary",
          writablePaths: [],
          readOnlyPaths: ["content.items.*.title"],
        },
      ]),
    });

    expect(validation).toEqual(
      expect.objectContaining({
        valid: true,
        errors: [],
      })
    );
  });

  test("rejects unsafe wildcard path fragments", () => {
    const validation = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: contract([
        {
          mode: "wizard",
          id: "wiz-foundation",
          title: "Initial questions",
          role: "setup",
          writablePaths: ["content.items.count"],
        },
        {
          mode: "visual",
          id: "vis-repeatable-items",
          title: "Repeatable items",
          role: "content",
          writablePaths: ["content.it*ems.title"],
        },
        {
          mode: "advanced",
          id: "adv-repeatable-summary",
          title: "Repeatable summary",
          role: "summary",
          writablePaths: [],
        },
      ]),
    });

    expect(errorCodes(validation)).toContain("editor_contract_invalid_path");
  });

  test("requires wizard, visual, and advanced sections", () => {
    const validation = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: contract([
        {
          mode: "wizard",
          id: "wiz-start",
          title: "Guided setup",
          role: "setup",
          writablePaths: ["content.intent"],
        },
        {
          mode: "visual",
          id: "vis-copy",
          title: "Copy editing",
          role: "content",
          writablePaths: ["content.title"],
        },
      ]),
    });

    expect(validation.valid).toBe(false);
    expect(errorCodes(validation)).toContain("editor_contract_missing_mode");
    expect(validation.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ mode: "advanced" })])
    );
  });

  test("rejects unstable section metadata", () => {
    const validation = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: unsafeContract({
        version: 2,
        sections: [
          {
            mode: "wizard",
            id: "",
            title: "First step",
            role: "setup",
            writablePaths: ["content.intent"],
          },
          {
            mode: "visual",
            id: "visual-settings",
            title: "Visual Settings",
            role: "unknown",
            writablePaths: ["content.title"],
          },
          {
            mode: "visual",
            id: "visual-settings",
            title: "Copy controls",
            role: "content",
            writablePaths: ["content.subtitle"],
          },
          {
            mode: "advanced",
            id: "adv-controls",
            title: "",
            role: "technical",
            writablePaths: ["behavior.anchorId"],
          },
        ],
      }),
    });

    expect(errorCodes(validation)).toEqual(
      expect.arrayContaining([
        "editor_contract_empty_section_id",
        "editor_contract_title_derived_section_id",
        "editor_contract_unknown_role",
        "editor_contract_duplicate_section_id",
        "editor_contract_invalid_title",
      ])
    );
  });

  test("rejects unknown modes and roles", () => {
    const validation = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: unsafeContract({
        version: 2,
        sections: [
          {
            mode: "review",
            id: "review-step",
            title: "Review workflow",
            role: "approvals",
            writablePaths: ["content.title"],
          },
        ],
      }),
    });

    expect(errorCodes(validation)).toEqual(
      expect.arrayContaining(["editor_contract_unknown_mode", "editor_contract_unknown_role"])
    );
  });

  test("rejects unsafe writable and readonly paths", () => {
    const validation = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: unsafeContract({
        version: 2,
        sections: [
          {
            mode: "wizard",
            id: "wiz-safe",
            title: "Safe setup",
            role: "setup",
            writablePaths: ["content..title"],
            readOnlyPaths: "content.subtitle",
          },
          {
            mode: "visual",
            id: "vis-safe",
            title: "Safe visual",
            role: "content",
            writablePaths: ["content.__proto__"],
          },
          {
            mode: "advanced",
            id: "adv-safe",
            title: "Safe technical",
            role: "technical",
            writablePaths: ["behavior.anchorId"],
          },
        ],
      }),
    });

    expect(errorCodes(validation)).toEqual(
      expect.arrayContaining([
        "editor_contract_invalid_path",
        "editor_contract_invalid_readonly_paths",
      ])
    );
  });

  test("rejects duplicate writable paths unless every owner has a temporary allowance", () => {
    const withoutPairedAllowance = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: contract([
        {
          mode: "wizard",
          id: "wiz-copy",
          title: "Guided copy",
          role: "content",
          writablePaths: ["content.title"],
        },
        {
          mode: "visual",
          id: "vis-copy",
          title: "Primary copy",
          role: "content",
          writablePaths: ["content.title"],
          allowedDuplicateWritablePaths: [
            {
              path: "content.title",
              reason: "Legacy overlap while TASK-336 migrates editors.",
              expiresWithTask: "TASK-336-05",
            },
          ],
        },
        {
          mode: "advanced",
          id: "adv-technical",
          title: "Technical controls",
          role: "technical",
          writablePaths: ["behavior.anchorId"],
        },
      ]),
    });
    const withPairedAllowance = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: contract([
        {
          mode: "wizard",
          id: "wiz-copy",
          title: "Guided copy",
          role: "content",
          writablePaths: ["content.title"],
          allowedDuplicateWritablePaths: [
            {
              path: "content.title",
              reason: "Legacy overlap while TASK-336 migrates editors.",
              expiresWithTask: "TASK-336-05",
            },
          ],
        },
        {
          mode: "visual",
          id: "vis-copy",
          title: "Primary copy",
          role: "content",
          writablePaths: ["content.title"],
          allowedDuplicateWritablePaths: [
            {
              path: "content.title",
              reason: "Legacy overlap while TASK-336 migrates editors.",
              expiresWithTask: "TASK-336-05",
            },
          ],
        },
        {
          mode: "advanced",
          id: "adv-technical",
          title: "Technical controls",
          role: "technical",
          writablePaths: ["behavior.anchorId"],
        },
      ]),
    });

    expect(errorCodes(withoutPairedAllowance)).toContain("editor_contract_duplicate_writable_path");
    expect(withPairedAllowance.valid).toBe(true);
  });

  test("keeps advanced diagnostics readonly and wizard away from style ownership", () => {
    const validation = validateWidgetEditorContract({
      type: "sample-widget",
      editorContract: contract([
        {
          mode: "wizard",
          id: "wiz-style",
          title: "Guided appearance",
          role: "setup",
          writablePaths: ["style.color"],
        },
        {
          mode: "visual",
          id: "vis-copy",
          title: "Primary copy",
          role: "content",
          writablePaths: ["content.title"],
        },
        {
          mode: "advanced",
          id: "adv-diagnostics",
          title: "Runtime diagnostics",
          role: "diagnostics",
          writablePaths: ["diagnostics.debug"],
        },
      ]),
    });

    expect(errorCodes(validation)).toEqual(
      expect.arrayContaining([
        "editor_contract_advanced_writable_diagnostic",
        "editor_contract_wizard_style_owner",
      ])
    );
  });

  test("accepts TASK-336-13 P2 widget contracts in strict mode", () => {
    const contracts = [
      { type: "content-list", editorContract: contentListEditorContract },
      { type: "booking-calendar", editorContract: bookingCalendarEditorContract },
      { type: "appointment-form", editorContract: appointmentFormEditorContract },
      { type: "product-table", editorContract: productTableEditorContract },
    ];

    for (const definition of contracts) {
      const validation = validateWidgetEditorContract(definition, { requireContract: true });
      expect(validation.errors).toEqual([]);
      expect(validation.valid).toBe(true);
    }
  });

  test("accepts TASK-336-14 layout widget contracts in strict mode", () => {
    const contracts = [
      { type: "section", editorContract: sectionEditorContract },
      { type: "grid-columns", editorContract: gridColumnsEditorContract },
      { type: "split-layout", editorContract: splitLayoutEditorContract },
      { type: "stack", editorContract: stackEditorContract },
      { type: "spacer", editorContract: spacerEditorContract },
      { type: "divider", editorContract: dividerEditorContract },
    ];

    for (const definition of contracts) {
      const validation = validateWidgetEditorContract(definition, { requireContract: true });
      expect(validation.errors).toEqual([]);
      expect(validation.valid).toBe(true);
      expect(
        definition.editorContract.sections.filter((section) => section.mode === "advanced")
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            writablePaths: [],
          }),
        ])
      );
    }
  });

  test("accepts TASK-336-18 remaining page-builder widget contracts in strict mode", () => {
    const contracts = [
      { type: "toggle-block", editorContract: toggleBlockEditorContract },
      { type: "feature-grid", editorContract: featureGridEditorContract },
      { type: "testimonials", editorContract: testimonialsEditorContract },
      { type: "team", editorContract: teamEditorContract },
      { type: "pricing-plans", editorContract: pricingPlansEditorContract },
      { type: "faq-accordion", editorContract: faqAccordionEditorContract },
      { type: "cta-banner", editorContract: ctaBannerEditorContract },
      { type: "logo-cloud", editorContract: logoCloudEditorContract },
      { type: "gallery-mosaic", editorContract: galleryMosaicEditorContract },
      { type: "rich-text-section", editorContract: richTextSectionEditorContract },
      { type: "entry-teaser", editorContract: entryTeaserEditorContract },
      { type: "product-gallery", editorContract: productGalleryEditorContract },
      { type: "product-compare", editorContract: productCompareEditorContract },
      { type: "timeline", editorContract: timelineEditorContract },
      { type: "compare-timeline", editorContract: compareTimelineEditorContract },
      { type: "newsletter", editorContract: newsletterEditorContract },
      { type: "contact", editorContract: contactEditorContract },
      { type: "navigation", editorContract: navigationEditorContract },
      { type: "footer", editorContract: footerEditorContract },
    ];

    expect(contracts).toHaveLength(19);

    for (const definition of contracts) {
      const validation = validateWidgetEditorContract(definition, { requireContract: true });
      expect(validation.errors).toEqual([]);
      expect(validation.valid).toBe(true);
      if (definition.type === "product-gallery" || definition.type === "product-compare") {
        const declaredPaths = definition.editorContract.sections.flatMap((section) => [
          ...(section.writablePaths ?? []),
          ...(section.readOnlyPaths ?? []),
        ]);
        expect(declaredPaths.filter((path) => path.startsWith("runtime."))).toEqual([]);
      }
      expect(
        definition.editorContract.sections.filter(
          (section) => section.mode === "advanced" && section.role === "diagnostics"
        )
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            writablePaths: [],
          }),
        ])
      );
    }
  });
});

describe("widget registry editor contract diagnostics", () => {
  test("records invalid contract diagnostics without blocking registration", () => {
    registerWidget(
      widgetDefinition(
        "invalid-contract-widget",
        contract([
          {
            mode: "wizard",
            id: "wiz-only",
            title: "Only setup",
            role: "setup",
            writablePaths: ["content.intent"],
          },
        ])
      )
    );

    expect(getWidget("invalid-contract-widget")).not.toBeNull();
    expect(getWidgetEditorContractDiagnostics("invalid-contract-widget")?.valid).toBe(false);
    expect(listWidgetEditorContractDiagnostics()).toHaveLength(1);
  });

  test("validates registered widgets in strict mode on demand", () => {
    registerWidget(widgetDefinition("missing-contract-widget"));

    expect(getWidgetEditorContractDiagnostics("missing-contract-widget")).toBeNull();
    expect(() => assertRegisteredWidgetEditorContracts({ requireContract: true })).toThrow(
      /widget_editor_contract_registry_invalid:missing-contract-widget/
    );
  });

  test("clears editor contract diagnostics with the widget registry", () => {
    registerWidget(
      widgetDefinition(
        "invalid-contract-widget",
        contract([
          {
            mode: "wizard",
            id: "wiz-only",
            title: "Only setup",
            role: "setup",
            writablePaths: ["content.intent"],
          },
        ])
      )
    );

    expect(listWidgetEditorContractDiagnostics()).toHaveLength(1);
    clearWidgets();
    expect(listWidgetEditorContractDiagnostics()).toHaveLength(0);
  });

  test("registerWidget accepts lazy editor components (TASK-467-03)", () => {
    const def: WidgetDefinition<WidgetData> = {
      ...widgetDefinition("lazy-editor-widget"),
      editor: lazyEditorBundle(),
    };

    expect(() => registerWidget(def)).not.toThrow();
    const registered = getWidget("lazy-editor-widget");
    expect(registered?.editor.wizard).toBeTypeOf("object");
    expect(registered?.editor.visual).toBeTypeOf("object");
    expect(registered?.editor.advanced).toBeTypeOf("object");
  });

  test("registerWidget rejects widgets without complete lazy editor modes (TASK-467-03)", () => {
    const lazyNoop = lazy(async () => ({ default: NoopEditor }));
    const def: WidgetDefinition<WidgetData> = {
      ...widgetDefinition("incomplete-lazy-editor-widget"),
      editor: {
        wizard: lazyNoop,
        visual: lazyNoop,
        advanced: lazyNoop,
      },
    };

    // Drop the advanced slot to simulate an incomplete lazy bundle.
    def.editor = { wizard: lazyNoop, visual: lazyNoop } as WidgetDefinition<WidgetData>["editor"];
    expect(() => registerWidget(def)).toThrow("widget_editor_invalid");
  });

  test("core widget factory accepts a lazy editor bundle (TASK-467-03)", () => {
    const lazyNoop = lazy(async () => ({ default: NoopEditor }));
    const editors: WidgetDefinition<WidgetData>["editor"] = {
      wizard: lazyNoop,
      visual: lazyNoop,
      advanced: lazyNoop,
    };

    expect(() =>
      createHeroWidget(editors as unknown as Parameters<typeof createHeroWidget>[0])
    ).not.toThrow();
  });
});
