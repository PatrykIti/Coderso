// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import { SiteBuilderIntakeBasicStepper } from "../../../core/admin/ui/assistant/components/SiteBuilderIntakeBasicStepper";
import { buildBasicSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicFlow";
import { normalizeAssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeFacts,
  type AssistantSiteBuilderIntakeSession,
  type AssistantSiteBuilderIntakeStepId,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import type { AssistantActionPlanResponse } from "../../../core/admin/services/assistantClient";
import { withConfirmedSiteBuilderIntakeReview } from "../../utils/assistantSiteBuilderIntake";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type SiteBuilderIntakeMetadata = NonNullable<
  NonNullable<AssistantActionPlanResponse["metadata"]>["siteBuilderIntake"]
>;

const basicMetadata = (): SiteBuilderIntakeMetadata => {
  const metadata = buildBasicSiteBuilderNeedsInputPlan({}).metadata?.siteBuilderIntake;
  if (!metadata) throw new Error("missing_site_builder_intake_metadata");
  return metadata;
};

const metadataForStep = (
  stepId: SiteBuilderIntakeMetadata["currentStepId"]
): SiteBuilderIntakeMetadata => ({
  ...basicMetadata(),
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

const setTextareaValue = (element: HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const setInputValue = (element: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const saveStep = (container: HTMLElement) => {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes("Save step")
  );
  if (!button) throw new Error("missing_save_button");
  return button;
};

const session = (
  stepId: AssistantSiteBuilderIntakeStepId,
  values: Record<string, unknown>,
  facts: Partial<AssistantSiteBuilderIntakeFacts> = {}
): AssistantSiteBuilderIntakeSession => ({
  version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  mode: "basic",
  currentStepId: stepId,
  answers: [{ stepId, values, updatedAt: new Date().toISOString() }],
  facts: {
    answeredStepIds: [stepId],
    missingRequiredStepIds: [],
    missingReviewInputStepIds: [],
    readyForReview: true,
    readyForExecution: true,
    redactionApplied: false,
    ...facts,
  },
});

const reviewReadySession = (): AssistantSiteBuilderIntakeSession => {
  const answered: AssistantSiteBuilderIntakeSession = {
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "basic",
    currentStepId: "review",
    answers: [
      {
        stepId: "business-profile",
        values: {
          siteName: "Studio Ceramiki",
          entityName: "Studio",
          topic: "handmade ceramic products",
          vertical: "commerce",
          audience: "buyers",
          locale: "en",
          summary: "Sell products.",
        },
      },
      {
        stepId: "site-goals",
        values: {
          goals: ["sell products", "show catalog"],
          primaryGoal: "sell products",
        },
      },
      {
        stepId: "site-map",
        values: {
          pageRoles: ["home", "products", "portfolio", "contact"],
        },
      },
      {
        stepId: "menu",
        values: {
          menuPreset: "conversion-focused",
          primaryActionLabel: "Ask about order",
          primaryActionPageRole: "contact",
        },
      },
      {
        stepId: "homepage-sections",
        values: {
          sectionRoles: ["value-proposition", "featured-items", "proof", "lead-capture"],
        },
      },
      {
        stepId: "hero",
        values: {
          heroPreset: "offer-with-proof",
          headline: "Handmade ceramics",
          subheadline: "Studio pieces.",
          primaryCallToAction: "Browse products",
        },
      },
      {
        stepId: "subpages",
        values: {
          pageRoles: ["about", "team"],
        },
      },
      {
        stepId: "media-policy",
        values: {
          mediaPolicy: "curated",
        },
      },
    ],
    facts: undefined,
  };
  const confirmed = withConfirmedSiteBuilderIntakeReview(answered);
  const normalized = normalizeAssistantSiteBuilderIntakeSession(confirmed);
  if (!normalized || normalized.facts?.readyForReview !== true) {
    throw new Error("review_session_not_ready");
  }
  return normalized;
};

test("SiteBuilderIntakeBasicStepper restores and submits text_list answers", () => {
  const submissions: Array<{ stepId: string; values: Record<string, unknown> }> = [];
  const view = mount(
    <SiteBuilderIntakeBasicStepper
      metadata={metadataForStep("site-goals")}
      session={session("site-goals", { goals: ["Alpha", "Beta"] })}
      onSubmitStep={(stepId, values) => submissions.push({ stepId, values })}
    />
  );

  try {
    const textarea = view.container.querySelector("#site-builder-intake-site-goals-goals");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_goals_textarea");
    expect(textarea.value).toBe("Alpha\nBeta");

    React.act(() => {
      saveStep(view.container).click();
    });

    expect(submissions[0].values.goals).toEqual(["Alpha", "Beta"]);
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeBasicStepper normalizes typed text_list input", () => {
  const submissions: Array<{ stepId: string; values: Record<string, unknown> }> = [];
  const view = mount(
    <SiteBuilderIntakeBasicStepper
      metadata={metadataForStep("site-goals")}
      session={null}
      onSubmitStep={(stepId, values) => submissions.push({ stepId, values })}
    />
  );

  try {
    const textarea = view.container.querySelector("#site-builder-intake-site-goals-goals");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_goals_textarea");

    React.act(() => {
      setTextareaValue(textarea, "First\n\nSecond\nThird");
    });
    React.act(() => {
      saveStep(view.container).click();
    });

    expect(submissions[0].values.goals).toEqual(["First", "Second", "Third"]);
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeBasicStepper toggles and submits multi_select answers", () => {
  const submissions: Array<{ stepId: string; values: Record<string, unknown> }> = [];
  const view = mount(
    <SiteBuilderIntakeBasicStepper
      metadata={metadataForStep("site-map")}
      session={session("site-map", { pageRoles: ["home"] })}
      onSubmitStep={(stepId, values) => submissions.push({ stepId, values })}
    />
  );

  try {
    const checkboxes = Array.from(view.container.querySelectorAll('[role="checkbox"]'));
    expect(checkboxes.length).toBeGreaterThan(0);
    const findCheckboxFor = (labelText: string) => {
      const label = Array.from(view.container.querySelectorAll("label")).find((node) =>
        node.textContent?.includes(labelText)
      );
      return label?.querySelector('[role="checkbox"]');
    };
    const home = findCheckboxFor("Home");
    const about = findCheckboxFor("About");
    if (!(home instanceof HTMLElement)) throw new Error("missing_home_checkbox");
    if (!(about instanceof HTMLElement)) throw new Error("missing_about_checkbox");
    expect(home.getAttribute("data-state")).toBe("checked");

    React.act(() => {
      about.click();
    });
    React.act(() => {
      home.click();
    });
    React.act(() => {
      saveStep(view.container).click();
    });

    expect(submissions[0].values.pageRoles).toEqual(["about"]);
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeBasicStepper filters label_map values to allowed string labels", () => {
  const submissions: Array<{ stepId: string; values: Record<string, unknown> }> = [];
  const view = mount(
    <SiteBuilderIntakeBasicStepper
      metadata={metadataForStep("site-map")}
      session={session("site-map", {
        pageRoles: ["home"],
        customLabels: { home: "Start", "not-allowed": "x", bad: 5 },
      })}
      onSubmitStep={(stepId, values) => submissions.push({ stepId, values })}
    />
  );

  try {
    const homeInput = view.container.querySelector(
      "#site-builder-intake-site-map-customLabels-home"
    );
    if (!(homeInput instanceof HTMLInputElement)) throw new Error("missing_home_label_input");
    expect(homeInput.value).toBe("Start");

    React.act(() => {
      setInputValue(homeInput, "Homepage");
    });
    React.act(() => {
      saveStep(view.container).click();
    });

    expect(submissions[0].values.customLabels).toEqual({ home: "Homepage" });
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeBasicStepper toggles the review confirmation checkbox", () => {
  const submissions: Array<{ stepId: string; values: Record<string, unknown> }> = [];
  const view = mount(
    <SiteBuilderIntakeBasicStepper
      metadata={metadataForStep("review")}
      session={reviewReadySession()}
      onSubmitStep={(stepId, values) => submissions.push({ stepId, values })}
    />
  );

  try {
    const checkbox = view.container.querySelector('[role="checkbox"]');
    if (!(checkbox instanceof HTMLElement)) throw new Error("missing_confirmation_checkbox");
    React.act(() => {
      checkbox.click();
    });
    React.act(() => {
      checkbox.click();
    });
    React.act(() => {
      saveStep(view.container).click();
    });

    expect(submissions[0].values.confirmed).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeBasicStepper renders reference brief gates and warnings", () => {
  const metadata: SiteBuilderIntakeMetadata = {
    ...metadataForStep("review"),
    currentStepId: "reference-intake",
    nextStepId: "reference-intake",
    visibleStepIds: ["reference-intake"],
    steps: [
      ...basicMetadata().steps,
      { ...basicMetadata().steps[0], id: "reference-intake" as never },
    ],
  };
  const referenceFacts: AssistantSiteBuilderIntakeFacts = {
    referenceDesignBrief: {
      schemaVersion: 1 as const,
      sourceDigest: "abcd1234",
      colorHintIds: ["warm", "muted"],
      layoutHintIds: ["grid", "split"],
      densityId: "balanced",
      typographyId: "serif-accent",
      imageTreatmentId: "quiet",
      evidence: {
        mediaAssetCount: 2,
        temporaryReferenceCount: 1,
        hasTextBrief: true,
      },
      warnings: [
        {
          code: "reference_secret_redacted",
          severity: "warning",
          message: "Secret-like reference text was redacted.",
          count: 1,
        },
      ],
      gates: [
        {
          code: "reference_review_required",
          severity: "warning",
          message: "Reference design hints must be reviewed.",
          count: 2,
        },
      ],
      constraints: {
        executableActionsAllowed: false as const,
        mediaImportsAllowed: false as const,
        rawReferenceMaterialIncluded: false as const,
      },
    },
  };
  const intakeSession = session("reference-intake", {}, referenceFacts);

  const html = viewToHtml(
    <SiteBuilderIntakeBasicStepper
      metadata={metadata}
      session={intakeSession}
      onSubmitStep={() => undefined}
    />
  );

  expect(html).toContain("Reference review required");
  expect(html).toContain("Reference design hints must be reviewed.");
  expect(html).toContain("Secret-like reference text was redacted.");
  expect(html).toContain("(2)");
  expect(html).toContain("(1)");
});

test("SiteBuilderIntakeBasicStepper stays on Basic after confirming advanced switch", () => {
  const view = mount(
    <SiteBuilderIntakeBasicStepper
      metadata={metadataForStep("business-profile")}
      session={null}
      onSubmitStep={() => undefined}
      onSwitchMode={() => undefined}
    />
  );

  try {
    const switchButton = Array.from(view.container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Switch to Advanced")
    );
    if (!switchButton) throw new Error("missing_switch_button");
    React.act(() => {
      switchButton.click();
    });

    expect(view.container.textContent).toContain("Confirm Advanced");

    const stayButton = Array.from(view.container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Stay Basic")
    );
    if (!stayButton) throw new Error("missing_stay_button");
    React.act(() => {
      stayButton.click();
    });

    expect(view.container.textContent).toContain("Switch to Advanced");
  } finally {
    view.cleanup();
  }
});

const viewToHtml = (node: React.ReactNode) => {
  const view = mount(node);
  try {
    return view.container.innerHTML;
  } finally {
    view.cleanup();
  }
};
