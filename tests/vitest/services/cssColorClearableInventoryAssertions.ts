import {
  SyntaxKind,
  forEachChild,
  isBindingElement,
  isCallExpression,
  isClassDeclaration,
  isElementAccessExpression,
  isFunctionDeclaration,
  isIdentifier,
  isImportSpecifier,
  isNamespaceImport,
  isObjectLiteralExpression,
  isParameter,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isSpreadAssignment,
  isStringLiteral,
  isVariableDeclaration,
  type Expression,
  type Node,
} from "typescript";
import { expect } from "vitest";

import type { CssColorProfile } from "../../../core/services/theme/cssColorContract";
import {
  collectImportedSymbolBindings,
  coreSources,
  parseSourceText,
  propertyNameText,
  readSource,
} from "./cssColorAstInventorySupport";

type ClearableCallInventory = Readonly<{
  profile: CssColorProfile;
  calls: number;
  nested: number;
}>;

const expectedClearableCallInventory: Readonly<Record<string, ClearableCallInventory>> =
  Object.freeze({
    "core/widgets/core/accordion.tsx": {
      profile: "inherited-render",
      calls: 1,
      nested: 0,
    },
    "core/widgets/core/contact.tsx": { profile: "inherited-render", calls: 2, nested: 0 },
    "core/widgets/core/ctaBanner.tsx": { profile: "inherited-render", calls: 1, nested: 0 },
    "core/widgets/core/divider.tsx": { profile: "inherited-render", calls: 2, nested: 1 },
    "core/widgets/core/footer.tsx": { profile: "inherited-render", calls: 1, nested: 0 },
    "core/widgets/core/formEmbed.tsx": { profile: "inherited-render", calls: 15, nested: 0 },
    "core/widgets/core/galleryMosaic.tsx": {
      profile: "inherited-render",
      calls: 2,
      nested: 0,
    },
    "core/widgets/core/gridColumns.tsx": { profile: "authoring", calls: 2, nested: 0 },
    "core/widgets/core/hero.tsx": { profile: "inherited-render", calls: 18, nested: 4 },
    "core/widgets/core/navigation.tsx": {
      profile: "inherited-render",
      calls: 2,
      nested: 0,
    },
    "core/widgets/core/newsletter.tsx": { profile: "authoring", calls: 4, nested: 0 },
    "core/widgets/core/section.tsx": { profile: "inherited-render", calls: 16, nested: 4 },
    "core/widgets/core/tabs.tsx": { profile: "inherited-render", calls: 15, nested: 0 },
    "core/widgets/core/timeline.tsx": { profile: "authoring", calls: 4, nested: 0 },
    "core/widgets/core/toggleBlock.tsx": {
      profile: "inherited-render",
      calls: 1,
      nested: 0,
    },
  });

type ClearableCall = Readonly<{
  file: string;
  profile: CssColorProfile;
  nested: boolean;
  line: number;
}>;

type ClearableCallScan = Readonly<{
  calls: readonly ClearableCall[];
  issues: readonly string[];
}>;

const clearableModulePath = "core/widgets/core/clearableStyle.ts";
const clearableExportName = "resolveClearableCssColorValue";

const parseNestedClearableOption = (
  optionsArgument: Expression | undefined,
  location: string,
  issues: string[]
): boolean => {
  if (!optionsArgument) return false;
  if (!isObjectLiteralExpression(optionsArgument)) {
    issues.push(`${location}: clearable options must be an object literal`);
    return false;
  }

  let allowInherit: boolean | undefined;
  for (const property of optionsArgument.properties) {
    if (isSpreadAssignment(property)) {
      issues.push(`${location}: clearable options may not use a spread`);
      continue;
    }
    if (
      !isPropertyAssignment(property) ||
      propertyNameText(property.name) !== "allowInheritKeyword"
    ) {
      issues.push(`${location}: clearable options contain an unclassified property`);
      continue;
    }
    if (allowInherit !== undefined) {
      issues.push(`${location}: allowInheritKeyword is duplicated`);
      continue;
    }
    if (property.initializer.kind === SyntaxKind.FalseKeyword) allowInherit = false;
    else if (property.initializer.kind === SyntaxKind.TrueKeyword) allowInherit = true;
    else issues.push(`${location}: allowInheritKeyword must be a boolean literal`);
  }
  if (allowInherit === undefined) {
    issues.push(
      `${location}: explicit clearable options must classify allowInheritKeyword structurally`
    );
  }
  return allowInherit === false;
};

const scanClearableSource = (file: string, source: string): ClearableCallScan => {
  if (!source.includes(clearableExportName) && !source.includes("clearableStyle")) {
    return { calls: [], issues: [] };
  }
  const sourceFile = parseSourceText(file, source);
  const bindings = collectImportedSymbolBindings(
    sourceFile,
    file,
    clearableModulePath,
    clearableExportName
  );
  const calls: ClearableCall[] = [];
  const issues: string[] = [];
  const importedLocalNames = new Set([...bindings.named, ...bindings.namespaces]);

  const visit = (node: Node) => {
    const declaredName =
      (isVariableDeclaration(node) ||
        isBindingElement(node) ||
        isParameter(node) ||
        isFunctionDeclaration(node) ||
        isClassDeclaration(node)) &&
      node.name &&
      isIdentifier(node.name)
        ? node.name.text
        : undefined;
    if (declaredName && importedLocalNames.has(declaredName)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      issues.push(`${file}:${line}: imported clearable binding is shadowed by ${declaredName}`);
    }

    if (isIdentifier(node) && bindings.named.has(node.text)) {
      const importRole = isImportSpecifier(node.parent) && node.parent.name === node;
      const directCallRole = isCallExpression(node.parent) && node.parent.expression === node;
      if (!importRole && !directCallRole) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        issues.push(`${file}:${line}: bound clearable import escapes a direct call`);
      }
    }
    if (isIdentifier(node) && bindings.namespaces.has(node.text)) {
      const importRole = isNamespaceImport(node.parent) && node.parent.name === node;
      const member = isPropertyAccessExpression(node.parent) ? node.parent : undefined;
      const directMemberCallRole =
        member?.expression === node &&
        member.name.text === clearableExportName &&
        isCallExpression(member.parent) &&
        member.parent.expression === member;
      if (!importRole && !directMemberCallRole) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        issues.push(`${file}:${line}: bound clearable namespace escapes a direct member call`);
      }
    }

    if (isCallExpression(node)) {
      let bound = false;
      let spoofed = false;
      if (isIdentifier(node.expression)) {
        bound = bindings.named.has(node.expression.text);
        spoofed = node.expression.text === clearableExportName && !bound;
      } else if (isPropertyAccessExpression(node.expression)) {
        const receiver = node.expression.expression;
        if (node.expression.name.text === clearableExportName) {
          bound = isIdentifier(receiver) && bindings.namespaces.has(receiver.text);
          spoofed = !bound;
        }
      } else if (isElementAccessExpression(node.expression)) {
        const member = node.expression.argumentExpression;
        if (member && isStringLiteral(member) && member.text === clearableExportName) {
          spoofed = true;
        }
      }

      if (!bound && !spoofed) {
        forEachChild(node, visit);
        return;
      }

      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const location = `${file}:${line}`;
      if (spoofed) {
        issues.push(`${location}: clearable call is not bound to ${clearableModulePath}`);
        forEachChild(node, visit);
        return;
      }

      const profileArgument = node.arguments[1];
      if (
        !profileArgument ||
        !isStringLiteral(profileArgument) ||
        (profileArgument.text !== "authoring" && profileArgument.text !== "inherited-render")
      ) {
        issues.push(`${location}: clearable profile must be an explicit policy literal`);
        forEachChild(node, visit);
        return;
      }
      if (node.arguments.length > 3) {
        issues.push(`${location}: clearable call has unclassified extra arguments`);
      }
      calls.push({
        file,
        profile: profileArgument.text,
        nested: parseNestedClearableOption(node.arguments[2], location, issues),
        line,
      });
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return { calls, issues };
};

const collectClearableCalls = (file: string): ClearableCallScan =>
  scanClearableSource(file, readSource(file));

export const assertAllProductionClearableColorCallsHaveExplicitClassifiedProfile = (): void => {
  const scans = coreSources.map(collectClearableCalls);
  const calls = scans.flatMap((scan) => scan.calls);
  const issues = scans.flatMap((scan) => scan.issues);
  const actual: Record<string, Readonly<{ profile: string; calls: number; nested: number }>> = {};
  for (const file of Object.keys(expectedClearableCallInventory)) {
    const fileCalls = calls.filter((call) => call.file === file);
    const profiles = [...new Set(fileCalls.map((call) => call.profile))];
    actual[file] = {
      profile: profiles.length === 1 ? profiles[0]! : `unclassified:${profiles.join(",")}`,
      calls: fileCalls.length,
      nested: fileCalls.filter((call) => call.nested).length,
    };
  }

  expect(issues).toEqual([]);
  expect(calls).toHaveLength(86);
  expect({
    total: calls.length,
    authoring: calls.filter((call) => call.profile === "authoring").length,
    inherited: calls.filter((call) => call.profile === "inherited-render").length,
    nested: calls.filter((call) => call.nested).length,
  }).toEqual({ total: 86, authoring: 10, inherited: 76, nested: 9 });
  expect([...new Set(calls.map((call) => call.file))].sort()).toEqual(
    Object.keys(expectedClearableCallInventory).sort()
  );
  expect(actual).toEqual(expectedClearableCallInventory);
};

export const assertClearableAstBindingRejectsIndirectAliasesAndNamespaceDestructuring =
  (): void => {
    const fixturePath = "core/widgets/core/__css_color_parity_fixture__.ts";
    const direct = scanClearableSource(
      fixturePath,
      `
      import { resolveClearableCssColorValue as namedColor } from "./clearableStyle";
      import * as colorNamespace from "./clearableStyle";
      namedColor(value, "authoring");
      colorNamespace.resolveClearableCssColorValue(value, "inherited-render");
    `
    );
    expect(direct.issues).toEqual([]);
    expect(direct.calls.map(({ profile, nested }) => ({ profile, nested }))).toEqual([
      { profile: "authoring", nested: false },
      { profile: "inherited-render", nested: false },
    ]);

    const localAlias = scanClearableSource(
      fixturePath,
      `
      import { resolveClearableCssColorValue as namedColor } from "./clearableStyle";
      const escapedColor = namedColor;
    `
    );
    expect(localAlias.calls).toEqual([]);
    expect(localAlias.issues.some((issue) => issue.includes("escapes a direct call"))).toBe(true);

    const namespaceDestructure = scanClearableSource(
      fixturePath,
      `
      import * as colorNamespace from "./clearableStyle";
      const { resolveClearableCssColorValue: escapedColor } = colorNamespace;
    `
    );
    expect(namespaceDestructure.calls).toEqual([]);
    expect(
      namespaceDestructure.issues.some((issue) =>
        issue.includes("namespace escapes a direct member call")
      )
    ).toBe(true);
  };
