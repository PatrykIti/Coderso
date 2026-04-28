import React from "react";
import { expect, test } from "vitest";

import { AiSiteWizard } from "../../../core/admin/ui/setup/AiSiteWizard";
import { AiSiteWizardStepContent } from "../../../core/admin/ui/setup/AiSiteWizardSteps";
import {
  AI_SITE_WIZARD_DEFAULT_DRAFT,
  getDefaultEnabledStepIds,
  readWizardPlanFromRunOptions,
  validateAiSiteWizardStep,
} from "../../../core/admin/ui/setup/aiSiteWizardValidation";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("validateAiSiteWizardStep blocks goals step when no goals selected", () => {
  const message = validateAiSiteWizardStep({
    step: 2,
    draft: {
      businessType: "custom",
      locale: "en",
      siteName: "",
      goals: [],
    },
    plan: null,
    enabledStepIds: [],
  });

  expect(message).toContain("Select at least one goal");
});

test("readWizardPlanFromRunOptions returns plan payload", () => {
  const payload = readWizardPlanFromRunOptions({
    wizard: {
      enabledStepIds: ["settings", "pages", "qa"],
      settingsPatch: { "site.locale": "pl" },
      notes: ["Use local defaults"],
    },
  });

  expect(payload?.enabledStepIds).toEqual(["settings", "pages", "qa"]);
  expect(payload?.settingsPatch).toEqual({ "site.locale": "pl" });
  expect(payload?.notes).toEqual(["Use local defaults"]);
});

test("getDefaultEnabledStepIds returns fixed and editable steps from plan", () => {
  const enabled = getDefaultEnabledStepIds({
    recommendedKitId: "automotive-workshop",
    confidence: 90,
    recommendations: [],
    steps: [
      {
        id: "settings",
        type: "settings",
        title: "Settings",
        description: "Fixed",
        editable: false,
      },
      {
        id: "pages",
        type: "pages",
        title: "Pages",
        description: "Editable",
        editable: true,
      },
    ],
    settingsPatch: {},
    notes: [],
  });

  expect(enabled).toEqual(["settings", "pages"]);
});

test("AiSiteWizard renders guided flow sections", () => {
  const html = renderAdminUi(
    <AiSiteWizard
      kits={[
        {
          id: "automotive-workshop",
          title: "Automotive Workshop",
          shortDescription: "Starter kit",
          recommendedModules: ["booking"],
          features: ["Forms"],
        },
      ]}
      selectedKitId="automotive-workshop"
      selectedKit={null}
      onSelectKit={() => undefined}
    />,
    { path: "/admin/advanced/solution-kits" }
  );

  expect(html).toContain("AI Site Wizard");
  expect(html).toContain("Business profile");
  expect(html).toContain("Plan review");
  expect(html).toContain("Execute");
});

test("AiSiteWizardStepContent renders explainable action map in plan review", () => {
  const html = renderAdminUi(
    <AiSiteWizardStepContent
      step={4}
      draft={AI_SITE_WIZARD_DEFAULT_DRAFT}
      onDraftChange={() => undefined}
      onToggleGoal={() => undefined}
      plan={{
        recommendedKitId: "automotive-workshop",
        confidence: 90,
        recommendations: [],
        steps: [
          {
            id: "settings",
            type: "settings",
            title: "Settings",
            description: "Apply settings",
            editable: false,
          },
          {
            id: "pages",
            type: "pages",
            title: "Pages",
            description: "Apply pages",
            editable: true,
          },
          {
            id: "qa",
            type: "qa",
            title: "QA",
            description: "Run checks",
            editable: false,
          },
        ],
        settingsPatch: {},
        notes: [],
      }}
      guidedPlan={{
        plan: {
          recommendedKitId: "automotive-workshop",
          confidence: 90,
          recommendations: [],
          steps: [],
          settingsPatch: {},
          notes: [],
        },
        selectedKitId: "automotive-workshop",
        selectedKitTitle: "Automotive Workshop",
        enabledStepIds: ["settings", "pages", "qa"],
        actions: [
          {
            id: "pages:page:home",
            stepId: "pages",
            title: "Upsert page: Home",
            description: "Sync page payload.",
            target: "page",
            resourceKey: "home",
            required: true,
          },
        ],
        modules: {
          required: ["forms"],
          optional: [],
          recommended: ["booking"],
        },
      }}
      enabledStepIds={["settings", "pages", "qa"]}
      onToggleStep={() => undefined}
      onGeneratePlan={() => undefined}
      isPlanLoading={false}
      kits={[]}
      selectedKitId="automotive-workshop"
      selectedKit={null}
      selectedSummary={null}
      onSelectKit={() => undefined}
      onApply={() => undefined}
      onRerunLatest={() => undefined}
      onRollbackLatest={() => undefined}
      onCloneLatest={() => undefined}
      onRefreshRuns={() => undefined}
      isExecuting={false}
      runs={[]}
      runsLoading={false}
      runsError={null}
      selectedRunId={null}
      onSelectRunId={() => undefined}
      selectedRun={null}
      isDetailLoading={false}
      detailError={null}
      latestApplyRun={null}
      latestApplyRunId={null}
      validation={null}
    />,
    { path: "/admin/advanced/solution-kits" }
  );

  expect(html).toContain("Action map");
  expect(html).toContain("Upsert page: Home");
  expect(html).toContain("Modules");
});

test("AiSiteWizardStepContent renders validation checks in execute step", () => {
  const html = renderAdminUi(
    <AiSiteWizardStepContent
      step={5}
      draft={AI_SITE_WIZARD_DEFAULT_DRAFT}
      onDraftChange={() => undefined}
      onToggleGoal={() => undefined}
      plan={null}
      guidedPlan={null}
      enabledStepIds={["settings", "pages", "qa"]}
      onToggleStep={() => undefined}
      onGeneratePlan={() => undefined}
      isPlanLoading={false}
      kits={[]}
      selectedKitId="automotive-workshop"
      selectedKit={null}
      selectedSummary={null}
      onSelectKit={() => undefined}
      onApply={() => undefined}
      onRerunLatest={() => undefined}
      onRollbackLatest={() => undefined}
      onCloneLatest={() => undefined}
      onRefreshRuns={() => undefined}
      isExecuting={false}
      runs={[]}
      runsLoading={false}
      runsError={null}
      selectedRunId={null}
      onSelectRunId={() => undefined}
      selectedRun={null}
      isDetailLoading={false}
      detailError={null}
      latestApplyRun={null}
      latestApplyRunId={null}
      validation={{
        runId: "run-1",
        status: "warning",
        unresolvedItems: ["No form operations were applied."],
        checks: [
          {
            id: "step.forms",
            label: "Forms step",
            status: "warning",
            details: "No form operations were applied.",
          },
        ],
      }}
    />,
    { path: "/admin/advanced/solution-kits" }
  );

  expect(html).toContain("Validation result");
  expect(html).toContain("No form operations were applied.");
  expect(html).toContain("Forms step");
});
