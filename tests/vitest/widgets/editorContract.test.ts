import type { ComponentType } from "react";
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
});
