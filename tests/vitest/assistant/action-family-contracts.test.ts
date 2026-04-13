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
  expect(isAssistantKnownActionContractType("entry.sample.create")).toBe(true);
  expect(isAssistantContractOnlyActionType("entry.sample.create")).toBe(true);
  expect(isAssistantActionType("entry.sample.create")).toBe(false);
  expect(isAssistantKnownActionContractType("database.drop")).toBe(false);
});

test("entry upsert draft action is executable and stays draft-scoped", () => {
  const contract = getAssistantActionFamilyContract("entry.upsert-draft");

  expect(contract.status).toBe("executable");
  expect(contract.family).toBe("entry");
  expect(contract.schemaOwner).toBe("core/services/content/entryService.ts");
  expect(contract.permissions.execute).toEqual(["content:write"]);
  expect(contract.strictInput.required).toEqual([
    "contentTypeSlug",
    "title",
    "slug",
    "values",
  ]);
  expect(contract.strictInput.notes.join(" ")).toContain("Draft-only");
});

test("menu seo media and surface expansion contracts declare domain permissions", () => {
  const menuContract = getAssistantActionFamilyContract("menu.item.upsert");
  expect(menuContract.status).toBe("executable");
  expect(menuContract.permissions.execute).toEqual([
    "menus:write",
  ]);
  const seoContract = getAssistantActionFamilyContract("seo.document.upsert");
  expect(seoContract.status).toBe("executable");
  expect(seoContract.permissions.execute).toEqual([
    "content:write",
  ]);
  const mediaContract = getAssistantActionFamilyContract("media.reference.attach");
  expect(mediaContract.status).toBe("executable");
  expect(
    mediaContract.strictInput.notes.join(" ")
  ).toContain("raw upload bytes");
  const formAutomationContract = getAssistantActionFamilyContract("form.automation.upsert");
  expect(formAutomationContract.status).toBe("executable");
  expect(
    getAssistantActionFamilyContract("listing-query.delete").strictInput.notes.join(" ")
  ).toContain("references");
  expect(
    getAssistantActionFamilyContract("listing-query.filters.patch").strictInput.notes.join(" ")
  ).toContain("array records");
  expect(
    getAssistantActionFamilyContract("listing-template.delete").strictInput.notes.join(" ")
  ).toContain("references");
  expect(
    getAssistantActionFamilyContract("listing-template.card.patch").strictInput.notes.join(" ")
  ).toContain("preserve unrelated");
  expect(
    getAssistantActionFamilyContract("page.widget.patch").strictInput.notes.join(" ")
  ).toContain("top-level");
  expect(formAutomationContract.strictInput.notes.join(" ")).toContain("non-webhook");
});

test("normalizeAssistantActionFamilyContract enforces strict contract shape", () => {
  const contract = getAssistantActionFamilyContract("entry.sample.create");

  expect(normalizeAssistantActionFamilyContract(contract)).toMatchObject({
    type: "entry.sample.create",
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
