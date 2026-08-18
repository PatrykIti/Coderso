import { expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
  createSourceFile,
  forEachChild,
  isArrowFunction,
  isCallExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isMethodDeclaration,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isVariableDeclaration,
  type CallExpression,
  type Node,
  type SourceFile,
} from "typescript";

import { FULL_SITE_PACKAGE_SETTING_KEYS } from "../../../core/services/kits/fullSitePackage/types";

type DmlDisposition = "adjacent-reviewed" | "l01-l03-foreign" | "managed-shared";

type ReviewedDmlGroup = Readonly<{
  path: string;
  disposition: DmlDisposition;
  entries: readonly string[];
}>;

const root = path.resolve(import.meta.dir, "../../..");

const protectedTables = new Set([
  "adminThemeProfiles",
  "adminThemeTemplates",
  "contentEntries",
  "contentRevisions",
  "contentTaxonomies",
  "contentTermAssignments",
  "contentTerms",
  "contentTypes",
  "customScreenEntryPresentationOverrides",
  "customScreens",
  "detailPageDocuments",
  "detailPageRevisions",
  "formActionRuns",
  "formActions",
  "formFields",
  "formSubmissions",
  "forms",
  "listingQueries",
  "listingTemplates",
  "menuItems",
  "menus",
  "pageRevisions",
  "pageTemplates",
  "pages",
  "previewTokens",
  "redirects",
  "settings",
  "themeProfiles",
  "themeRoutes",
  "users",
]);

function walkSources(relativeDirectory: string): readonly string[] {
  const output: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const relativePath = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) visit(relativePath);
      else if (/\.tsx?$/u.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        output.push(relativePath);
      }
    }
  };
  visit(relativeDirectory);
  return Object.freeze(output.sort());
}

const productionPaths = walkSources("core");
const sourceCache = new Map<string, string>();
const astCache = new Map<string, SourceFile>();

function readSource(relativePath: string): string {
  const cached = sourceCache.get(relativePath);
  if (cached !== undefined) return cached;
  const source = readFileSync(path.join(root, relativePath), "utf8");
  sourceCache.set(relativePath, source);
  return source;
}

function readAst(relativePath: string): SourceFile {
  const cached = astCache.get(relativePath);
  if (cached) return cached;
  const ast = createSourceFile(
    relativePath,
    readSource(relativePath),
    ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ScriptKind.TSX : ScriptKind.TS
  );
  astCache.set(relativePath, ast);
  return ast;
}

function declaredFunctionName(node: Node): string | null {
  if ((isFunctionDeclaration(node) || isMethodDeclaration(node)) && node.name) {
    return node.name.getText();
  }
  if ((isArrowFunction(node) || isFunctionExpression(node)) && isVariableDeclaration(node.parent)) {
    return isIdentifier(node.parent.name) ? node.parent.name.text : null;
  }
  if ((isArrowFunction(node) || isFunctionExpression(node)) && isPropertyAssignment(node.parent)) {
    return node.parent.name.getText();
  }
  return null;
}

function targetName(node: Node | undefined): string | null {
  if (!node) return null;
  if (isIdentifier(node)) return node.text;
  if (isPropertyAccessExpression(node)) return node.name.text;
  if (node.kind === SyntaxKind.ParenthesizedExpression || node.kind === SyntaxKind.AsExpression) {
    return targetName((node as Node & { readonly expression?: Node }).expression);
  }
  return null;
}

function collectProtectedDml(): readonly string[] {
  const found: string[] = [];
  for (const relativePath of productionPaths) {
    const ast = readAst(relativePath);
    const visit = (node: Node, scopes: readonly string[]): void => {
      const ownName = declaredFunctionName(node);
      const nextScopes = ownName ? [...scopes, ownName] : scopes;
      if (isCallExpression(node) && isPropertyAccessExpression(node.expression)) {
        const operation = node.expression.name.text;
        if (operation === "insert" || operation === "update" || operation === "delete") {
          const target = targetName(node.arguments[0]);
          if (target && (protectedTables.has(target) || target === "table")) {
            found.push(
              `${relativePath}|${nextScopes.join(">") || "<module>"}|${operation}|${target}@${node.expression.expression.getText(ast)}`
            );
          }
        } else if (operation === "execute") {
          const query = node.arguments[0]?.getText(ast) ?? "";
          if (/\block\s+table\b/iu.test(query) && /\bsettings\b/u.test(query)) {
            found.push(
              `${relativePath}|${nextScopes.join(">") || "<module>"}|raw-lock|settings@${node.expression.expression.getText(ast)}`
            );
          }
        }
      }
      forEachChild(node, (child) => visit(child, nextScopes));
    };
    visit(ast, []);
  }
  return Object.freeze(found.sort());
}

function parseReviewedDml(raw: string): readonly ReviewedDmlGroup[] {
  return Object.freeze(
    raw
      .trim()
      .split("\n")
      .map((line) => {
        const [disposition, path, entries, unexpected] = line.split("~");
        if (unexpected || !disposition || !path || !entries)
          throw new Error("invalid_reviewed_dml");
        return Object.freeze({
          path,
          disposition: disposition as DmlDisposition,
          entries: Object.freeze(entries.split(";")),
        });
      })
  );
}

const reviewedDml = parseReviewedDml(`
adjacent-reviewed~core/db/seed.ts~createDbAdminThemeSeedStore>insertProfile|insert|adminThemeProfiles;createDbAdminThemeSeedStore>insertTemplate|insert|adminThemeTemplates;seedAdmin|insert|users
adjacent-reviewed~core/server/startupAssistantDocs.ts~writeStartupAssistantDocsState|insert|settings
adjacent-reviewed~core/services/admin/firstRunService.ts~createFirstAdmin|insert|users
adjacent-reviewed~core/services/admin/usersService.ts~createUser|insert|users;disableUser|update|users;enableUser|update|users;updateUser|update|users
managed-shared~core/services/admin/usersService.ts~deleteUser|delete|users
adjacent-reviewed~core/services/adminThemes/adminThemeProfileService.ts~activateAdminThemeProfile|update|adminThemeProfiles;activateAdminThemeProfile|update|adminThemeProfiles;createAdminThemeProfile|insert|adminThemeProfiles;createAdminThemeProfile|insert|adminThemeProfiles;createAdminThemeProfile|update|adminThemeProfiles;updateAdminThemeProfile|update|adminThemeProfiles
adjacent-reviewed~core/services/adminThemes/adminThemeTemplateService.ts~createAdminThemeTemplate|insert|adminThemeTemplates;deleteAdminThemeTemplate|delete|adminThemeTemplates;updateAdminThemeTemplate|update|adminThemeTemplates
adjacent-reviewed~core/services/auth/userService.ts~getUserByEmail|update|users;updateLastLogin|update|users;updatePassword|update|users
managed-shared~core/services/backups/backupImport.ts~restoreArchiveStreamTx|delete|table;restoreArchiveStreamTx|insert|table
managed-shared~core/services/backups/backupRestore.ts~replaceSnapshotTables|delete|table;replaceSnapshotTables|insert|table
managed-shared~core/services/backups/backupUsersSection.ts~restoreUsersSectionTx|insert|users
managed-shared~core/services/content/detailPageDocumentLifecycleMutation.ts~mutateDetailPageDocumentLifecycleAtomic|delete|detailPageDocuments;mutateDetailPageDocumentLifecycleAtomic|insert|detailPageDocuments;mutateDetailPageDocumentLifecycleAtomic|update|detailPageDocuments;writeRevisionsTx|delete|detailPageRevisions;writeRevisionsTx|insert|detailPageRevisions
managed-shared~core/services/content/detailPageDocumentService.ts~createDetailPageRevisionTx|insert|detailPageRevisions;createOrReplaceDetailPageAutosaveRevisionTx|delete|detailPageRevisions;createOrReplaceDetailPageAutosaveRevisionTx|delete|detailPageRevisions;deleteDetailPageDocument|delete|detailPageDocuments;issueDetailPagePreview|insert|previewTokens;persistDetailPageDocument|insert|detailPageDocuments;persistDetailPageDocument|update|detailPageDocuments;publishDetailPageDocument|update|detailPageDocuments;unpublishDetailPageDocument|update|detailPageDocuments
managed-shared~core/services/content/detailPageRevisionService.ts~discardDetailPageAutosaveRevision|delete|detailPageRevisions;restoreDetailPageRevision|update|detailPageDocuments
managed-shared~core/services/content/entryDuplicationService.ts~duplicateEntry|insert|contentEntries;duplicateEntry|insert|contentTermAssignments
managed-shared~core/services/content/entryLifecycleMutationService.ts~mutateEntryLifecycleAtomic|delete|contentEntries;mutateEntryLifecycleAtomic|insert|contentEntries;mutateEntryLifecycleAtomic|update|contentEntries;writeRevisionsTx|delete|contentRevisions;writeRevisionsTx|insert|contentRevisions
managed-shared~core/services/content/entryService.ts~createEntryPreview|insert|previewTokens;createEntryRevisionTx|insert|contentRevisions;createEntry|insert|contentEntries;deleteEntry|delete|contentEntries;restoreEntryRevision|update|contentEntries;unpublishEntry|update|contentEntries;updateEntry|update|contentEntries;writeEntryMetadataTx|update|contentEntries;writeEntryStatusTx|update|contentEntries
managed-shared~core/services/content/listingQueriesService.ts~createListingQuery|insert|listingQueries;deleteListingQuery|delete|listingQueries;mutateListingQueryAtomic|delete|listingQueries;mutateListingQueryAtomic|insert|listingQueries;mutateListingQueryAtomic|update|listingQueries;updateListingQuery|update|listingQueries
managed-shared~core/services/content/listingTemplatesService.ts~createListingTemplate|insert|listingTemplates;deleteListingTemplate|delete|listingTemplates;mutateListingTemplateAtomic|delete|listingTemplates;mutateListingTemplateAtomic|insert|listingTemplates;mutateListingTemplateAtomic|update|listingTemplates;updateListingTemplate|update|listingTemplates
managed-shared~core/services/content/taxonomyService.ts~applyEntryTaxonomyMutation|delete|contentTermAssignments;applyEntryTaxonomyMutation|insert|contentTermAssignments;createTerm|insert|contentTerms;deleteTerm|delete|contentTerms;setTaxonomyConfig>handleKind|delete|contentTaxonomies;setTaxonomyConfig>handleKind|insert|contentTaxonomies;updateTerm|update|contentTerms
managed-shared~core/services/content/typeService.ts~createContentType|insert|contentTypes;deleteContentType|delete|contentTypes;duplicateContentType|insert|contentTypes;mutateContentTypeAtomic|delete|contentTypes;mutateContentTypeAtomic|insert|contentTypes;mutateContentTypeAtomic|update|contentTypes;updateContentType|update|contentTypes
managed-shared~core/services/customScreens/customScreenService.ts~createCustomScreen|insert|customScreens;deleteCustomScreen|delete|customScreens;updateCustomScreen|update|customScreens;updateCustomScreen|update|customScreens
managed-shared~core/services/customScreens/screenEntryPresentationOverrides.ts~createDefaultRepository>deleteByEntry|delete|table;createDefaultRepository>deleteByScreen|delete|table;createDefaultRepository>deleteExact|delete|table;createDefaultRepository>replaceScopedOverrides|delete|table;createDefaultRepository>replaceScopedOverrides|insert|table
adjacent-reviewed~core/services/email/emailSettingsService.ts~updateEmailSettings|insert|settings
managed-shared~core/services/forms/formActionsService.ts~createFormActionRun|insert|formActionRuns;setFormActionsTx|delete|formActions;setFormActionsTx|delete|formActions;setFormActionsTx|insert|formActions;setFormActionsTx|insert|formActions;setFormActionsTx|update|formActions
managed-shared~core/services/forms/formAggregateService.ts~mutateFormAggregateAtomic|delete|forms;writeFieldsTx|delete|formFields;writeFieldsTx|insert|formFields;writeFormBaseTx|insert|forms;writeFormBaseTx|update|forms
managed-shared~core/services/forms/formsService.ts~createForm|insert|forms;deleteForm|delete|forms;setFormFields|delete|formFields;setFormFields|insert|formFields;setFormFields|update|forms;updateForm|update|forms
managed-shared~core/services/forms/submissionService.ts~submitForm|insert|formSubmissions
l01-l03-foreign~core/services/kits/legacyInstallResourceHandlers.ts~ensureTaxonomyRow|insert|contentTaxonomies;executeContentTypeOperation|insert|contentTypes;executeContentTypeOperation|update|contentTypes;executeFormOperation|insert|forms;executeFormOperation|update|forms;executeMenuOperation|insert|menus;executeMenuOperation|update|menus;executePageOperation|insert|pages;executePageOperation|update|pages;replaceFormFieldsTx|delete|formFields;replaceFormFieldsTx|insert|formFields;replaceMenuItemsTx|delete|menuItems;replaceMenuItemsTx|insert|menuItems;syncTaxonomyTermsForKind|delete|contentTaxonomies;syncTaxonomyTermsForKind|delete|contentTerms;syncTaxonomyTermsForKind|insert|contentTerms;syncTaxonomyTermsForKind|update|contentTerms
l01-l03-foreign~core/services/kits/legacyInstallRollback.ts~rollbackCreatedResource|delete|contentTypes;rollbackCreatedResource|delete|forms;rollbackCreatedResource|delete|menus;rollbackCreatedResource|delete|pages;rollbackUpdatedResource|insert|contentTypes;rollbackUpdatedResource|insert|forms;rollbackUpdatedResource|insert|menus;rollbackUpdatedResource|insert|pages;rollbackUpdatedResource|update|contentTypes;rollbackUpdatedResource|update|forms;rollbackUpdatedResource|update|menus;rollbackUpdatedResource|update|pages
managed-shared~core/services/menus/menuService.ts~createMenu|insert|menus;deleteMenu|delete|menus;mutateMenuAggregateAtomic|delete|menus;mutateMenuAggregateAtomic|insert|menus;mutateMenuAggregateAtomic|update|menus;replaceMenuItemsWithClient|delete|menuItems;replaceMenuItemsWithClient|insert|menuItems;updateMenu|update|menus;writeMenuItemsTx|delete|menuItems;writeMenuItemsTx|insert|menuItems
managed-shared~core/services/pages/pageService.ts~createPage|insert|pages;deletePage|delete|pages;duplicatePage|insert|pages;mutatePageLifecycleAtomic|delete|pages;mutatePageLifecycleAtomic|insert|pages;mutatePageLifecycleAtomic|update|pages;publishPage|update|pages;unpublishPage|update|pages;updatePage|update|pages;writePageRevisionsTx|delete|pageRevisions;writePageRevisionsTx|insert|pageRevisions
managed-shared~core/services/pages/pageTemplateLibraryService.ts~createPageTemplate|insert|pageTemplates;deletePageTemplate|delete|pageTemplates;duplicatePageTemplate|insert|pageTemplates;mutatePageTemplateAtomic|delete|pageTemplates;mutatePageTemplateAtomic|insert|pageTemplates;mutatePageTemplateAtomic|update|pageTemplates;updatePageTemplate|update|pageTemplates
adjacent-reviewed~core/services/pages/previewService.ts~createPreviewToken|insert|previewTokens;purgeExpiredPreviewTokens|delete|previewTokens
managed-shared~core/services/pages/revisionService.ts~createOrReplaceAutosaveRevisionTx|delete|pageRevisions;createOrReplaceAutosaveRevisionTx|delete|pageRevisions;createOrReplaceAutosaveRevisionTx|insert|pageRevisions;createRevisionTx|insert|pageRevisions;discardAutosaveRevision|delete|pageRevisions;pruneRevisionsTx|delete|pageRevisions;restoreRevision|update|pages
adjacent-reviewed~core/services/redirects/redirectService.ts~createRedirect|insert|redirects;deleteRedirect|delete|redirects;updateRedirect|update|redirects
managed-shared~core/services/settings/fullSiteSettingsAtomicService.ts~mutateSettingsBatch|delete|settings;mutateSettingsBatch|insert|settings;mutateSettingsBatch|raw-lock|settings
adjacent-reviewed~core/services/settings/securitySettings.ts~setSecuritySettings|insert|settings
managed-shared~core/services/settings/settingsService.ts~deleteSetting|delete|settings;migrateLegacyAssistantSettingsTx|delete|settings;migrateLegacyAssistantSettingsTx|update|settings;writeValidatedSettingsTx|insert|settings
adjacent-reviewed~core/services/settings/storageSettings.ts~setStorageSettings|delete|settings;setStorageSettings|insert|settings
managed-shared~core/services/themes/themeProfileService.ts~activateThemeProfile|update|themeProfiles;activateThemeProfile|update|themeProfiles;createThemeProfile|insert|themeProfiles;createThemeProfile|update|themeProfiles;setThemeRoutes|delete|themeRoutes;setThemeRoutes|insert|themeRoutes;setThemeRoutes|update|themeProfiles;updateThemeProfile|update|themeProfiles
managed-shared~core/services/tools/importExportService.ts~importConfigTx|delete|menus;importConfigTx|delete|redirects;importConfigTx|delete|themeRoutes;importConfigTx|insert|adminThemeProfiles;importConfigTx|insert|adminThemeTemplates;importConfigTx|insert|menus;importConfigTx|insert|redirects;importConfigTx|insert|themeProfiles;importConfigTx|insert|themeRoutes;importConfigTx|update|adminThemeProfiles;importConfigTx|update|adminThemeProfiles;importConfigTx|update|adminThemeTemplates;importConfigTx|update|menus;importConfigTx|update|redirects;importConfigTx|update|themeProfiles;importConfigTx|update|themeProfiles
adjacent-reviewed~core/services/widgets/widgetTemplateCategoryService.ts~persistCategories|insert|settings
`);

test("protected Drizzle and raw DML has an exact reviewed disposition", () => {
  const reviewed = reviewedDml
    .flatMap((group) => group.entries.map((entry) => `${group.path}|${entry}`))
    .sort();
  expect(reviewedDml.every((group) => group.entries.length > 0)).toBe(true);
  expect(new Set(reviewedDml.map(({ disposition }) => disposition))).toEqual(
    new Set<DmlDisposition>(["adjacent-reviewed", "l01-l03-foreign", "managed-shared"])
  );
  const uses = collectProtectedDml();
  expect(uses.map((use) => use.slice(0, use.lastIndexOf("@")))).toEqual(reviewed);
  const dispositions = new Map<string, DmlDisposition>(
    reviewedDml.flatMap((group) =>
      group.entries.map((entry) => [`${group.path}|${entry}`, group.disposition] as const)
    )
  );
  expect(
    new Set(
      uses
        .filter((use) => dispositions.get(use.slice(0, use.lastIndexOf("@"))) === "managed-shared")
        .map((use) => use.slice(use.lastIndexOf("@") + 1))
    )
  ).toEqual(new Set(["client", "executor", "tx"]));
});

function findFunction(relativePath: string, scope: string): Node {
  const ast = readAst(relativePath);
  let found: Node | null = null;
  const visit = (node: Node, scopes: readonly string[]): void => {
    const ownName = declaredFunctionName(node);
    const next = ownName ? [...scopes, ownName] : scopes;
    if (next.join(">") === scope) {
      if (found && found !== node) throw new Error(`duplicate_function:${relativePath}:${scope}`);
      found = node;
      return;
    }
    forEachChild(node, (child) => visit(child, next));
  };
  visit(ast, []);
  if (!found) throw new Error(`missing_function:${relativePath}:${scope}`);
  return found;
}

function callsWithin(node: Node, name: string): readonly CallExpression[] {
  const calls: CallExpression[] = [];
  const visit = (child: Node): void => {
    if (
      isCallExpression(child) &&
      ((isIdentifier(child.expression) && child.expression.text === name) ||
        (isPropertyAccessExpression(child.expression) && child.expression.name.text === name))
    ) {
      calls.push(child);
    }
    forEachChild(child, visit);
  };
  visit(node);
  return calls;
}

const fenceOwners: readonly Readonly<{ path: string; scopes: readonly string[] }>[] = [
  {
    path: "core/services/content/typeService.ts",
    scopes: ["mutateContentTypeAtomic", "deleteContentType"],
  },
  {
    path: "core/services/content/listingTemplatesService.ts",
    scopes: ["mutateListingTemplateAtomic"],
  },
  { path: "core/services/content/listingQueriesService.ts", scopes: ["mutateListingQueryAtomic"] },
  {
    path: "core/services/content/entryLifecycleMutationService.ts",
    scopes: ["mutateEntryLifecycleAtomic"],
  },
  {
    path: "core/services/content/detailPageDocumentLifecycleMutation.ts",
    scopes: ["mutateDetailPageDocumentLifecycleAtomic"],
  },
  { path: "core/services/forms/formAggregateService.ts", scopes: ["mutateFormAggregateAtomic"] },
  { path: "core/services/menus/menuService.ts", scopes: ["mutateMenuAggregateAtomic"] },
  {
    path: "core/services/pages/pageService.ts",
    scopes: ["mutatePageLifecycleAtomic", "deletePage"],
  },
  {
    path: "core/services/pages/pageTemplateLibraryService.ts",
    scopes: ["mutatePageTemplateAtomic"],
  },
  {
    path: "core/services/settings/fullSiteSettingsAtomicService.ts",
    scopes: ["mutateSettingsBatch"],
  },
  {
    path: "core/services/themes/themeProfileService.ts",
    scopes: ["createThemeProfile", "updateThemeProfile", "activateThemeProfile", "setThemeRoutes"],
  },
  { path: "core/services/forms/submissionService.ts", scopes: ["submitForm"] },
  {
    path: "core/services/customScreens/customScreenService.ts",
    scopes: ["createCustomScreen", "updateCustomScreen", "deleteCustomScreen"],
  },
  {
    path: "core/services/customScreens/screenEntryPresentationOverrides.ts",
    scopes: [
      "createDefaultRepository>replaceScopedOverrides",
      "createDefaultRepository>deleteByScreen",
      "createDefaultRepository>deleteByEntry",
      "createDefaultRepository>deleteExact",
    ],
  },
  {
    path: "core/services/content/taxonomyService.ts",
    scopes: [
      "setTaxonomyConfig",
      "createTerm",
      "updateTerm",
      "deleteTerm",
      "replaceEntryTaxonomies",
    ],
  },
  { path: "core/services/admin/usersService.ts", scopes: ["deleteUser"] },
  { path: "core/services/backups/backupService.ts", scopes: ["restoreBackup"] },
  // TASK-561: the upload-import orchestrator is a managed-shared writer — its
  // outer transaction takes the native fence FIRST (before any delete/insert/
  // restore), so the owner-assertion loop below must iterate it like every
  // other fence owner.
  { path: "core/services/backups/backupImport.ts", scopes: ["importBackupFromUpload"] },
  { path: "core/services/tools/importExportService.ts", scopes: ["importConfig"] },
  {
    path: "core/services/content/entryService.ts",
    scopes: [
      "createEntry",
      "deleteEntry",
      "updateEntry",
      "publishEntry",
      "unpublishEntry",
      "coordinateEntryMetadataMutation",
      "createEntryRevision",
      "restoreEntryRevision",
      "createEntryPreview",
    ],
  },
  { path: "core/services/content/entryDuplicationService.ts", scopes: ["duplicateEntry"] },
  {
    path: "core/services/forms/formsService.ts",
    scopes: ["createForm", "updateForm", "deleteForm", "setFormFields"],
  },
  {
    path: "core/services/forms/formActionsService.ts",
    scopes: ["setFormActions", "createFormActionRun"],
  },
  {
    path: "core/services/pages/revisionService.ts",
    scopes: [
      "createRevision",
      "createOrReplaceAutosaveRevision",
      "pruneRevisions",
      "discardAutosaveRevision",
      "restoreRevision",
    ],
  },
  {
    path: "core/services/content/detailPageDocumentService.ts",
    scopes: [
      "persistDetailPageDocument",
      "deleteDetailPageDocument",
      "issueDetailPagePreview",
      "publishDetailPageDocument",
      "unpublishDetailPageDocument",
      "autosaveDetailPageDocument",
    ],
  },
  {
    path: "core/services/content/detailPageRevisionService.ts",
    scopes: ["discardDetailPageAutosaveRevision", "restoreDetailPageRevision"],
  },
];

test("ordinary roots, revisions, reverse-FK writers, settings, import, and backup fence first", () => {
  for (const owner of fenceOwners) {
    for (const scope of owner.scopes) {
      const node = findFunction(owner.path, scope);
      const ast = readAst(owner.path);
      const transactions = [
        ...callsWithin(node, "transaction"),
        ...callsWithin(node, "runEntryTransaction"),
      ];
      expect(transactions, `${owner.path}:${scope}`).toHaveLength(1);
      const callback = transactions[0]?.arguments[0]?.getText(ast).replace(/\s+/gu, " ") ?? "";
      expect(callback, `${owner.path}:${scope}`).toMatch(
        /=> \{ await (?:acquireNativeCmsWriterFence|(?:entryMutationDeps|deps)\.acquireFence)\(tx\);/u
      );
      expect(
        callsWithin(transactions[0]!, "acquireNativeCmsWriterFence").length +
          callsWithin(transactions[0]!, "acquireFence").length
      ).toBe(1);
    }
  }
});

test("reverse-FK inserters take their exact parent KEY SHARE locks and deletes do not invent them", () => {
  const locks: readonly [string, string, readonly string[]][] = [
    ["core/services/themes/themeProfileService.ts", "setThemeRoutes", ["lockReferencedPages"]],
    ["core/services/forms/submissionService.ts", "submitForm", ["forms", '.for("key share")']],
    [
      "core/services/customScreens/customScreenService.ts",
      "createCustomScreen",
      ["lockContentTypeContext"],
    ],
    [
      "core/services/customScreens/customScreenService.ts",
      "updateCustomScreen",
      ["lockContentTypeContext"],
    ],
    [
      "core/services/customScreens/screenEntryPresentationOverrides.ts",
      "createDefaultRepository>replaceScopedOverrides",
      ["customScreens", "contentEntries", '.for("key share")'],
    ],
    ["core/services/content/taxonomyService.ts", "setTaxonomyConfig", ["lockContentTypeTx"]],
    ["core/services/content/taxonomyService.ts", "createTerm", ["lockTaxonomyContentTypeTx"]],
    ["core/services/content/taxonomyService.ts", "updateTerm", ["lockTaxonomyContentTypeTx"]],
    [
      "core/services/content/taxonomyService.ts",
      "replaceEntryTaxonomies",
      ["lockContentTypeTx", "contentEntries", '.for("key share")'],
    ],
  ];
  for (const [relativePath, scope, needles] of locks) {
    const text = findFunction(relativePath, scope).getText(readAst(relativePath));
    for (const needle of needles)
      expect(text, `${relativePath}:${scope}:${needle}`).toContain(needle);
  }
  for (const [relativePath, scope] of [
    ["core/services/customScreens/customScreenService.ts", "deleteCustomScreen"],
    ["core/services/content/taxonomyService.ts", "deleteTerm"],
  ] as const) {
    expect(findFunction(relativePath, scope).getText(readAst(relativePath))).not.toContain(
      '.for("key share")'
    );
  }
  for (const [relativePath, scope, table] of [
    ["core/services/themes/themeProfileService.ts", "lockReferencedPages", "pages"],
    [
      "core/services/customScreens/customScreenService.ts",
      "lockContentTypeContext",
      "contentTypes",
    ],
    ["core/services/content/taxonomyService.ts", "lockContentTypeTx", "contentTypes"],
  ] as const) {
    const text = findFunction(relativePath, scope).getText(readAst(relativePath));
    expect(text).toContain(table);
    expect(text).toContain('.for("key share")');
  }
});

const trackedTxHelpers = new Set([
  "applyEntryTaxonomyMutation",
  "createDetailPageRevisionTx",
  "createEntryRevisionTx",
  "createOrReplaceDetailPageAutosaveRevisionTx",
  "createOrReplaceAutosaveRevisionTx",
  "importConfigTx",
  "lockContentRouteSettingRootsTx",
  "migrateLegacyAssistantSettingsTx",
  "prepareEntryTaxonomyMutation",
  "pruneRevisionsTx",
  "replaceFormFieldsTx",
  "replaceMenuItemsTx",
  "replaceMenuItemsWithClient",
  "replaceSnapshotTables",
  "restoreArtifactTx",
  "setFormActionsTx",
  "setSettingsTx",
  "writeEntryMetadataTx",
  "writeEntryStatusTx",
  "writeFieldsTx",
  "writeFormBaseTx",
  "writeMenuItemsTx",
  "writePageRevisionsTx",
  "writeRevisionsTx",
  "writeValidatedSettingsTx",
]);

function collectTrackedTxCallers(): readonly string[] {
  const found: string[] = [];
  for (const relativePath of productionPaths) {
    const visit = (node: Node, scopes: readonly string[]): void => {
      const ownName = declaredFunctionName(node);
      const next = ownName ? [...scopes, ownName] : scopes;
      if (isCallExpression(node)) {
        const name = isIdentifier(node.expression)
          ? node.expression.text
          : isPropertyAccessExpression(node.expression)
            ? node.expression.name.text
            : null;
        if (name && trackedTxHelpers.has(name)) {
          found.push(`${name}|${relativePath}|${next.join(">") || "<module>"}`);
        }
      }
      forEachChild(node, (child) => visit(child, next));
    };
    visit(readAst(relativePath), []);
  }
  return Object.freeze(found.sort());
}

function collectTrackedTxDefinitions(): readonly Readonly<{ name: string; node: Node }>[] {
  const found: Array<Readonly<{ name: string; node: Node }>> = [];
  for (const relativePath of productionPaths) {
    const visit = (node: Node): void => {
      const name = declaredFunctionName(node);
      if (name && trackedTxHelpers.has(name)) found.push({ name, node });
      forEachChild(node, visit);
    };
    visit(readAst(relativePath));
  }
  return Object.freeze(found);
}

const expectedTxCallers: readonly string[] = [
  "applyEntryTaxonomyMutation|core/services/content/taxonomyService.ts|replaceEntryTaxonomies",
  "createDetailPageRevisionTx|core/services/content/detailPageDocumentService.ts|createOrReplaceDetailPageAutosaveRevisionTx",
  "createDetailPageRevisionTx|core/services/content/detailPageDocumentService.ts|publishDetailPageDocument",
  "createEntryRevisionTx|core/services/content/entryService.ts|createEntryRevision",
  "createEntryRevisionTx|core/services/content/entryService.ts|restoreEntryRevision",
  "createOrReplaceDetailPageAutosaveRevisionTx|core/services/content/detailPageDocumentService.ts|autosaveDetailPageDocument",
  "createOrReplaceAutosaveRevisionTx|core/services/pages/pageService.ts|autosavePage",
  "createOrReplaceAutosaveRevisionTx|core/services/pages/revisionService.ts|createOrReplaceAutosaveRevision",
  "importConfigTx|core/services/backups/backupImport.ts|restoreArchiveStreamTx",
  "importConfigTx|core/services/backups/backupRestore.ts|restoreArtifactTx",
  "importConfigTx|core/services/tools/importExportService.ts|importConfig",
  "lockContentRouteSettingRootsTx|core/services/settings/fullSiteSettingsAtomicService.ts|mutateSettingsBatch",
  "lockContentRouteSettingRootsTx|core/services/settings/settingsService.ts|setSetting",
  "lockContentRouteSettingRootsTx|core/services/settings/settingsService.ts|setSettings",
  "lockContentRouteSettingRootsTx|core/services/settings/settingsService.ts|setSettingsTx",
  "migrateLegacyAssistantSettingsTx|core/services/settings/settingsService.ts|deleteSetting",
  "migrateLegacyAssistantSettingsTx|core/services/settings/settingsService.ts|ensureLegacyAssistantSettingsMigrated",
  "migrateLegacyAssistantSettingsTx|core/services/settings/settingsService.ts|setSetting",
  "migrateLegacyAssistantSettingsTx|core/services/settings/settingsService.ts|setSettings",
  "migrateLegacyAssistantSettingsTx|core/services/settings/settingsService.ts|setSettingsTx",
  "prepareEntryTaxonomyMutation|core/services/content/taxonomyService.ts|replaceEntryTaxonomies",
  "pruneRevisionsTx|core/services/pages/pageService.ts|publishPage",
  "pruneRevisionsTx|core/services/pages/revisionService.ts|pruneRevisions",
  "replaceFormFieldsTx|core/services/kits/legacyInstallResourceHandlers.ts|executeFormOperation",
  "replaceFormFieldsTx|core/services/kits/legacyInstallResourceHandlers.ts|executeFormOperation",
  "replaceFormFieldsTx|core/services/kits/legacyInstallRollback.ts|rollbackUpdatedResource",
  "replaceMenuItemsTx|core/services/kits/legacyInstallResourceHandlers.ts|executeMenuOperation",
  "replaceMenuItemsTx|core/services/kits/legacyInstallResourceHandlers.ts|executeMenuOperation",
  "replaceMenuItemsTx|core/services/kits/legacyInstallRollback.ts|rollbackUpdatedResource",
  "replaceMenuItemsTx|core/services/tools/importExportService.ts|importConfigTx",
  "replaceMenuItemsWithClient|core/services/menus/menuService.ts|deleteMenuItem",
  "replaceMenuItemsWithClient|core/services/menus/menuService.ts|replaceMenuItems",
  "replaceMenuItemsWithClient|core/services/menus/menuService.ts|replaceMenuItemsTx",
  "replaceSnapshotTables|core/services/backups/backupRestore.ts|restoreArtifactTx",
  "restoreArtifactTx|core/services/backups/backupService.ts|restoreBackup",
  "setFormActionsTx|core/services/forms/formActionsService.ts|setFormActions",
  "setFormActionsTx|core/services/forms/formAggregateService.ts|mutateFormAggregateAtomic",
  "setFormActionsTx|core/services/forms/formAggregateService.ts|mutateFormAggregateAtomic",
  "setSettingsTx|core/services/tools/importExportService.ts|importConfigTx",
  "writeFieldsTx|core/services/forms/formAggregateService.ts|mutateFormAggregateAtomic",
  "writeFieldsTx|core/services/forms/formAggregateService.ts|mutateFormAggregateAtomic",
  "writeFormBaseTx|core/services/forms/formAggregateService.ts|mutateFormAggregateAtomic",
  "writeFormBaseTx|core/services/forms/formAggregateService.ts|mutateFormAggregateAtomic",
  "writeMenuItemsTx|core/services/menus/menuService.ts|mutateMenuAggregateAtomic",
  "writeMenuItemsTx|core/services/menus/menuService.ts|mutateMenuAggregateAtomic",
  "writePageRevisionsTx|core/services/pages/pageService.ts|mutatePageLifecycleAtomic",
  "writePageRevisionsTx|core/services/pages/pageService.ts|mutatePageLifecycleAtomic",
  "writeRevisionsTx|core/services/content/detailPageDocumentLifecycleMutation.ts|mutateDetailPageDocumentLifecycleAtomic",
  "writeRevisionsTx|core/services/content/detailPageDocumentLifecycleMutation.ts|mutateDetailPageDocumentLifecycleAtomic",
  "writeRevisionsTx|core/services/content/entryLifecycleMutationService.ts|mutateEntryLifecycleAtomic",
  "writeRevisionsTx|core/services/content/entryLifecycleMutationService.ts|mutateEntryLifecycleAtomic",
  "writeValidatedSettingsTx|core/services/settings/settingsService.ts|setSetting",
  "writeValidatedSettingsTx|core/services/settings/settingsService.ts|setSettings",
  "writeValidatedSettingsTx|core/services/settings/settingsService.ts|setSettingsTx",
];

test("public wrappers and production callers use the exact reviewed Tx-helper graph", () => {
  expect(collectTrackedTxCallers()).toEqual([...expectedTxCallers].sort());
  const definitions = collectTrackedTxDefinitions();
  for (const helper of trackedTxHelpers) {
    const matching = definitions.filter((definition) => definition.name === helper);
    expect(matching.length, helper).toBeGreaterThan(0);
    for (const definition of matching) {
      expect(callsWithin(definition.node, "transaction"), helper).toHaveLength(0);
      expect(callsWithin(definition.node, "acquireNativeCmsWriterFence"), helper).toHaveLength(0);
    }
  }
});

test("public compatibility wrappers delegate exactly once to their reviewed transaction owner", () => {
  const delegations: readonly [string, string, string][] = [
    [
      "core/services/customScreens/screenEntryPresentationOverrides.ts",
      "saveScreenEntryPresentationOverrides",
      "replaceScopedOverrides",
    ],
    [
      "core/services/customScreens/screenEntryPresentationOverrides.ts",
      "cleanupOverridesForDeletedScreen",
      "deleteByScreen",
    ],
    [
      "core/services/customScreens/screenEntryPresentationOverrides.ts",
      "cleanupOverridesForDeletedEntry",
      "deleteByEntry",
    ],
    [
      "core/services/customScreens/screenEntryPresentationOverrides.ts",
      "cleanupStaleScreenEntryPresentationOverrides",
      "deleteExact",
    ],
    [
      "core/services/content/detailPageDocumentService.ts",
      "createDetailPageDocument",
      "persistDetailPageDocument",
    ],
    [
      "core/services/content/detailPageDocumentService.ts",
      "createDetailPageDraftDocument",
      "persistDetailPageDocument",
    ],
    [
      "core/services/content/detailPageDocumentService.ts",
      "updateDetailPageDocument",
      "persistDetailPageDocument",
    ],
    [
      "core/services/content/detailPageDocumentService.ts",
      "updateDetailPageDraftDocument",
      "persistDetailPageDocument",
    ],
    [
      "core/services/content/detailPageDocumentService.ts",
      "upsertDetailPageDocument",
      "persistDetailPageDocument",
    ],
    [
      "core/services/settings/fullSiteSettingsAtomicService.ts",
      "applyFullSiteSettingsBatchAtomic",
      "mutateSettingsBatch",
    ],
    [
      "core/services/settings/fullSiteSettingsAtomicService.ts",
      "restoreFullSiteSettingsBatchRawAtomic",
      "mutateSettingsBatch",
    ],
    [
      "core/services/content/entryService.ts",
      "updateEntryMetadataForRoute",
      "coordinateEntryMetadataMutation",
    ],
    [
      "core/services/content/entryService.ts",
      "updateEntryMetadata",
      "coordinateEntryMetadataMutation",
    ],
  ];
  for (const [relativePath, scope, callee] of delegations) {
    expect(
      callsWithin(findFunction(relativePath, scope), callee),
      `${scope}->${callee}`
    ).toHaveLength(1);
  }
});

test("all nine native roots, owned rows, conditional deletes, and settings use the reviewed owners", () => {
  const atomicBindings: readonly [string, string][] = [
    ["core/services/kits/fullSiteInstall/aggregateAdapters.ts", "mutate: mutateContentTypeAtomic"],
    [
      "core/services/kits/fullSiteInstall/aggregateAdapters.ts",
      "mutate: mutateFormAggregateAtomic",
    ],
    ["core/services/kits/fullSiteInstall/aggregateAdapters.ts", "mutate: mutatePageTemplateAtomic"],
    [
      "core/services/kits/fullSiteInstall/aggregateAdapters.ts",
      "mutate: mutateListingTemplateAtomic",
    ],
    ["core/services/kits/fullSiteInstall/aggregateAdapters.ts", "mutate: mutateListingQueryAtomic"],
    [
      "core/services/kits/fullSiteInstall/lifecycleAdapters.ts",
      "mutate: mutateEntryLifecycleAtomic",
    ],
    [
      "core/services/kits/fullSiteInstall/lifecycleAdapters.ts",
      "mutate: mutateDetailPageDocumentLifecycleAtomic",
    ],
    [
      "core/services/kits/fullSiteInstall/lifecycleAdapters.ts",
      "mutate: mutatePageLifecycleAtomic",
    ],
    [
      "core/services/kits/fullSiteInstall/lifecycleAdapters.ts",
      "mutate: mutateMenuAggregateAtomic",
    ],
  ];
  const actualBindings = [...new Set(atomicBindings.map(([relativePath]) => relativePath))]
    .flatMap((relativePath) =>
      Array.from(
        readSource(relativePath).matchAll(/mutate:\s+(mutate[A-Za-z]+Atomic)\b/gu),
        ([, owner]) => [relativePath, `mutate: ${owner}`] as const
      )
    )
    .sort();
  expect(actualBindings).toEqual([...atomicBindings].sort());
  const registry = readSource("core/services/kits/fullSiteInstall/adapters.ts");
  const registryBody =
    /FULL_SITE_RESOURCE_ADAPTERS = Object\.freeze\(\{([\s\S]*?)\}\) satisfies/u.exec(registry)?.[1];
  expect(registryBody).toBeDefined();
  expect(
    Array.from(registryBody?.matchAll(/^\s{2}([a-z_]+):/gmu) ?? [], (match) => match[1])
  ).toEqual([
    "content_type",
    "form",
    "page_template",
    "listing_template",
    "content_entry",
    "listing_query",
    "detail_page",
    "page",
    "menu",
    "setting",
  ]);
  const deleteGuards: readonly [string, string, readonly string[]][] = [
    [
      "core/services/pages/pageService.ts",
      "mutatePageLifecycleAtomic",
      ["menuItems", "themeRoutes"],
    ],
    [
      "core/services/content/entryLifecycleMutationService.ts",
      "mutateEntryLifecycleAtomic",
      ["customScreenEntryPresentationOverrides", "contentTermAssignments"],
    ],
    [
      "core/services/forms/formAggregateService.ts",
      "mutateFormAggregateAtomic",
      ["formSubmissions", "formActionRuns"],
    ],
    [
      "core/services/content/typeService.ts",
      "mutateContentTypeAtomic",
      ["assertContentTypeDeleteAllowedTx", "assertContentRoutesDoNotReferenceSlugTx"],
    ],
    [
      "core/services/content/typeService.ts",
      "assertContentTypeDeleteAllowedTx",
      [
        "contentEntries",
        "customScreens",
        "contentTaxonomies",
        "detailPageDocuments",
        "buildListingQueryContentTypeReferenceSelect",
      ],
    ],
    [
      "core/services/content/typeService.ts",
      "buildListingQueryContentTypeReferenceSelect",
      ["listingQueries", "contentTypeId"],
    ],
    [
      "core/services/content/typeService.ts",
      "assertContentRoutesDoNotReferenceSlugTx",
      ["site.contentRoutes"],
    ],
  ];
  for (const [relativePath, scope, guards] of deleteGuards) {
    const text = findFunction(relativePath, scope).getText(readAst(relativePath));
    for (const guard of guards) expect(text, `${scope}:${guard}`).toContain(guard);
  }
  const deleteUser = findFunction("core/services/admin/usersService.ts", "deleteUser").getText(
    readAst("core/services/admin/usersService.ts")
  );
  expect(deleteUser).toContain('.for("update")');
  expect(deleteUser.match(/\bdb\./gu)).toHaveLength(1);
  expect(FULL_SITE_PACKAGE_SETTING_KEYS).toEqual([
    "site.name",
    "site.locale",
    "site.homepageId",
    "site.navigationMenuId",
    "site.footerTemplateId",
    "site.contentRoutes",
    "design.tokens",
  ]);
  for (const weakExport of ["applySettingsBatch", "restoreSettingsBatchRaw"]) {
    const exactWeakName = new RegExp(`\\b${weakExport}\\b`, "u");
    expect(
      productionPaths.filter((relativePath) => exactWeakName.test(readSource(relativePath)))
    ).toEqual([]);
  }
  const entryFacade = readSource("core/services/content/entryService.ts");
  for (const binding of [
    "prepareTaxonomy: prepareEntryTaxonomyMutation",
    "applyTaxonomy: applyEntryTaxonomyMutation",
    "createRevision: createEntryRevisionTx",
  ]) {
    expect(entryFacade.split(binding)).toHaveLength(2);
  }
});

const fkTargets = new Set([
  "contentEntries",
  "contentRevisions",
  "contentTaxonomies",
  "contentTermAssignments",
  "contentTerms",
  "contentTypes",
  "customScreenEntryPresentationOverrides",
  "customScreens",
  "detailPageDocuments",
  "detailPageRevisions",
  "formActionRuns",
  "formActions",
  "formFields",
  "formSubmissions",
  "forms",
  "listingQueries",
  "listingTemplates",
  "menuItems",
  "menus",
  "pageRevisions",
  "pageTemplates",
  "pages",
  "settings",
  "themeProfiles",
  "themeRoutes",
  "users",
]);

function collectIncomingForeignKeys(): readonly string[] {
  const edges: string[] = [];
  for (const relativePath of walkSources("core/db/tables")) {
    const ast = readAst(relativePath);
    const visit = (node: Node): void => {
      if (
        isVariableDeclaration(node) &&
        isIdentifier(node.name) &&
        node.initializer &&
        isCallExpression(node.initializer) &&
        isIdentifier(node.initializer.expression) &&
        node.initializer.expression.text === "pgTable" &&
        isObjectLiteralExpression(node.initializer.arguments[1])
      ) {
        const sourceTable = node.name.text;
        for (const property of node.initializer.arguments[1].properties) {
          if (!isPropertyAssignment(property)) continue;
          const calls: CallExpression[] = [];
          const collect = (child: Node): void => {
            if (
              isCallExpression(child) &&
              isPropertyAccessExpression(child.expression) &&
              child.expression.name.text === "references"
            )
              calls.push(child);
            forEachChild(child, collect);
          };
          collect(property.initializer);
          for (const call of calls) {
            const reference = call.arguments[0]?.getText(ast) ?? "";
            const match = /=>\s*([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)/u.exec(reference);
            if (!match || !fkTargets.has(match[1]!)) continue;
            const options = call.arguments[1]?.getText(ast) ?? "";
            const onDelete = /onDelete\s*:\s*["']([^"']+)["']/u.exec(options)?.[1] ?? "no action";
            edges.push(
              `${relativePath}|${sourceTable}.${property.name.getText(ast)}->${match[1]}.${match[2]}:${onDelete}`
            );
          }
        }
      }
      forEachChild(node, visit);
    };
    visit(ast);
  }
  return Object.freeze(edges.sort());
}

const expectedIncomingForeignKeys = [
  "assistant.ts|assistantActionExecutions.actorId->users.id:set null",
  "assistant.ts|assistantDocIngestRuns.triggeredByUserId->users.id:set null",
  "bookings.ts|bookings.formSubmissionId->formSubmissions.id:set null",
  "content.ts|contentEntries.authorId->users.id:set null",
  "content.ts|contentEntries.typeId->contentTypes.id:cascade",
  "content.ts|contentRevisions.createdBy->users.id:no action",
  "content.ts|contentRevisions.entryId->contentEntries.id:cascade",
  "content.ts|contentTaxonomies.typeId->contentTypes.id:cascade",
  "content.ts|contentTermAssignments.entryId->contentEntries.id:cascade",
  "content.ts|contentTermAssignments.termId->contentTerms.id:cascade",
  "content.ts|contentTerms.taxonomyId->contentTaxonomies.id:cascade",
  "customScreens.ts|customScreenEntryPresentationOverrides.entryId->contentEntries.id:cascade",
  "customScreens.ts|customScreenEntryPresentationOverrides.screenId->customScreens.id:cascade",
  "customScreens.ts|customScreenEntryPresentationOverrides.updatedBy->users.id:set null",
  "customScreens.ts|customScreens.contentTypeId->contentTypes.id:cascade",
  "engagement.ts|reviews.moderatedBy->users.id:set null",
  "forms.ts|formActionRuns.actionId->formActions.id:set null",
  "forms.ts|formActionRuns.formId->forms.id:restrict",
  "forms.ts|formActionRuns.retryOfId->formActionRuns.id:set null",
  "forms.ts|formActionRuns.submissionId->formSubmissions.id:set null",
  "forms.ts|formActions.formId->forms.id:cascade",
  "forms.ts|formFields.formId->forms.id:cascade",
  "forms.ts|formSubmissions.formId->forms.id:restrict",
  "forms.ts|submissionExportJobs.createdBy->users.id:set null",
  "forms.ts|submissionExportJobs.formId->forms.id:cascade",
  "identity.ts|passwordResets.userId->users.id:cascade",
  "identity.ts|sessions.userId->users.id:cascade",
  "identity.ts|userRoles.userId->users.id:cascade",
  "media.ts|media.createdBy->users.id:no action",
  "media.ts|mediaFolders.createdBy->users.id:no action",
  "navigation.ts|menuItems.menuId->menus.id:cascade",
  "navigation.ts|menuItems.pageId->pages.id:set null",
  "navigation.ts|menuItems.parentId->menuItems.id:cascade",
  "observability.ts|accessLogs.userId->users.id:set null",
  "observability.ts|auditLogs.actorId->users.id:set null",
  "operations.ts|solutionKitInstallRuns.actorId->users.id:set null",
  "pages.ts|detailPageDocuments.contentTypeId->contentTypes.id:no action",
  "pages.ts|detailPageRevisions.createdBy->users.id:set null",
  "pages.ts|detailPageRevisions.detailPageId->detailPageDocuments.id:cascade",
  "pages.ts|pageRevisions.createdBy->users.id:no action",
  "pages.ts|pageRevisions.pageId->pages.id:cascade",
  "pages.ts|pages.authorId->users.id:set null",
  "platform.ts|dashboardLayouts.updatedBy->users.id:set null",
  "platform.ts|dashboardLayouts.userId->users.id:cascade",
  "platform.ts|searchHistory.userId->users.id:cascade",
  "platform.ts|userSettings.userId->users.id:cascade",
  "posts.ts|postRevisions.createdBy->users.id:set null",
  "posts.ts|postTermAssignments.termId->contentTerms.id:cascade",
  "posts.ts|posts.authorId->users.id:set null",
  "theming.ts|themeRoutes.pageId->pages.id:set null",
  "theming.ts|themeRoutes.profileId->themeProfiles.id:cascade",
  "widgets.ts|widgetTemplateRevisions.createdBy->users.id:no action",
]
  .map((edge) => `core/db/tables/${edge}`)
  .sort();

test("schema-derived incoming FKs pin every managed cascade, restriction, and SET NULL effect", () => {
  expect(collectIncomingForeignKeys()).toEqual(expectedIncomingForeignKeys);
});
