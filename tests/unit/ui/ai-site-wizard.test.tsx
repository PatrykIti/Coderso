import { expect, test } from "bun:test";

import { AiSiteWizard } from "../../../core/admin/ui/setup/AiSiteWizard";
import {
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
    { path: "/admin/coderso/solution-kits" }
  );

  expect(html).toContain("AI Site Wizard");
  expect(html).toContain("Business profile");
  expect(html).toContain("Plan review");
  expect(html).toContain("Execute");
});
