import { describe, expect, it } from "vitest";

import { getDefaultFormSettings } from "../../../core/services/forms/formSettings";
import { toStagedDetailDocument } from "../../../core/services/kits/fullSiteInstall/staging";
import { buildReferencePlan } from "../../../core/services/kits/fullSitePackage/referenceGraph";
import type { FullSitePackageV1 } from "../../../core/services/kits/fullSitePackage/types";
import { buildFormaDomContentResources } from "../../../scripts/projekty-domow/content/buildFormaDomContentResources";
import {
  buildProjectBriefForm,
  PROJECT_BRIEF_FORM_TITLE,
  PROJECT_BRIEF_INITIAL_NOTE,
  PROJECT_BRIEF_SUBMIT_LABEL,
  normalizeProjectBriefDesired,
  PROJECT_BRIEF_SUCCESS_MESSAGE,
} from "../../../scripts/projekty-domow/content/projectForm";

describe("Projekty Domów form and content slice", () => {
  it("builds five exact ordered native fields with required consent", () => {
    const desired = buildProjectBriefForm().desired;
    expect(
      (desired.fields as Array<Record<string, unknown>>).map((field) => ({
        name: field.name,
        type: field.type,
        label: field.label,
        required: field.required,
        orderIndex: field.orderIndex,
        settings: field.settings,
      }))
    ).toEqual([
      {
        name: "name",
        type: "text",
        label: "Imię i nazwisko",
        required: true,
        orderIndex: 0,
        settings: { placeholder: "Jan Kowalski" },
      },
      {
        name: "email",
        type: "email",
        label: "E-mail",
        required: true,
        orderIndex: 1,
        settings: { placeholder: "jan@email.pl" },
      },
      {
        name: "stage",
        type: "select",
        label: "Na jakim jesteś etapie?",
        required: true,
        orderIndex: 2,
        settings: {
          options: [
            "Mam działkę",
            "Szukam działki",
            "Mam gotowy projekt do adaptacji",
            "Chcę tylko konsultację",
          ],
        },
      },
      {
        name: "message",
        type: "textarea",
        label: "Krótki opis",
        required: true,
        orderIndex: 3,
        settings: {
          placeholder: "Napisz, jaki dom Ci się marzy, gdzie jest działka i jaki styl lubisz.",
        },
      },
      {
        name: "consent",
        type: "checkbox",
        label: "Zgoda na kontakt w sprawie zapytania",
        required: true,
        orderIndex: 4,
        settings: { defaultValue: false },
      },
    ]);
  });

  it("pins the exact public form title, submit copy, supporting text, and safe success action", () => {
    const desired = buildProjectBriefForm().desired;
    expect(desired.name).toBe(PROJECT_BRIEF_FORM_TITLE);
    expect(desired.description).toBeNull();
    expect(desired.settings).toEqual({
      ...getDefaultFormSettings(),
      theme: {
        submit: {
          label: PROJECT_BRIEF_SUBMIT_LABEL,
          supportingText: PROJECT_BRIEF_INITIAL_NOTE,
        },
      },
    });
    expect(desired.actions).toEqual([
      expect.objectContaining({
        type: "success_message",
        enabled: true,
        config: { message: PROJECT_BRIEF_SUCCESS_MESSAGE },
        orderIndex: 0,
      }),
    ]);
    expect(JSON.stringify(desired)).not.toMatch(
      /(?:smtp|webhook|recipient|authorization|secret|password|token)/i
    );
  });

  it("pins the native public published contract without form-level enabled", () => {
    const desired = buildProjectBriefForm().desired;
    expect(desired.status).toBe("published");
    expect(desired.submissionAccess).toBe("public");
    expect(desired).not.toHaveProperty("enabled");
    expect(desired).not.toHaveProperty("id");
  });

  it("rejects unknown form, settings, field, and action properties plus invalid access", () => {
    expect(() => normalizeProjectBriefDesired({ unknown: true })).toThrow(
      "project_brief_form_invalid"
    );
    expect(() =>
      normalizeProjectBriefDesired({
        name: "Brief",
        slug: "brief",
        status: "published",
        description: null,
        successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE,
        submissionAccess: "public",
        settings: {
          theme: {
            submit: { label: PROJECT_BRIEF_SUBMIT_LABEL, supportingText: "Hi", extra: true },
          },
        },
        fields: [
          {
            type: "text",
            label: "Name",
            name: "name",
            settings: { placeholder: "Jan", extra: true },
          },
        ],
        actions: [
          {
            type: "success_message",
            config: { message: "Hi", extra: true },
            condition: { operator: "always" },
          },
        ],
      })
    ).toThrow("project_brief_form_invalid");
    expect(() =>
      normalizeProjectBriefDesired({
        name: "Brief",
        slug: "brief",
        submissionAccess: "anonymous",
        fields: [],
        actions: [],
      })
    ).toThrow("form_invalid");
  });

  it("composes L01 and L02 without rebuilding and closes the reference graph", () => {
    const slice = buildFormaDomContentResources();
    expect(slice.contentTypes).toHaveLength(1);
    expect(slice.entries).toHaveLength(6);
    expect(slice.forms).toHaveLength(1);
    expect(slice.forms[0]?.desired).toMatchObject({
      name: PROJECT_BRIEF_FORM_TITLE,
      description: null,
      settings: {
        theme: {
          submit: {
            label: PROJECT_BRIEF_SUBMIT_LABEL,
            supportingText: PROJECT_BRIEF_INITIAL_NOTE,
          },
        },
      },
    });
    const pkg: FullSitePackageV1 = {
      schemaVersion: 1,
      key: "projekty-domow-test",
      metadata: { name: "Projekty Domów", locale: "pl" },
      resources: {
        ...slice,
        pageTemplates: [],
        pages: [],
        menus: [],
      },
    };
    expect(buildReferencePlan(pkg)).toHaveLength(12);
  });

  it("is deterministic", () => {
    expect(buildFormaDomContentResources()).toEqual(buildFormaDomContentResources());
  });

  it("stages a published detail target as draft without changing desired evidence", () => {
    const desired = buildFormaDomContentResources().detailPages[0]!.desired;
    expect(desired.status).toBe("published");
    expect(toStagedDetailDocument(desired)).toMatchObject({ status: "draft" });
    expect(desired.status).toBe("published");
  });
});
