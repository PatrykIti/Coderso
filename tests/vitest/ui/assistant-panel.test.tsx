import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AssistantEmptyState } from "../../../core/admin/ui/assistant/AssistantEmptyState";
import { AssistantMessage } from "../../../core/admin/ui/assistant/AssistantMessage";
import { AssistantModeSwitch } from "../../../core/admin/ui/assistant/AssistantModeSwitch";
import { AssistantPanel } from "../../../core/admin/ui/assistant/AssistantPanel";
import { ActionExecutionResult } from "../../../core/admin/ui/assistant/components/ActionExecutionResult";
import { ActionPlanReview } from "../../../core/admin/ui/assistant/components/ActionPlanReview";
import { AdminAssistantConfigProvider } from "../../../core/admin/ui/contexts/AdminAssistantConfigContext";

test("AssistantPanel renders floating launcher when assistant is globally enabled", () => {
  const html = renderAdminUi(
    <AdminAssistantConfigProvider
      value={{
        enabled: true,
        launcherAvatarEnabled: false,
        launcherAvatarAsset: null,
      }}
    >
      <AssistantPanel />
    </AdminAssistantConfigProvider>
  );

  expect(html).toContain('aria-label="Open assistant conversation"');
});

test("AssistantPanel stays hidden when assistant is globally disabled", () => {
  const html = renderAdminUi(
    <AdminAssistantConfigProvider
      value={{
        enabled: false,
        launcherAvatarEnabled: false,
        launcherAvatarAsset: null,
      }}
    >
      <AssistantPanel />
    </AdminAssistantConfigProvider>
  );

  expect(html).toBe("");
});

test("AssistantPanel launcher uses avatar asset when configured", () => {
  const html = renderAdminUi(
    <AdminAssistantConfigProvider
      value={{
        enabled: true,
        launcherAvatarEnabled: true,
        launcherAvatarAsset: "https://cdn.example.com/avatar.png",
      }}
    >
      <AssistantPanel />
    </AdminAssistantConfigProvider>
  );

  expect(html).toContain("avatar.png");
});

test("AssistantModeSwitch renders mode selector", () => {
  const html = renderAdminUi(
    <AssistantModeSwitch
      value="docs-only"
      llmAvailable={false}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Assistant mode");
  expect(html).toContain("Docs only");
});

test("AssistantEmptyState renders starter prompts", () => {
  const html = renderAdminUi(
    <AssistantEmptyState onPromptSelect={() => undefined} />
  );

  expect(html).toContain("Ask where something is in docs");
  expect(html).toContain("Hero widget colors");
});

test("AssistantMessage renders assistant metadata and sources", () => {
  const html = renderAdminUi(
    <AssistantMessage
      role="assistant"
      text="Use General Settings > Assistant card."
      response={{
        mode: "llm-rag",
        template: "location_answer",
        detailLevel: "instruction",
        guideMode: "default",
        answer: "Use General Settings > Assistant card.",
        confidence: 0.81,
        sources: [
          {
            path: "_docs/SETTINGS.md",
            heading: "Assistant settings",
            lineStart: 20,
            lineEnd: 45,
            snippet: "assistant.enabled",
            score: 2.1,
          },
        ],
        followUpOptions: [],
        fallbackUsed: true,
        requestedMode: "llm-rag",
        effectiveMode: "docs-only",
        retrievalBackend: "db",
        llm: null,
      }}
    />
  );

  expect(html).toContain("Fallback applied");
  expect(html).toContain("Internal Docs");
  expect(html).not.toContain("Sources");
  expect(html).not.toContain("_docs/SETTINGS.md");
  expect(html).toContain("break-words");
  expect(html).toContain("overflow-wrap:anywhere");
});

test("AssistantMessage renders docs answers as structured paragraphs and lists", () => {
  const html = renderAdminUi(
    <AssistantMessage
      role="assistant"
      text={[
        "Most likely surface:",
        "Coderso Widgets and Template Editor",
        "",
        "What to do:",
        "",
        "1. Open Widgets.",
        "2. Edit the Hero template.",
        "3. Use the Visual tab to change colors.",
      ].join("\n")}
      response={{
        mode: "docs-only",
        template: "location_answer",
        detailLevel: "instruction",
        guideMode: "default",
        answer: "",
        confidence: 0.74,
        sources: [],
        followUpOptions: [],
        fallbackUsed: false,
        requestedMode: "docs-only",
        effectiveMode: "docs-only",
        retrievalBackend: "db",
        llm: null,
      }}
    />
  );

  expect(html).toContain("Most likely surface:");
  expect(html).toContain("What to do:");
  expect(html).toContain("<ol");
  expect(html).toContain("list-decimal");
  expect(html).toContain("Edit the Hero template.");
});

test("AssistantMessage renders clarifying question choices as bullet list", () => {
  const html = renderAdminUi(
    <AssistantMessage
      role="assistant"
      text={[
        "I am not confident which product area you mean from the docs yet.",
        "",
        "Do you mean:",
        "",
        "- Themes",
        "- Coderso Widgets and Template Editor",
      ].join("\n")}
      response={{
        mode: "docs-only",
        template: "clarifying_question",
        detailLevel: "medium",
        guideMode: "default",
        answer: "",
        confidence: 0.22,
        sources: [],
        followUpOptions: [],
        fallbackUsed: false,
        requestedMode: "docs-only",
        effectiveMode: "docs-only",
        retrievalBackend: "db",
        llm: null,
      }}
    />
  );

  expect(html).toContain("Do you mean:");
  expect(html).toContain("<ul");
  expect(html).toContain("list-disc");
  expect(html).toContain("Coderso Widgets and Template Editor");
});

test("AssistantMessage renders follow-up options for progressive depth flow", () => {
  const html = renderAdminUi(
    <AssistantMessage
      role="assistant"
      text="Basic answer."
      response={{
        mode: "docs-only",
        template: "how_to_answer",
        detailLevel: "basic",
        guideMode: "default",
        answer: "Basic answer.",
        confidence: 0.61,
        sources: [],
        followUpOptions: [
          {
            id: "followup-medium",
            label: "More detail",
            detailLevel: "medium",
            guideMode: "default",
            promptHint: "Give me a medium-detail explanation for this feature.",
          },
          {
            id: "followup-instruction",
            label: "Step-by-step",
            detailLevel: "instruction",
            guideMode: "default",
            promptHint: "Give me step-by-step instructions for this feature.",
          },
        ],
        fallbackUsed: false,
        requestedMode: "docs-only",
        effectiveMode: "docs-only",
        retrievalBackend: "db",
        llm: null,
      }}
    />
  );

  expect(html).toContain("Need more?");
  expect(html).toContain("More detail");
  expect(html).toContain("Step-by-step");
});

test("ActionPlanReview renders planned guide actions", () => {
  const html = renderAdminUi(
    <ActionPlanReview
      plan={{
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Create structured catalog surfaces for house projects.",
        confidence: 0.91,
        assumptions: ["Use existing Coderso surfaces."],
        questions: [],
        actions: [
          {
            id: "content-type-house-projects",
            type: "content-type.upsert",
            title: "Create the house projects content model",
            description: "Structured fields for project data.",
            input: {
              slug: "house-projects",
              name: "House Projects",
              schema: { type: "object" },
            },
          },
        ],
      }}
      preview={{
        plan: {
          id: "plan-house-projects-catalog",
          status: "ready",
          intentId: "house-projects-catalog",
          title: "House Projects Catalog",
          answer: "Plan ready",
          summary: "Create structured catalog surfaces for house projects.",
          confidence: 0.91,
          assumptions: [],
          questions: [],
          actions: [],
        },
        changes: [
          {
            actionId: "content-type-house-projects",
            type: "content-type.upsert",
            targetType: "content-type",
            targetKey: "house-projects",
            operation: "create",
            summary: "Create content type",
            warnings: [],
          },
        ],
        warnings: [],
        readyToExecute: true,
      }}
      onPreview={() => undefined}
      onExecute={() => undefined}
    />
  );

  expect(html).toContain("LLM Guide Plan");
  expect(html).toContain("House Projects Catalog");
  expect(html).toContain("Create the house projects content model");
  expect(html).toContain("Execute setup");
});

test("ActionExecutionResult renders resource links and summary", () => {
  const html = renderAdminUi(
    <ActionExecutionResult
      result={{
        plan: {
          id: "plan-house-projects-catalog",
          status: "ready",
          intentId: "house-projects-catalog",
          title: "House Projects Catalog",
          answer: "Plan ready",
          summary: "Plan summary",
          confidence: 0.9,
          assumptions: [],
          questions: [],
          actions: [],
        },
        preview: {
          plan: {
            id: "plan-house-projects-catalog",
            status: "ready",
            intentId: "house-projects-catalog",
            title: "House Projects Catalog",
            answer: "Plan ready",
            summary: "Plan summary",
            confidence: 0.9,
            assumptions: [],
            questions: [],
            actions: [],
          },
          changes: [],
          warnings: [],
          readyToExecute: true,
        },
        results: [
          {
            actionId: "page-house-projects-catalog",
            type: "page.upsert",
            targetType: "page",
            targetKey: "/projekty-domow",
            operation: "create",
            status: "success",
            resourceId: "page-1",
            adminHref: "/admin/pages/page-1",
            publicHref: "/projekty-domow",
            message: "Public catalog page is ready.",
          },
        ],
        summary: {
          create: 1,
          update: 0,
          noop: 0,
          failed: 0,
        },
      }}
    />
  );

  expect(html).toContain("Setup results");
  expect(html).toContain("Open in admin");
  expect(html).toContain("Open public page");
});
