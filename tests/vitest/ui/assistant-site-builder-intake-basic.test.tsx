// @vitest-environment happy-dom

import React from "react";
import { renderToString } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import { SiteBuilderIntakeBasicStepper } from "../../../core/admin/ui/assistant/components/SiteBuilderIntakeBasicStepper";
import { buildBasicSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicFlow";
import type { AssistantActionPlanResponse } from "../../../core/admin/services/assistantClient";

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

const setInputValue = (element: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const setTextareaValue = (element: HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

test("SiteBuilderIntakeBasicStepper renders every Basic control type from metadata", () => {
  const rendered = ["business-profile", "site-goals", "site-map", "menu", "review"]
    .map((stepId) =>
      renderToString(
        <SiteBuilderIntakeBasicStepper
          metadata={metadataForStep(stepId as SiteBuilderIntakeMetadata["currentStepId"])}
          session={null}
          onSubmitStep={() => undefined}
        />
      )
    )
    .join("\n");

  expect(rendered).toContain("Site name");
  expect(rendered).toContain("Audience");
  expect(rendered).toContain("Goals");
  expect(rendered).toContain("Page roles");
  expect(rendered).toContain("Custom labels");
  expect(rendered).toContain("Menu preset");
  expect(rendered).toContain("Confirmed");
  expect(rendered).not.toContain("Advanced menu behavior");
  expect(rendered).not.toContain("Advanced hero variant");
});

test("SiteBuilderIntakeBasicStepper submits one structured answer for the visible step", () => {
  const submissions: Array<{ stepId: string; values: Record<string, unknown> }> = [];
  const view = mount(
    <SiteBuilderIntakeBasicStepper
      metadata={metadataForStep("business-profile")}
      session={null}
      onSubmitStep={(stepId, values) => {
        submissions.push({ stepId, values });
      }}
    />
  );

  try {
    const siteName = view.container.querySelector("#site-builder-intake-business-profile-siteName");
    const locale = view.container.querySelector("#site-builder-intake-business-profile-locale");
    const summary = view.container.querySelector("#site-builder-intake-business-profile-summary");
    if (!(siteName instanceof HTMLInputElement)) throw new Error("missing_site_name");
    if (!(locale instanceof HTMLInputElement)) throw new Error("missing_locale");
    if (!(summary instanceof HTMLTextAreaElement)) throw new Error("missing_summary");

    React.act(() => {
      setInputValue(siteName, "Provider Finder");
      setInputValue(locale, "en");
      setTextareaValue(summary, "A directory for trusted local professionals.");
    });

    const button = Array.from(view.container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Save step")
    );
    if (!button) throw new Error("missing_save_button");

    React.act(() => {
      button.click();
    });

    expect(submissions).toEqual([
      {
        stepId: "business-profile",
        values: {
          siteName: "Provider Finder",
          locale: "en",
          summary: "A directory for trusted local professionals.",
        },
      },
    ]);
  } finally {
    view.cleanup();
  }
});

test("SiteBuilderIntakeBasicStepper renders rejection beside the current step", () => {
  const html = renderToString(
    <SiteBuilderIntakeBasicStepper
      metadata={metadataForStep("business-profile")}
      session={null}
      error="The site name is required."
      onSubmitStep={() => undefined}
    />
  );

  expect(html).toContain("Site profile");
  expect(html).toContain("Step was not accepted");
  expect(html).toContain("The site name is required.");
});

test("SiteBuilderIntakeBasicStepper does not continue restored metadata without answers", () => {
  const html = renderToString(
    <SiteBuilderIntakeBasicStepper
      metadata={{
        ...metadataForStep("site-goals"),
        answeredStepIds: ["business-profile"],
      }}
      session={null}
      onSubmitStep={() => undefined}
    />
  );

  expect(html).toContain("Guided answers were not restored");
  expect(html).toContain("Previous answers are not stored in browser cache for security.");
  expect(html).not.toContain("Save step");
});
