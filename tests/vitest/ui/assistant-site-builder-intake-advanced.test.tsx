// @vitest-environment happy-dom

import React from "react";
import { renderToString } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import {
  SiteBuilderIntakeBasicStepper,
  SiteBuilderIntakeStepper,
} from "../../../core/admin/ui/assistant/components/SiteBuilderIntakeBasicStepper";
import type { AssistantActionPlanResponse } from "../../../core/admin/services/assistantClient";
import { buildAdvancedSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeAdvancedFlow";
import { buildBasicSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicFlow";
import { normalizeAssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeMode,
  type AssistantSiteBuilderIntakeStepId,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type SiteBuilderIntakeMetadata = NonNullable<
  NonNullable<AssistantActionPlanResponse["metadata"]>["siteBuilderIntake"]
>;

const advancedMetadata = (): SiteBuilderIntakeMetadata => {
  const metadata = buildAdvancedSiteBuilderNeedsInputPlan({}).metadata?.siteBuilderIntake;
  if (!metadata) throw new Error("missing_advanced_site_builder_intake_metadata");
  return metadata;
};

const basicMetadata = (): SiteBuilderIntakeMetadata => {
  const metadata = buildBasicSiteBuilderNeedsInputPlan({}).metadata?.siteBuilderIntake;
  if (!metadata) throw new Error("missing_basic_site_builder_intake_metadata");
  return metadata;
};

const metadataForStep = (
  stepId: SiteBuilderIntakeMetadata["currentStepId"],
  metadata: SiteBuilderIntakeMetadata = advancedMetadata()
): SiteBuilderIntakeMetadata => ({
  ...metadata,
  currentStepId: stepId,
  nextStepId: stepId,
});

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const findButton = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  ) as HTMLButtonElement | null | undefined;

const setSelectValue = (element: HTMLSelectElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setTextareaValue = (element: HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

test("SiteBuilderIntakeStepper renders controlled Advanced fields from metadata", () => {
  const rendered = ["menu", "hero", "homepage-sections", "design-preset", "reference-intake"]
    .map((stepId) =>
      renderToString(
        <SiteBuilderIntakeStepper
          metadata={metadataForStep(stepId as SiteBuilderIntakeMetadata["currentStepId"])}
          session={null}
          onSubmitStep={() => undefined}
        />
      )
    )
    .join("\n");

  expect(rendered).toContain("Advanced menu behavior");
  expect(rendered).toContain("Advanced hero variant");
  expect(rendered).toContain("Advanced section variants");
  expect(rendered).toContain("Design preset");
  expect(rendered).toContain("Reference ids");
  expect(rendered).not.toContain("Raw HTML");
  expect(rendered).not.toContain("Remote media import");
});

test("SiteBuilderIntakeStepper requires explicit confirmation before switching Basic to Advanced", () => {
  const switches: AssistantSiteBuilderIntakeMode[] = [];
  const view = mount(
    <SiteBuilderIntakeBasicStepper
      metadata={metadataForStep("business-profile", basicMetadata())}
      session={null}
      onSubmitStep={() => undefined}
      onSwitchMode={(mode) => switches.push(mode)}
    />
  );

  try {
    const switchButton = findButton(view.container, "Switch to Advanced");
    if (!switchButton) throw new Error("missing_switch_button");

    React.act(() => {
      switchButton.click();
    });

    expect(switches).toEqual([]);
    expect(view.container.textContent).toContain("Advanced adds controlled design");

    const confirmButton = findButton(view.container, "Confirm Advanced");
    if (!confirmButton) throw new Error("missing_confirm_button");

    React.act(() => {
      confirmButton.click();
    });

    expect(switches).toEqual(["advanced"]);
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeStepper submits Advanced design preset answers through structured values", () => {
  const submissions: Array<{
    stepId: AssistantSiteBuilderIntakeStepId;
    values: Record<string, unknown>;
  }> = [];
  const view = mount(
    <SiteBuilderIntakeStepper
      metadata={metadataForStep("design-preset")}
      session={null}
      onSubmitStep={(stepId, values) => {
        submissions.push({ stepId, values });
      }}
    />
  );

  try {
    const preset = view.container.querySelector(
      "#site-builder-intake-design-preset-designPresetId"
    );
    const brief = view.container.querySelector("#site-builder-intake-design-preset-designBrief");
    if (!(preset instanceof HTMLSelectElement)) throw new Error("missing_design_preset");
    if (!(brief instanceof HTMLTextAreaElement)) throw new Error("missing_design_brief");

    React.act(() => {
      setSelectValue(preset, "modern");
      setTextareaValue(brief, "Clean visual direction with practical service sections.");
    });

    const saveButton = findButton(view.container, "Save step");
    if (!saveButton) throw new Error("missing_save_button");

    React.act(() => {
      saveButton.click();
    });

    expect(submissions).toEqual([
      {
        stepId: "design-preset",
        values: {
          designPresetId: "modern",
          designBrief: "Clean visual direction with practical service sections.",
        },
      },
    ]);
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeStepper exposes step selection for optional Advanced controls", () => {
  const selections: AssistantSiteBuilderIntakeStepId[] = [];
  const view = mount(
    <SiteBuilderIntakeStepper
      metadata={advancedMetadata()}
      session={null}
      onSubmitStep={() => undefined}
      onSelectStep={(stepId) => selections.push(stepId)}
    />
  );

  try {
    const designStep = findButton(view.container, "Design preset");
    if (!designStep) throw new Error("missing_design_step");

    React.act(() => {
      designStep.click();
    });

    expect(selections).toEqual(["design-preset"]);
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeStepper renders real Advanced layout gates from normalized facts", () => {
  const session = normalizeAssistantSiteBuilderIntakeSession({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "advanced",
    currentStepId: "menu",
    answers: [
      {
        stepId: "menu",
        values: {
          menuPreset: "simple",
          advancedMenuBehaviorIds: ["single-level", "grouped"],
        },
      },
    ],
  });

  const html = renderToString(
    <SiteBuilderIntakeStepper
      metadata={metadataForStep("menu")}
      session={session}
      onSubmitStep={() => undefined}
    />
  );

  expect(html).toContain("Advanced layout review");
  expect(html).toContain("single-level and grouped");
});

test("SiteBuilderIntakeStepper renders real reference review-required state without raw leakage", () => {
  const session = normalizeAssistantSiteBuilderIntakeSession({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "advanced",
    currentStepId: "reference-intake",
    answers: [
      {
        stepId: "reference-intake",
        values: {
          textBrief: "Use a clean grid; API key: sk-live-secret should be ignored",
          referenceLabels: ["Reviewed inspiration"],
        },
      },
    ],
  });

  const html = renderToString(
    <SiteBuilderIntakeStepper
      metadata={metadataForStep("reference-intake")}
      session={session}
      onSubmitStep={() => undefined}
    />
  );

  expect(html).toContain("Reference review required");
  expect(html).toContain("References must be reviewed before they can influence generation.");
  expect(html).not.toContain("sk-live-secret");
});
