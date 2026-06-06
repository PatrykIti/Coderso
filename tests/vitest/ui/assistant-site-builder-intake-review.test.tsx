// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { SiteBuilderIntakeStepper } from "../../../core/admin/ui/assistant/components/SiteBuilderIntakeBasicStepper";
import type { AssistantActionPlanResponse } from "../../../core/admin/services/assistantClient";
import { buildAdvancedSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeAdvancedFlow";
import { normalizeAssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeAnswer,
  type AssistantSiteBuilderIntakeSession,
  type AssistantSiteBuilderIntakeStepId,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import { withConfirmedSiteBuilderIntakeReview } from "../../utils/assistantSiteBuilderIntake";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type SiteBuilderIntakeMetadata = NonNullable<
  NonNullable<AssistantActionPlanResponse["metadata"]>["siteBuilderIntake"]
>;

const baseAnswers = (overrides: { topic?: string; goals?: string[] } = {}) =>
  [
    {
      stepId: "business-profile",
      values: {
        siteName: "Studio Review",
        topic: overrides.topic ?? "product catalog and workshops",
        vertical: "commerce",
        audience: "buyers and workshop participants",
        locale: "en",
      },
    },
    {
      stepId: "site-goals",
      values: {
        goals: overrides.goals ?? ["sell products", "collect leads"],
        primaryGoal: "collect leads",
      },
    },
    {
      stepId: "site-map",
      values: {
        pageRoles: ["home", "products", "faq", "contact"],
      },
    },
    {
      stepId: "menu",
      values: {
        menuPreset: "conversion-focused",
        primaryActionPageRole: "contact",
      },
    },
    {
      stepId: "homepage-sections",
      values: {
        sectionRoles: ["featured-items", "faq", "lead-capture"],
      },
    },
    {
      stepId: "hero",
      values: {
        heroPreset: "offer-with-proof",
        headline: "Products and workshops",
      },
    },
    {
      stepId: "subpages",
      values: {
        pageRoles: ["about"],
      },
    },
    {
      stepId: "media-policy",
      values: {
        mediaPolicy: "placeholder",
      },
    },
    {
      stepId: "content-engine",
      values: {
        contentEngines: ["products", "faq"],
      },
    },
  ] satisfies AssistantSiteBuilderIntakeAnswer[];

const reviewedSession = (answers: AssistantSiteBuilderIntakeAnswer[] = baseAnswers()) =>
  normalizeAssistantSiteBuilderIntakeSession(
    withConfirmedSiteBuilderIntakeReview({
      version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
      mode: "advanced",
      currentStepId: "review",
      answers,
    } satisfies AssistantSiteBuilderIntakeSession)
  );

const metadataFor = (session: AssistantSiteBuilderIntakeSession): SiteBuilderIntakeMetadata => {
  const metadata = buildAdvancedSiteBuilderNeedsInputPlan({ session }).metadata?.siteBuilderIntake;
  if (!metadata) throw new Error("missing_site_builder_intake_metadata");
  return {
    ...metadata,
    currentStepId: "review",
    nextStepId: "review",
  };
};

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

test("SiteBuilderIntakeStepper renders the final review summary contract", () => {
  const session = reviewedSession();
  const html = renderToString(
    <SiteBuilderIntakeStepper
      metadata={metadataFor(session)}
      session={session}
      onSubmitStep={() => undefined}
    />
  );

  expect(html).toContain("Final review");
  expect(html).toContain("Pages");
  expect(html).toContain("Menu");
  expect(html).toContain("Footer");
  expect(html).toContain("Hero");
  expect(html).toContain("Homepage sections");
  expect(html).toContain("Subpages");
  expect(html).toContain("Content engines");
  expect(html).toContain("Custom screens");
  expect(html).toContain("Media policy");
  expect(html).toContain("SEO");
  expect(html).toContain("Lead capture");
  expect(html).toContain("Products workspace");
  expect(html).not.toContain("confirmedReviewHash");
});

test("SiteBuilderIntakeStepper submits review confirmation with the current review hash", () => {
  const session = reviewedSession();
  const submissions: Array<{
    stepId: AssistantSiteBuilderIntakeStepId;
    values: Record<string, unknown>;
  }> = [];
  const view = mount(
    <SiteBuilderIntakeStepper
      metadata={metadataFor(session)}
      session={session}
      onSubmitStep={(stepId, values) => submissions.push({ stepId, values })}
    />
  );

  try {
    const saveButton = findButton(view.container, "Save step");
    if (!saveButton) throw new Error("missing_save_button");

    React.act(() => {
      saveButton.click();
    });

    expect(submissions).toEqual([
      {
        stepId: "review",
        values: {
          confirmed: true,
          confirmedReviewHash: session.facts?.reviewHash,
          reviewState: "confirmed",
        },
      },
    ]);
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeStepper blocks review confirmation when summary has blocking gates", () => {
  const session = reviewedSession(
    baseAnswers({
      topic: "events calendar for local workshops",
      goals: ["show events calendar"],
    })
  );
  const submissions: Array<Record<string, unknown>> = [];
  const view = mount(
    <SiteBuilderIntakeStepper
      metadata={metadataFor(session)}
      session={session}
      onSubmitStep={(_, values) => submissions.push(values)}
    />
  );

  try {
    const saveButton = findButton(view.container, "Save step");
    if (!saveButton) throw new Error("missing_save_button");

    expect(view.container.textContent).toContain("Resolve blocking gates before planning");
    expect(view.container.textContent).toContain("events");
    expect(saveButton.disabled).toBe(true);

    React.act(() => {
      saveButton.click();
    });

    expect(submissions).toEqual([]);
  } finally {
    view.cleanup();
  }
});
