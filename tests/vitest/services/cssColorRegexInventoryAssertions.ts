import {
  SyntaxKind,
  canHaveModifiers,
  forEachChild,
  getModifiers,
  isBindingElement,
  isCallExpression,
  isClassDeclaration,
  isElementAccessExpression,
  isFunctionDeclaration,
  isIdentifier,
  isImportClause,
  isImportSpecifier,
  isNamespaceImport,
  isNewExpression,
  isNoSubstitutionTemplateLiteral,
  isParameter,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isRegularExpressionLiteral,
  isStringLiteral,
  isVariableDeclaration,
  isVariableStatement,
  type Expression,
  type Node,
  type SourceFile,
} from "typescript";
import { expect } from "vitest";

import { normalizeAdminColorValue } from "../../../core/admin/ui/shared/colorValue";
import {
  authoringColorTokenNames,
  isAuthoringColorToken,
} from "../../../core/services/pages/pageAuthoringSanitizers";
import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";
import {
  CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH,
  CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN,
  parseCtaBannerBackgroundGradient,
} from "../../../core/widgets/core/ctaBanner";
import { HERO_BACKGROUND_GRADIENT_MAX_LENGTH } from "../../../core/widgets/core/hero";
import {
  collectImportedSymbolBindings,
  coreSources,
  parseSourceFile,
  parseSourceText,
  propertyNameText,
  readSource,
} from "./cssColorAstInventorySupport";

type RegexInventory = Readonly<{ literals: number; constructors: number }>;

const expectedRegexInventory: Readonly<Record<string, RegexInventory>> = Object.freeze({
  "core/admin/ui/forms/FormDesignPanel.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/AccordionEditors.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/ContactEditors.tsx": { literals: 1, constructors: 0 },
  "core/admin/ui/widgets/editors/CtaBannerEditors.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/DividerEditors.tsx": { literals: 2, constructors: 0 },
  "core/admin/ui/widgets/editors/FooterEditors.tsx": { literals: 7, constructors: 0 },
  "core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx": { literals: 1, constructors: 0 },
  "core/admin/ui/widgets/editors/HeroEditors.tsx": { literals: 3, constructors: 0 },
  "core/admin/ui/widgets/editors/NavigationEditors.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/SectionEditors.tsx": { literals: 1, constructors: 0 },
  "core/admin/ui/widgets/editors/TabsEditors.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/ToggleBlockEditors.tsx": { literals: 0, constructors: 0 },
  "core/services/forms/formSettings.ts": { literals: 0, constructors: 0 },
  "core/services/forms/formTheme.ts": { literals: 0, constructors: 0 },
  "core/widgets/core/accordion.tsx": { literals: 2, constructors: 0 },
  "core/widgets/core/clearableStyle.ts": { literals: 0, constructors: 0 },
  "core/widgets/core/contact.tsx": { literals: 11, constructors: 0 },
  "core/widgets/core/ctaBanner.tsx": { literals: 0, constructors: 1 },
  "core/widgets/core/divider.tsx": { literals: 3, constructors: 0 },
  "core/widgets/core/footer.tsx": { literals: 5, constructors: 0 },
  "core/widgets/core/formEmbed.tsx": { literals: 1, constructors: 0 },
  "core/widgets/core/galleryMosaic.tsx": { literals: 0, constructors: 0 },
  "core/widgets/core/gridColumns.tsx": { literals: 0, constructors: 0 },
  "core/widgets/core/hero.tsx": { literals: 2, constructors: 0 },
  "core/widgets/core/navigation.tsx": { literals: 2, constructors: 0 },
  "core/widgets/core/newsletter.tsx": { literals: 11, constructors: 0 },
  "core/widgets/core/section.tsx": { literals: 7, constructors: 0 },
  "core/widgets/core/tabs.tsx": { literals: 0, constructors: 0 },
  "core/widgets/core/timeline.tsx": { literals: 3, constructors: 0 },
  "core/widgets/core/toggleBlock.tsx": { literals: 1, constructors: 0 },
});

type RegexConstruction = Readonly<{
  file: string;
  kind: "literal" | "constructor";
  pattern: string;
  flags: string;
  argumentBinding?: string;
  functionOwner?: string;
  variableOwner?: string;
  line: number;
}>;

type RegexScan = Readonly<{
  records: readonly RegexConstruction[];
  issues: readonly string[];
}>;

const readRegexLiteral = (
  text: string
): Readonly<{ pattern: string; flags: string }> | undefined => {
  const match = /^\/([\s\S]*)\/([a-z]*)$/.exec(text);
  return match ? { pattern: match[1]!, flags: match[2]! } : undefined;
};

const enclosingFunctionName = (node: Node): string | undefined => {
  let current = node.parent;
  while (current) {
    if (isFunctionDeclaration(current) && current.name) return current.name.text;
    current = current.parent;
  }
  return undefined;
};

const enclosingVariableName = (node: Node): string | undefined => {
  let current = node.parent;
  while (current) {
    if (isVariableDeclaration(current) && isIdentifier(current.name)) return current.name.text;
    if (isFunctionDeclaration(current)) return undefined;
    current = current.parent;
  }
  return undefined;
};

const topLevelStringConstants = (sourceFile: SourceFile): ReadonlyMap<string, string> => {
  const constants = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        isIdentifier(declaration.name) &&
        declaration.initializer &&
        (isStringLiteral(declaration.initializer) ||
          isNoSubstitutionTemplateLiteral(declaration.initializer))
      ) {
        constants.set(declaration.name.text, declaration.initializer.text);
      }
    }
  }
  return constants;
};

const staticRegexArgument = (
  argument: Expression | undefined,
  constants: ReadonlyMap<string, string>
): Readonly<{ value: string; binding?: string }> | undefined => {
  if (!argument) return undefined;
  if (isStringLiteral(argument) || isNoSubstitutionTemplateLiteral(argument)) {
    return { value: argument.text };
  }
  if (isIdentifier(argument)) {
    const value = constants.get(argument.text);
    return value === undefined ? undefined : { value, binding: argument.text };
  }
  return undefined;
};

const localValueBindingLines = (sourceFile: SourceFile, bindingName: string): readonly number[] => {
  const lines: number[] = [];
  const visit = (node: Node) => {
    const declarationName =
      (isVariableDeclaration(node) ||
        isBindingElement(node) ||
        isParameter(node) ||
        isFunctionDeclaration(node) ||
        isClassDeclaration(node)) &&
      node.name &&
      isIdentifier(node.name)
        ? node.name.text
        : undefined;
    const importName =
      (isImportSpecifier(node) || isNamespaceImport(node)) && isIdentifier(node.name)
        ? node.name.text
        : isImportClause(node) && node.name
          ? node.name.text
          : undefined;
    if (declarationName === bindingName || importName === bindingName) {
      lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return lines;
};

const globalRegExpReceivers = new Set(["globalThis", "window", "self"]);

const regExpMemberReceiver = (expression: Expression): string | undefined => {
  if (
    isPropertyAccessExpression(expression) &&
    expression.name.text === "RegExp" &&
    isIdentifier(expression.expression)
  ) {
    return expression.expression.text;
  }
  if (
    isElementAccessExpression(expression) &&
    expression.argumentExpression &&
    isStringLiteral(expression.argumentExpression) &&
    expression.argumentExpression.text === "RegExp" &&
    isIdentifier(expression.expression)
  ) {
    return expression.expression.text;
  }
  return undefined;
};

const isRegExpMemberReference = (node: Node): node is Expression =>
  (isPropertyAccessExpression(node) && node.name.text === "RegExp") ||
  (isElementAccessExpression(node) &&
    Boolean(
      node.argumentExpression &&
      isStringLiteral(node.argumentExpression) &&
      node.argumentExpression.text === "RegExp"
    ));

const isDirectInvocationCallee = (node: Node): boolean =>
  (isCallExpression(node.parent) || isNewExpression(node.parent)) &&
  node.parent.expression === node;

const scanRegexSource = (file: string, source: string): RegexScan => {
  const sourceFile = parseSourceText(file, source);
  const constants = topLevelStringConstants(sourceFile);
  const localRegExpBindings = localValueBindingLines(sourceFile, "RegExp");
  const shadowedGlobalReceivers = new Map(
    [...globalRegExpReceivers].map((receiver) => [
      receiver,
      localValueBindingLines(sourceFile, receiver),
    ])
  );
  const records: RegexConstruction[] = [];
  const issues = localRegExpBindings.map(
    (line) => `${file}:${line}: local RegExp value binding shadows the global constructor`
  );
  const visit = (node: Node) => {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    if (isRegularExpressionLiteral(node)) {
      const parsed = readRegexLiteral(node.text);
      if (!parsed) issues.push(`${file}:${line}: regex literal could not be inventoried`);
      else {
        records.push({
          file,
          kind: "literal",
          ...parsed,
          functionOwner: enclosingFunctionName(node),
          variableOwner: enclosingVariableName(node),
          line,
        });
      }
    }

    if (isRegExpMemberReference(node)) {
      const receiver = regExpMemberReceiver(node);
      const directGlobalCall =
        receiver !== undefined &&
        globalRegExpReceivers.has(receiver) &&
        shadowedGlobalReceivers.get(receiver)?.length === 0 &&
        isDirectInvocationCallee(node);
      if (!directGlobalCall) {
        issues.push(
          `${file}:${line}: ${receiver ?? "unknown"}.RegExp escapes a direct global call`
        );
      }
    }

    if (isIdentifier(node) && node.text === "RegExp") {
      const memberNameRole = isPropertyAccessExpression(node.parent) && node.parent.name === node;
      const declarationRole =
        ((isVariableDeclaration(node.parent) ||
          isParameter(node.parent) ||
          isFunctionDeclaration(node.parent) ||
          isClassDeclaration(node.parent)) &&
          node.parent.name === node) ||
        ((isImportSpecifier(node.parent) || isNamespaceImport(node.parent)) &&
          node.parent.name === node) ||
        (isImportClause(node.parent) && node.parent.name === node);
      const directGlobalCall = localRegExpBindings.length === 0 && isDirectInvocationCallee(node);
      if (!memberNameRole && !declarationRole && !directGlobalCall) {
        issues.push(`${file}:${line}: RegExp identifier escapes a direct global call`);
      }
    }

    if (isNewExpression(node) || isCallExpression(node)) {
      const identifierCallee = isIdentifier(node.expression) && node.expression.text === "RegExp";
      const memberReceiver = regExpMemberReceiver(node.expression);
      const globalMemberCallee =
        memberReceiver !== undefined &&
        globalRegExpReceivers.has(memberReceiver) &&
        shadowedGlobalReceivers.get(memberReceiver)?.length === 0;
      if ((identifierCallee && localRegExpBindings.length === 0) || globalMemberCallee) {
        const pattern = staticRegexArgument(node.arguments?.[0], constants);
        const flags = staticRegexArgument(node.arguments?.[1], constants);
        if (!pattern || (node.arguments && node.arguments.length > 1 && !flags)) {
          issues.push(
            `${file}:${line}: RegExp constructor must use statically inventoried strings`
          );
        } else {
          records.push({
            file,
            kind: "constructor",
            pattern: pattern.value,
            flags: flags?.value ?? "",
            argumentBinding: pattern.binding,
            functionOwner: enclosingFunctionName(node),
            variableOwner: enclosingVariableName(node),
            line,
          });
        }
      } else if (identifierCallee || memberReceiver !== undefined) {
        issues.push(`${file}:${line}: RegExp call is not bound to a direct global constructor`);
      }
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return { records, issues };
};

const collectRegexConstructions = (file: string): RegexScan =>
  scanRegexSource(file, readSource(file));

const regexMatchesWhole = (record: RegexConstruction, value: string): boolean => {
  const match = new RegExp(record.pattern, record.flags).exec(value);
  return match?.[0] === value;
};

const simpleColorProbePairs = [
  ["#abc", "#ab"],
  ["#11223380", "#112233800"],
  ["rgb(1,2,3)", "rgb(1,2)"],
  ["rgba(1,2,3,.5)", "rgba(1,2,3,2)"],
  ["hsl(210,50%,40%)", "hsl(210,50,40%)"],
  ["hsla(210,50%,40%,.5)", "hsla(210,50%,40%,2)"],
] as const;

const compositeProbePairs = [
  ["linear-gradient(1deg, #abc, #def)", "radial-gradient(1deg, #abc, #def)"],
  ["1deg", "+1deg"],
] as const;

const recognizesProbeGrammar = (
  record: RegexConstruction,
  probes: readonly (readonly [string, string])[]
): boolean =>
  probes.some(
    ([valid, malformed]) =>
      regexMatchesWhole(record, valid) && !regexMatchesWhole(record, malformed)
  );

export const assertRegexAstInventoryHasNoCopiedSimpleColorGrammar = (): void => {
  const scans = Object.keys(expectedRegexInventory).map(collectRegexConstructions);
  const records = scans.flatMap((scan) => scan.records);
  const issues = scans.flatMap((scan) => scan.issues);
  const actual: Record<string, RegexInventory> = {};
  for (const file of Object.keys(expectedRegexInventory)) {
    const fileRecords = records.filter((record) => record.file === file);
    actual[file] = {
      literals: fileRecords.filter((record) => record.kind === "literal").length,
      constructors: fileRecords.filter((record) => record.kind === "constructor").length,
    };
  }

  expect(issues).toEqual([]);
  expect(records).toHaveLength(64);
  expect(actual).toEqual(expectedRegexInventory);
  expect(records.filter((record) => recognizesProbeGrammar(record, simpleColorProbePairs))).toEqual(
    []
  );

  const compositeRecords = records
    .filter(
      (record) =>
        recognizesProbeGrammar(record, [compositeProbePairs[0]!]) ||
        (record.functionOwner === "normalizeHeroBackgroundGradient" &&
          recognizesProbeGrammar(record, [compositeProbePairs[1]!]))
    )
    .map(({ file, kind, pattern, flags, argumentBinding, functionOwner, variableOwner }) => ({
      file,
      kind,
      pattern,
      flags,
      argumentBinding,
      functionOwner,
      variableOwner,
    }));
  expect(compositeRecords).toEqual([
    {
      file: "core/widgets/core/ctaBanner.tsx",
      kind: "constructor",
      pattern: CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN,
      flags: "",
      argumentBinding: "CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN",
      functionOwner: undefined,
      variableOwner: "ctaBannerBackgroundGradientPattern",
    },
    {
      file: "core/widgets/core/hero.tsx",
      kind: "literal",
      pattern: "^[lL][iI][nN][eE][aA][rR]-[gG][rR][aA][dD][iI][eE][nN][tT]\\((.*)\\)$",
      flags: "",
      argumentBinding: undefined,
      functionOwner: "normalizeHeroBackgroundGradient",
      variableOwner: "match",
    },
    {
      file: "core/widgets/core/hero.tsx",
      kind: "literal",
      pattern: "^[ ]*([0-9]+)[dD][eE][gG][ ]*$",
      flags: "",
      argumentBinding: undefined,
      functionOwner: "normalizeHeroBackgroundGradient",
      variableOwner: "angleMatch",
    },
  ]);

  expect(
    records.filter((record) => record.file === "core/admin/ui/widgets/editors/CtaBannerEditors.tsx")
  ).toEqual([]);
};

export const assertRegexAstInventoryRejectsConstructorEscapesAndInventoriesDirectGlobalMembers =
  (): void => {
    const fixturePath = "core/widgets/core/__css_color_regex_fixture__.ts";
    const directGlobals = scanRegexSource(
      fixturePath,
      `
      const first = new globalThis.RegExp("^first$");
      const second = window.RegExp("^second$");
      const third = new self["RegExp"]("^third$");
    `
    );
    expect(directGlobals.issues).toEqual([]);
    expect(directGlobals.records.map(({ kind, pattern }) => ({ kind, pattern }))).toEqual([
      { kind: "constructor", pattern: "^first$" },
      { kind: "constructor", pattern: "^second$" },
      { kind: "constructor", pattern: "^third$" },
    ]);

    const identifierAlias = scanRegexSource(
      fixturePath,
      `
      const ColorRegExp = RegExp;
      ColorRegExp("^color$");
    `
    );
    expect(identifierAlias.records).toEqual([]);
    expect(identifierAlias.issues.some((issue) => issue.includes("identifier escapes"))).toBe(true);

    const extractedMember = scanRegexSource(
      fixturePath,
      `
      const ExtractedRegExp = globalThis.RegExp;
      ExtractedRegExp("^extracted$");
    `
    );
    expect(extractedMember.records).toEqual([]);
    expect(
      extractedMember.issues.some((issue) => issue.includes("escapes a direct global call"))
    ).toBe(true);

    const destructuredMember = scanRegexSource(
      fixturePath,
      `
      const { RegExp: ExtractedRegExp } = globalThis;
    `
    );
    expect(destructuredMember.records).toEqual([]);
    expect(destructuredMember.issues.some((issue) => issue.includes("identifier escapes"))).toBe(
      true
    );

    const unknownReceiver = scanRegexSource(
      fixturePath,
      `
      tools.RegExp("^unknown$");
    `
    );
    expect(unknownReceiver.records).toEqual([]);
    expect(unknownReceiver.issues.some((issue) => issue.includes("not bound"))).toBe(true);

    const shadowedGlobalReceiver = scanRegexSource(
      fixturePath,
      `
      const window = { "RegExp": (pattern) => pattern };
      window.RegExp("^shadowed-window$");
    `
    );
    expect(shadowedGlobalReceiver.records).toEqual([]);
    expect(
      shadowedGlobalReceiver.issues.some((issue) => issue.includes("escapes a direct global call"))
    ).toBe(true);

    const localShadow = scanRegexSource(
      fixturePath,
      `
      const RegExp = (pattern) => pattern;
      RegExp("^shadow$");
    `
    );
    expect(localShadow.records).toEqual([]);
    expect(localShadow.issues.some((issue) => issue.includes("shadows the global"))).toBe(true);
  };

type ValueDeclarationInventory = Readonly<{
  file: string;
  kind: "function" | "variable";
  exported: boolean;
}>;

const hasExportKeyword = (node: Node): boolean =>
  canHaveModifiers(node) &&
  Boolean(getModifiers(node)?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword));

const collectValueDeclarations = (file: string, name: string): ValueDeclarationInventory[] => {
  const sourceFile = parseSourceFile(file);
  const declarations: ValueDeclarationInventory[] = [];
  const visit = (node: Node) => {
    if (isFunctionDeclaration(node) && node.name?.text === name) {
      declarations.push({ file, kind: "function", exported: hasExportKeyword(node) });
    } else if (isVariableDeclaration(node) && isIdentifier(node.name) && node.name.text === name) {
      let statement: Node | undefined = node.parent;
      while (statement && !isVariableStatement(statement)) statement = statement.parent;
      declarations.push({
        file,
        kind: "variable",
        exported: statement ? hasExportKeyword(statement) : false,
      });
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return declarations;
};

type BoundCallScan = Readonly<{
  calls: readonly Readonly<{ file: string; line: number }>[];
  imports: readonly Readonly<{ file: string; kind: "named" | "namespace" }>[];
  issues: readonly string[];
}>;

const collectBoundModuleCalls = (
  modulePath: string,
  exportName: string,
  ownerPath: string
): BoundCallScan => {
  const calls: Array<Readonly<{ file: string; line: number }>> = [];
  const imports: Array<Readonly<{ file: string; kind: "named" | "namespace" }>> = [];
  const issues: string[] = [];

  for (const file of coreSources) {
    const source = readSource(file);
    if (
      !source.includes(exportName) &&
      !source.includes(
        modulePath
          .split("/")
          .at(-1)!
          .replace(/\.tsx?$/, "")
      )
    ) {
      continue;
    }
    const sourceFile = parseSourceFile(file);
    const bindings = collectImportedSymbolBindings(sourceFile, file, modulePath, exportName);
    for (const _localName of bindings.named) imports.push({ file, kind: "named" });
    for (const _localName of bindings.namespaces) imports.push({ file, kind: "namespace" });
    const importedLocalNames = new Set([...bindings.named, ...bindings.namespaces]);

    const visit = (node: Node) => {
      const declaredName =
        (isVariableDeclaration(node) ||
          isParameter(node) ||
          isFunctionDeclaration(node) ||
          isClassDeclaration(node)) &&
        node.name &&
        isIdentifier(node.name)
          ? node.name.text
          : undefined;
      if (declaredName && importedLocalNames.has(declaredName)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        issues.push(`${file}:${line}: imported ${exportName} binding is shadowed`);
      }

      if (isIdentifier(node)) {
        const isOwnerDeclaration =
          file === ownerPath &&
          node.text === exportName &&
          isFunctionDeclaration(node.parent) &&
          node.parent.name === node;
        const isImportRole =
          isImportSpecifier(node.parent) &&
          (node.parent.name === node || node.parent.propertyName === node);
        const isNamedCallRole =
          isCallExpression(node.parent) &&
          node.parent.expression === node &&
          (bindings.named.has(node.text) || (file === ownerPath && node.text === exportName));
        const isNamespaceReceiverRole =
          (isPropertyAccessExpression(node.parent) || isElementAccessExpression(node.parent)) &&
          node.parent.expression === node &&
          isCallExpression(node.parent.parent) &&
          node.parent.parent.expression === node.parent;
        const isNamespaceMemberRole =
          isPropertyAccessExpression(node.parent) &&
          node.parent.name === node &&
          node.text === exportName &&
          isIdentifier(node.parent.expression) &&
          bindings.namespaces.has(node.parent.expression.text) &&
          isCallExpression(node.parent.parent) &&
          node.parent.parent.expression === node.parent;
        const isRelevantIdentifier =
          node.text === exportName ||
          bindings.named.has(node.text) ||
          bindings.namespaces.has(node.text);
        if (
          isRelevantIdentifier &&
          !isOwnerDeclaration &&
          !isImportRole &&
          !isNamedCallRole &&
          !isNamespaceReceiverRole &&
          !isNamespaceMemberRole &&
          !(isNamespaceImport(node.parent) && node.parent.name === node)
        ) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          issues.push(`${file}:${line}: ${exportName} has an unclassified reference role`);
        }
      }

      if (isCallExpression(node)) {
        let bound = false;
        let spoofed = false;
        if (isIdentifier(node.expression)) {
          bound =
            bindings.named.has(node.expression.text) ||
            (file === ownerPath && node.expression.text === exportName);
          spoofed = node.expression.text === exportName && !bound;
        } else if (isPropertyAccessExpression(node.expression)) {
          if (node.expression.name.text === exportName) {
            bound =
              isIdentifier(node.expression.expression) &&
              bindings.namespaces.has(node.expression.expression.text);
            spoofed = !bound;
          }
        } else if (isElementAccessExpression(node.expression)) {
          const member = node.expression.argumentExpression;
          if (member && isStringLiteral(member) && member.text === exportName) {
            spoofed = true;
          }
        }
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        if (spoofed) issues.push(`${file}:${line}: ${exportName} call is not module-bound`);
        if (bound) calls.push({ file, line });
      }
      forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return { calls, imports, issues };
};

const collectExactIdentifierRoles = (file: string, name: string): string[] => {
  const sourceFile = parseSourceFile(file);
  const roles: string[] = [];
  const visit = (node: Node) => {
    if (isIdentifier(node) && node.text === name) {
      if (isVariableDeclaration(node.parent) && node.parent.name === node)
        roles.push("declaration");
      else if (
        (isNewExpression(node.parent) || isCallExpression(node.parent)) &&
        node.parent.arguments?.[0] === node &&
        isIdentifier(node.parent.expression) &&
        node.parent.expression.text === "RegExp"
      ) {
        roles.push("regexp-argument");
      } else if (
        isPropertyAssignment(node.parent) &&
        node.parent.initializer === node &&
        propertyNameText(node.parent.name) === "pattern"
      ) {
        roles.push("schema-pattern");
      } else roles.push("unclassified");
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return roles.sort();
};

type ExternalSymbolUseInventory = Readonly<{
  importedFiles: readonly string[];
  references: readonly string[];
}>;

const collectExternalModuleSymbolUses = (
  modulePath: string,
  exportName: string,
  ownerPath: string
): ExternalSymbolUseInventory => {
  const importedFiles = new Set<string>();
  const references: string[] = [];
  const moduleStem = modulePath
    .split("/")
    .at(-1)!
    .replace(/\.tsx?$/, "");
  for (const file of coreSources) {
    if (file === ownerPath) continue;
    const source = readSource(file);
    if (!source.includes(exportName) && !source.includes(moduleStem)) continue;
    const sourceFile = parseSourceFile(file);
    const bindings = collectImportedSymbolBindings(sourceFile, file, modulePath, exportName);
    if (bindings.named.size > 0 || bindings.namespaces.size > 0) importedFiles.add(file);

    const visit = (node: Node) => {
      if (isIdentifier(node)) {
        const importRole =
          isImportSpecifier(node.parent) &&
          (node.parent.name === node || node.parent.propertyName === node);
        if (!importRole && (node.text === exportName || bindings.named.has(node.text))) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          references.push(`${file}:${line}`);
        }
      } else if (
        isStringLiteral(node) &&
        node.text === exportName &&
        isElementAccessExpression(node.parent) &&
        node.parent.argumentExpression === node
      ) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        references.push(`${file}:${line}`);
      }
      forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return { importedFiles: [...importedFiles].sort(), references: references.sort() };
};

export const assertCtaCompositeSymbolsHaveOneProductionOwnerAndOnlyBoundReuse = (): void => {
  const ownerPath = "core/widgets/core/ctaBanner.tsx";
  const editorPath = "core/admin/ui/widgets/editors/CtaBannerEditors.tsx";
  const schemaExportName = "CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN";
  const parserExportName = "parseCtaBannerBackgroundGradient";

  const schemaDeclarations = coreSources.flatMap((file) =>
    readSource(file).includes(schemaExportName)
      ? collectValueDeclarations(file, schemaExportName)
      : []
  );
  const parserDeclarations = coreSources.flatMap((file) =>
    readSource(file).includes(parserExportName)
      ? collectValueDeclarations(file, parserExportName)
      : []
  );
  expect(schemaDeclarations).toEqual([{ file: ownerPath, kind: "variable", exported: true }]);
  expect(parserDeclarations).toEqual([{ file: ownerPath, kind: "function", exported: true }]);
  expect(collectExactIdentifierRoles(ownerPath, schemaExportName)).toEqual([
    "declaration",
    "regexp-argument",
    "schema-pattern",
  ]);
  expect(collectExternalModuleSymbolUses(ownerPath, schemaExportName, ownerPath)).toEqual({
    importedFiles: [],
    references: [],
  });

  const parserScan = collectBoundModuleCalls(ownerPath, parserExportName, ownerPath);
  expect(parserScan.issues).toEqual([]);
  expect(parserScan.imports).toEqual([{ file: editorPath, kind: "named" }]);
  expect(parserScan.calls).toHaveLength(5);
  expect(
    Object.fromEntries(
      [ownerPath, editorPath].map((file) => [
        file,
        parserScan.calls.filter((call) => call.file === file).length,
      ])
    )
  ).toEqual({ [ownerPath]: 2, [editorPath]: 3 });

  expect(CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH).toBe(96);
  expect(HERO_BACKGROUND_GRADIENT_MAX_LENGTH).toBe(320);
  expect(HERO_BACKGROUND_GRADIENT_MAX_LENGTH).toBe(CSS_COLOR_VALUE_MAX_LENGTH * 2 + 64);

  const terminal = "linear-gradient(-1.5deg, #abcde, #ABCDEF7)";
  const exactCap = `${" ".repeat(
    CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH - terminal.length
  )}${terminal}`;
  const capPlusOne = ` ${exactCap}`;
  expect(exactCap).toHaveLength(CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH);
  expect(capPlusOne).toHaveLength(CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH + 1);
  expect(new RegExp(CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN).test(exactCap)).toBe(true);
  expect(parseCtaBannerBackgroundGradient(exactCap)?.normalized).toBe(terminal);
  expect(parseCtaBannerBackgroundGradient(capPlusOne)).toBeUndefined();
};

export const assertPageKeepsExactOrderedSevenTokenCompatibilityGate = (): void => {
  const expectedPageTokens = [
    "primary",
    "secondary",
    "accent",
    "bg",
    "surface",
    "text",
    "border",
  ] as const;
  expect(authoringColorTokenNames).toEqual(expectedPageTokens);
  for (const token of expectedPageTokens) {
    expect(isAuthoringColorToken(`var(--color-${token})`), token).toBe(true);
  }

  const sharedButNotPageToken = "var(--color-extra)";
  expect(normalizeAdminColorValue(sharedButNotPageToken)).toBe(sharedButNotPageToken);
  expect(isAuthoringColorToken(sharedButNotPageToken)).toBe(false);
};
