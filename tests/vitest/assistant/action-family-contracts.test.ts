import { expect, test } from "vitest";

import {
  assistantActionFamilyContracts,
  assistantContractOnlyActionTypes,
  getAssistantActionFamilyContract,
  isAssistantContractOnlyActionType,
  isAssistantKnownActionContractType,
  normalizeAssistantActionFamilyContract,
} from "../../../core/services/assistant/actionFamilyContracts";
import {
  assistantActionTypes,
  isAssistantActionType,
} from "../../../core/services/assistant/actionRegistry";

test("assistant action family contracts list executable and contract-only actions once", () => {
  const types = assistantActionFamilyContracts.map((contract) => contract.type);

  expect(new Set(types).size).toBe(types.length);
  expect(types).toEqual([...assistantActionTypes, ...assistantContractOnlyActionTypes]);
});

test("contract-only action families are known but not executable", () => {
  expect(isAssistantKnownActionContractType("entry.bulk-draft.create")).toBe(true);
  expect(isAssistantContractOnlyActionType("entry.bulk-draft.create")).toBe(true);
  expect(isAssistantActionType("entry.bulk-draft.create")).toBe(false);
  expect(isAssistantKnownActionContractType("database.drop")).toBe(false);
});

test("entry upsert draft action is executable and stays draft-scoped", () => {
  const contract = getAssistantActionFamilyContract("entry.upsert-draft");

  expect(contract.status).toBe("executable");
  expect(contract.family).toBe("entry");
  expect(contract.schemaOwner).toBe("core/services/content/entryService.ts");
  expect(contract.permissions.execute).toEqual(["content:write"]);
  expect(contract.strictInput.required).toEqual(["contentTypeSlug", "title", "slug", "values"]);
  expect(contract.strictInput.notes.join(" ")).toContain("Draft-only");
});

test("entry sample create action is executable and publish-scoped", () => {
  const contract = getAssistantActionFamilyContract("entry.sample.create");

  expect(contract.status).toBe("executable");
  expect(contract.family).toBe("entry");
  expect(contract.schemaOwner).toBe("core/services/content/entryService.ts");
  expect(contract.permissions.execute).toEqual(["content:write", "content:publish"]);
  expect(contract.strictInput.required).toEqual([
    "contentTypeSlug",
    "title",
    "slug",
    "status",
    "values",
  ]);
  expect(contract.strictInput.notes.join(" ")).toContain("publish lifecycle");
});

test("menu seo media and surface expansion contracts declare domain permissions", () => {
  const contentRouteContract = getAssistantActionFamilyContract("setting.content-route.upsert");
  expect(contentRouteContract.status).toBe("executable");
  expect(contentRouteContract.permissions.plan).toEqual(["settings:read"]);
  expect(contentRouteContract.permissions.dryRun).toEqual(["settings:read"]);
  expect(contentRouteContract.permissions.execute).toEqual(["settings:write"]);
  expect(contentRouteContract.strictInput.notes.join(" ")).toContain("settings owner seam");
  const menuContract = getAssistantActionFamilyContract("menu.item.upsert");
  const menuUpsertContract = getAssistantActionFamilyContract("menu.upsert");
  expect(menuUpsertContract.status).toBe("executable");
  expect(menuUpsertContract.permissions.execute).toEqual(["menus:write"]);
  expect(menuUpsertContract.strictInput.notes.join(" ")).toContain("stable theme location");
  expect(menuContract.status).toBe("executable");
  expect(menuContract.permissions.execute).toEqual(["menus:write"]);
  expect(getAssistantActionFamilyContract("menu.item.delete").permissions.execute).toEqual([
    "menus:write",
  ]);
  expect(getAssistantActionFamilyContract("menu.item.update").permissions.execute).toEqual([
    "menus:write",
  ]);
  expect(
    getAssistantActionFamilyContract("menu.item.delete").strictInput.notes.join(" ")
  ).toContain("preserves unrelated menu items");
  const seoContract = getAssistantActionFamilyContract("seo.document.upsert");
  expect(seoContract.status).toBe("executable");
  expect(seoContract.permissions.execute).toEqual(["content:write"]);
  expect(
    getAssistantActionFamilyContract("seo.document.delete").strictInput.notes.join(" ")
  ).toContain("SEO domain service");
  expect(
    getAssistantActionFamilyContract("seo.document.update").strictInput.notes.join(" ")
  ).toContain("SEO domain service");
  const mediaContract = getAssistantActionFamilyContract("media.reference.attach");
  expect(mediaContract.status).toBe("executable");
  expect(mediaContract.strictInput.notes.join(" ")).toContain("raw upload bytes");
  const formAutomationContract = getAssistantActionFamilyContract("form.automation.upsert");
  expect(formAutomationContract.status).toBe("executable");
  expect(
    getAssistantActionFamilyContract("custom-screen.update").strictInput.notes.join(" ")
  ).toContain("preserving unrelated config");
  expect(
    getAssistantActionFamilyContract("custom-screen.widget.patch").strictInput.notes.join(" ")
  ).toContain("one existing custom screen widget block");
  expect(getAssistantActionFamilyContract("form.delete").permissions.execute).toEqual([
    "forms:write",
  ]);
  expect(getAssistantActionFamilyContract("form.delete").strictInput.notes.join(" ")).toContain(
    "zero submissions"
  );
  expect(getAssistantActionFamilyContract("form.archive").strictInput.notes.join(" ")).toContain(
    "without exposing submission payloads"
  );
  expect(getAssistantActionFamilyContract("form.update").strictInput.notes.join(" ")).toContain(
    "never reads submission payloads"
  );
  expect(getAssistantActionFamilyContract("entry.update").strictInput.notes.join(" ")).toContain(
    "preserves unrelated data fields"
  );
  expect(
    getAssistantActionFamilyContract("listing-query.delete").strictInput.notes.join(" ")
  ).toContain("references");
  expect(
    getAssistantActionFamilyContract("listing-query.update").strictInput.notes.join(" ")
  ).toContain("preserving unrelated query config");
  expect(
    getAssistantActionFamilyContract("listing-query.filters.patch").strictInput.notes.join(" ")
  ).toContain("array records");
  expect(
    getAssistantActionFamilyContract("listing-template.delete").strictInput.notes.join(" ")
  ).toContain("references");
  expect(
    getAssistantActionFamilyContract("listing-template.update").strictInput.notes.join(" ")
  ).toContain("preserving unrelated template config");
  expect(
    getAssistantActionFamilyContract("listing-template.card.patch").strictInput.notes.join(" ")
  ).toContain("preserve unrelated");
  expect(
    getAssistantActionFamilyContract("page.widget.patch").strictInput.notes.join(" ")
  ).toContain("top-level");
  const pageUpsertContract = getAssistantActionFamilyContract("page.upsert");
  expect(pageUpsertContract.strictInput.required).toEqual([
    "title",
    "slug",
    "status",
    "introTitle",
    "introBody",
  ]);
  expect(pageUpsertContract.strictInput.notes.join(" ")).toContain("collectionLink");
  const detailPageContract = getAssistantActionFamilyContract("detail-page.upsert");
  expect(detailPageContract.status).toBe("executable");
  expect(detailPageContract.family).toBe("detail-page");
  expect(detailPageContract.permissions.execute).toEqual(["content:write", "content:publish"]);
  expect(detailPageContract.strictInput.notes.join(" ")).toContain(
    "DetailPageDocument.status owns publish state"
  );
  expect(getAssistantActionFamilyContract("page.update").strictInput.notes.join(" ")).toContain(
    "preserves unrelated page data"
  );
  expect(
    getAssistantActionFamilyContract("widget-template.update").strictInput.notes.join(" ")
  ).toContain("preserves unrelated blocks");
  expect(
    getAssistantActionFamilyContract("widget-template.block.patch").strictInput.notes.join(" ")
  ).toContain("one existing reusable template block");
  expect(formAutomationContract.strictInput.notes.join(" ")).toContain("non-webhook");
});

test("normalizeAssistantActionFamilyContract enforces strict contract shape", () => {
  const contract = getAssistantActionFamilyContract("entry.bulk-draft.create");

  expect(normalizeAssistantActionFamilyContract(contract)).toMatchObject({
    type: "entry.bulk-draft.create",
    status: "contract-only",
    family: "entry",
  });

  expect(() =>
    normalizeAssistantActionFamilyContract({
      ...contract,
      debug: true,
    })
  ).toThrow("assistant_action_contract_invalid");

  expect(() =>
    normalizeAssistantActionFamilyContract({
      ...contract,
      type: "database.drop",
    })
  ).toThrow("assistant_action_contract_invalid");

  expect(() =>
    normalizeAssistantActionFamilyContract({
      ...contract,
      status: "executable",
    })
  ).toThrow("assistant_action_contract_invalid");
});
