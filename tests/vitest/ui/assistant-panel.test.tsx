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
        mode: "llm-guide",
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
        requestedMode: "llm-guide",
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
        metadata: {
          planner: "provider",
          providerDraftUsed: true,
          providerId: "fake",
        },
        assumptions: ["Use existing Coderso surfaces."],
        questions: [],
        actions: [
          {
            id: "menu-products",
            type: "menu.item.upsert",
            title: "Add products to navigation",
            description: "Add a safe relative menu item.",
            input: {
              menuId: "primary",
              label: "Products",
              href: "/products",
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
            actionId: "menu-products",
            type: "menu.item.upsert",
            targetType: "menu-item",
            targetKey: "primary//products",
            operation: "create",
            summary: "Create menu item",
            warnings: ["Menu will be updated."],
            conflicts: [
              {
                code: "navigation_conflict",
                severity: "warning",
                message: "Existing menu item will be reused if present.",
              },
            ],
            dependencies: [
              {
                actionId: null,
                targetType: "permission",
                targetKey: "menus:write",
                optional: false,
              },
            ],
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
  expect(html).toContain("Provider draft");
  expect(html).toContain("Add products to navigation");
  expect(html).toContain("Menu item");
  expect(html).toContain("Target:");
  expect(html).toContain("menu-item");
  expect(html).toContain("primary//products");
  expect(html).toContain("Menu will be updated.");
  expect(html).toContain("Conflict:");
  expect(html).toContain("Existing menu item will be reused if present.");
  expect(html).toContain("Depends on:");
  expect(html).toContain("permission/menus:write");
  expect(html).toContain("Execute reviewed actions");
});

test("ActionPlanReview renders read-only CMS inspection without execution controls", () => {
  const html = renderAdminUi(
    <ActionPlanReview
      plan={{
        id: "plan-cms-page-inspect",
        status: "ready",
        intentId: "cms-resource-inspect",
        title: "CMS resource inspection",
        answer: "Found one page.",
        summary: "Found 1 page candidate.",
        confidence: 0.84,
        assumptions: ["Read-only response."],
        questions: [],
        inspection: {
          kind: "resource-candidates",
          operation: "inspect",
          resourceKind: "page",
          matchStatus: "matched",
          query: "Pysiek Mysiek",
          candidates: [
            {
              kind: "page",
              id: "page-pysiek",
              label: "Pysiek Mysiek",
              slug: "/pysiek-mysiek",
              status: "draft",
              adminHref: "/admin/pages/page-pysiek",
            },
          ],
          truncated: false,
        },
        actions: [],
      }}
      preview={null}
      onPreview={() => undefined}
      onExecute={() => undefined}
    />
  );

  expect(html).toContain("LLM Guide Inspection");
  expect(html).toContain("Read-only");
  expect(html).toContain("CMS resource matches");
  expect(html).toContain("Pysiek Mysiek");
  expect(html).not.toContain("LLM Guide Plan");
  expect(html).not.toContain("Planned actions");
  expect(html).not.toContain("No changes are planned for this response.");
  expect(html).not.toContain("Dry-run changes");
  expect(html).not.toContain("Execute reviewed actions");
});

test("ActionPlanReview renders destructive and blocked resource-operation states", () => {
  const html = renderAdminUi(
    <ActionPlanReview
      plan={{
        id: "plan-delete-page",
        status: "ready",
        intentId: "page-delete",
        title: "Delete Contact",
        answer: "Plan ready",
        summary: "Delete active page.",
        confidence: 0.82,
        assumptions: ["Target was resolved from active page context."],
        questions: [],
        actions: [
          {
            id: "page-delete-contact",
            type: "page.delete",
            title: "Delete Contact",
            description: "Delete the active page after preview.",
            input: {
              id: "page-1",
              title: "Contact",
              slug: "/contact",
            },
          },
        ],
      }}
      preview={{
        plan: {
          id: "plan-delete-page",
          status: "ready",
          intentId: "page-delete",
          title: "Delete Contact",
          answer: "Plan ready",
          summary: "Delete active page.",
          confidence: 0.82,
          assumptions: [],
          questions: [],
          actions: [],
        },
        changes: [
          {
            actionId: "page-delete-contact",
            type: "page.delete",
            targetType: "page",
            targetKey: "/contact",
            operation: "delete",
            summary: "Delete page",
            warnings: ["Public page will be removed."],
            conflicts: [
              {
                code: "page_has_references",
                severity: "error",
                message: "Page is still referenced from navigation.",
              },
            ],
            dependencies: [],
          },
        ],
        warnings: ["Review public navigation before execution."],
        readyToExecute: false,
      }}
      onPreview={() => undefined}
      onExecute={() => undefined}
    />
  );

  expect(html).toContain("Destructive operation requires review");
  expect(html).toContain("Action blocked");
  expect(html).toContain("Preview warnings");
  expect(html).toContain("Review public navigation before execution.");
  expect(html).toContain("Delete");
  expect(html).toContain("Blocked");
  expect(html).toContain("Public page will be removed.");
  expect(html).toContain("Page is still referenced from navigation.");
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
            type: "page.widget.patch",
            targetType: "page",
            targetKey: "/projekty-domow/assistant-spacer",
            operation: "update",
            status: "success",
            resourceId: "page-1",
            adminHref: "/admin/pages/page-1",
            publicHref: "/projekty-domow",
            message: "Page widget block is updated.",
          },
        ],
        summary: {
          create: 0,
          update: 1,
          noop: 0,
          failed: 0,
        },
      }}
    />
  );

  expect(html).toContain("Action results");
  expect(html).toContain("Page widget");
  expect(html).toContain("Page widget block is updated.");
  expect(html).toContain("Open in admin");
  expect(html).toContain("Open public page");
});

test("ActionExecutionResult renders partial failure recovery guidance", () => {
  const html = renderAdminUi(
    <ActionExecutionResult
      result={{
        plan: {
          id: "plan-partial",
          status: "ready",
          intentId: "partial",
          title: "Partial",
          answer: "Plan ready",
          summary: "Plan summary",
          confidence: 0.9,
          assumptions: [],
          questions: [],
          actions: [],
        },
        preview: {
          plan: {
            id: "plan-partial",
            status: "ready",
            intentId: "partial",
            title: "Partial",
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
            actionId: "entry-ok",
            type: "entry.upsert-draft",
            targetType: "entry",
            targetKey: "products/sample",
            operation: "create",
            status: "success",
            resourceId: "entry-1",
            adminHref: "/admin/coderso/entries/products/entry-1",
            publicHref: null,
            message: "Draft entry is ready.",
          },
          {
            actionId: "form-failed",
            type: "form.automation.upsert",
            targetType: "form-action",
            targetKey: "form-1/action-1",
            operation: "update",
            status: "failed",
            resourceId: null,
            adminHref: null,
            publicHref: null,
            message: "Form action could not be updated.",
            errorCode: "form_action_invalid",
          },
        ],
        summary: {
          create: 1,
          update: 0,
          noop: 0,
          failed: 1,
        },
      }}
    />
  );

  expect(html).toContain("Some actions need attention");
  expect(html).toContain("action(s) succeeded");
  expect(html).toContain("action(s) failed");
  expect(html).toContain("run a fresh dry-run");
  expect(html).toContain("Form automation");
  expect(html).toContain("form_action_invalid");
  expect(html).toContain("Form action could not be updated.");
});

test("ActionExecutionResult renders archive counts and redacts secret-like messages", () => {
  const html = renderAdminUi(
    <ActionExecutionResult
      result={{
        plan: {
          id: "plan-form-archive",
          status: "ready",
          intentId: "form-archive",
          title: "Archive form",
          answer: "Plan ready",
          summary: "Archive form",
          confidence: 0.9,
          assumptions: [],
          questions: [],
          actions: [],
        },
        preview: {
          plan: {
            id: "plan-form-archive",
            status: "ready",
            intentId: "form-archive",
            title: "Archive form",
            answer: "Plan ready",
            summary: "Archive form",
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
            actionId: "form-archive",
            type: "form.archive",
            targetType: "form",
            targetKey: "lead-form",
            operation: "update",
            status: "success",
            resourceId: "form-1",
            adminHref: null,
            publicHref: null,
            message: "Archived token secret payload",
          },
        ],
        summary: {
          create: 0,
          update: 1,
          noop: 0,
          failed: 0,
        },
      }}
    />
  );

  expect(html).toContain("Action results");
  expect(html).toContain("Archive");
  expect(html).toContain("[redacted]");
  expect(html).not.toContain("token secret payload");
});
