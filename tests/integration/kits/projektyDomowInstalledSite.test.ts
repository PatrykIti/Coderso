import { expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import {
  contentEntries,
  contentRevisions,
  detailPageDocuments,
  detailPageRevisions,
  formActionRuns,
  formActions,
  forms,
  formSubmissions,
  listingTemplates,
  menuItems,
  menus,
  pageRevisions,
  pages,
  settings,
} from "../../../core/db/schema";
import {
  FULL_SITE_RESOURCE_ADAPTERS,
  type FullSiteResourceAdapterRegistry,
  type ResourceAdapter,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import type { FullSiteInstallResourceKind } from "../../../core/services/kits/fullSiteInstallTypes";
import type { JsonValue } from "../../../core/services/kits/fullSitePackage/types";
import { PACKAGE_RESOURCE_COLLECTIONS } from "../../../core/services/kits/fullSitePackage/types";
import {
  buildListingRuntimeParamName,
  resolveFacetToken,
} from "../../../core/services/search/filterContract";
import { PROJECT_FACET_FIELDS } from "../../../scripts/projekty-domow/content/projectListing";
import { PROJECT_BRIEF_SUCCESS_MESSAGE } from "../../../scripts/projekty-domow/content/projectForm";
import { clearSiteCache } from "../../../core/site/cache/siteCache";
import {
  INSTALLED_RESOURCE_KIND_BY_COLLECTION,
  containsPackageRef,
  createProjektyDomowInstalledHarness,
  getHtmlAttribute,
  getInstalledResourceId,
  lifecyclePhases,
  readInstalledShellState,
  readSagaPhase,
} from "./projektyDomowInstalledTestSupport";

type ObservedStagedResource = {
  identity: string;
  kind: "content_entry" | "detail_page" | "page" | "menu";
  id: string;
  desired: Record<string, JsonValue>;
};

const assertObservedLifecycleState = async (
  staged: readonly ObservedStagedResource[],
  status: "draft" | "published"
) => {
  const ids = (kind: ObservedStagedResource["kind"]) =>
    staged.filter((item) => item.kind === kind).map((item) => item.id);
  const [pageRows, entryRows, detailRows, menuRows] = await Promise.all([
    db
      .select()
      .from(pages)
      .where(inArray(pages.id, ids("page"))),
    db
      .select()
      .from(contentEntries)
      .where(inArray(contentEntries.id, ids("content_entry"))),
    db
      .select()
      .from(detailPageDocuments)
      .where(inArray(detailPageDocuments.id, ids("detail_page"))),
    db
      .select()
      .from(menus)
      .where(inArray(menus.id, ids("menu"))),
  ]);
  expect(pageRows).toHaveLength(ids("page").length);
  expect(entryRows).toHaveLength(ids("content_entry").length);
  expect(detailRows).toHaveLength(ids("detail_page").length);
  expect(menuRows).toHaveLength(ids("menu").length);
  expect(
    [...pageRows, ...entryRows, ...detailRows, ...menuRows].every((row) => row.status === status)
  ).toBe(true);
  const published = status === "published";
  expect(pageRows.every((row) => Boolean(row.publishedData) === published)).toBe(true);
  expect(entryRows.every((row) => Boolean(row.publishedAt) === published)).toBe(true);
  expect(detailRows.every((row) => Boolean(row.publishedDocument) === published)).toBe(true);
  expect(menuRows.every((row) => Boolean(row.publishedAt) === published)).toBe(true);
};

test("installs, reapplies idempotently, exposes every native resource, and rolls back shell exactly", async () => {
  const harness = await createProjektyDomowInstalledHarness();
  const { scope, package: pkg, ledger, ledgerWrites, shellBefore, actorId } = harness;
  const actor = { id: actorId };
  const stagedResources = new Map<string, ObservedStagedResource>();
  const publishedResources = new Set<string>();
  const observation = { firstDraftChecks: 0, menuPreparedChecks: 0, shellBoundaryChecks: 0 };
  const expectedLifecycleCount =
    pkg.resources.entries.length +
    pkg.resources.detailPages.length +
    pkg.resources.pages.length +
    pkg.resources.menus.length;

  const adapters = Object.fromEntries(
    Object.entries(FULL_SITE_RESOURCE_ADAPTERS).map(([rawKind, delegate]) => {
      const kind = rawKind as FullSiteInstallResourceKind;
      const observeBeforePublish = async (id: string) => {
        if (observation.firstDraftChecks === 0) {
          expect(observation.shellBoundaryChecks).toBe(1);
          expect(stagedResources.size).toBe(expectedLifecycleCount);
          await assertObservedLifecycleState([...stagedResources.values()], "draft");
          observation.firstDraftChecks += 1;
        }
        const observed = [...stagedResources.values()].find(
          (item) => item.kind === kind && item.id === id
        );
        if (kind === "menu") {
          const [row, items] = await Promise.all([
            db
              .select()
              .from(menus)
              .where(eq(menus.id, id))
              .then((rows) => rows[0]),
            db
              .select({
                id: menuItems.id,
                label: menuItems.label,
                href: menuItems.href,
                pageId: menuItems.pageId,
                parentId: menuItems.parentId,
                orderIndex: menuItems.orderIndex,
                settings: menuItems.settings,
              })
              .from(menuItems)
              .where(eq(menuItems.menuId, id))
              .orderBy(menuItems.orderIndex),
          ]);
          const envelope = row?.settings as Record<string, unknown> | null;
          const expectedEnvelope =
            observed?.desired.settings &&
            typeof observed.desired.settings === "object" &&
            !Array.isArray(observed.desired.settings)
              ? (observed.desired.settings as Record<string, unknown>)
              : null;
          expect(row?.status).toBe("draft");
          expect(items).toEqual(observed?.desired.items);
          expect(envelope?.document).toEqual(expectedEnvelope?.document);
          expect(envelope?.appearance).toEqual(expectedEnvelope?.appearance);
          observation.menuPreparedChecks += 1;
        }
        if (!observed) throw new Error("site_package_test_publish_without_stage");
        return observed;
      };
      const observePublished = (observed: ObservedStagedResource) => {
        publishedResources.add(observed.identity);
      };
      const observeShellBoundary = async () => {
        if (kind !== "setting") return;
        expect(publishedResources.size).toBe(0);
        await assertObservedLifecycleState([...stagedResources.values()], "draft");
        observation.shellBoundaryChecks += 1;
      };
      const adapter: ResourceAdapter = {
        ...delegate,
        async applyStaged(input) {
          const result = await delegate.applyStaged(input);
          if (
            kind !== "content_entry" &&
            kind !== "detail_page" &&
            kind !== "page" &&
            kind !== "menu"
          ) {
            throw new Error("site_package_test_unexpected_staged_kind");
          }
          const observed = {
            identity: `${kind}:${input.key}`,
            kind,
            id: result.id,
            desired: result.desired,
          };
          stagedResources.set(observed.identity, observed);
          return result;
        },
        async publish(id, actorId) {
          const observed = await observeBeforePublish(id);
          await delegate.publish(id, actorId);
          observePublished(observed);
        },
        ...(delegate.publishSnapshotAtomic
          ? {
              async publishSnapshotAtomic(input) {
                const observed = await observeBeforePublish(input.id);
                await delegate.publishSnapshotAtomic!(input);
                observePublished(observed);
              },
            }
          : {}),
        ...(delegate.applyBatch
          ? {
              async applyBatch(inputs) {
                await observeShellBoundary();
                return delegate.applyBatch!(inputs);
              },
            }
          : {}),
        ...(delegate.applySettingsBatchAtomic
          ? {
              async applySettingsBatchAtomic(input) {
                await observeShellBoundary();
                return delegate.applySettingsBatchAtomic!(input);
              },
            }
          : {}),
      };
      return [kind, adapter];
    })
  ) as FullSiteResourceAdapterRegistry;

  try {
    const first = await harness.apply({ adapters });
    expect(await ledger.getRun(first.runId)).toMatchObject({
      options: {
        fullSitePackage: true,
        packageFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
    expect(first.resources).toHaveLength(27);
    expect(first.resources.every((resource) => resource.id)).toBe(true);
    expect(
      first.resources.some(
        (resource) => resource.identity.startsWith("setting:") && resource.operation === "update"
      )
    ).toBe(true);
    expect(observation).toEqual({
      firstDraftChecks: 1,
      menuPreparedChecks: 1,
      shellBoundaryChecks: 1,
    });
    expect(publishedResources.size).toBe(expectedLifecycleCount);
    await assertObservedLifecycleState([...stagedResources.values()], "published");

    const pageIdentities = pkg.resources.pages.map((seed) => `page:${seed.key}`);
    const entryIdentities = pkg.resources.entries.map((seed) => `content_entry:${seed.key}`);
    const detailIdentity = `detail_page:${pkg.resources.detailPages[0]!.key}`;
    const menuIdentity = `menu:${pkg.resources.menus[0]!.key}`;
    const formIdentity = `form:${pkg.resources.forms[0]!.key}`;
    const listingTemplateIdentity = `listing_template:${pkg.resources.listingTemplates[0]!.key}`;
    const lifecycleIdentities = [
      ...pageIdentities,
      ...entryIdentities,
      detailIdentity,
      menuIdentity,
    ];

    for (const identity of lifecycleIdentities) {
      expect(lifecyclePhases(ledgerWrites, first.runId, identity)).toEqual([
        "prepared",
        "staged",
        "publish_prepared",
        "complete",
      ]);
    }
    expect(lifecyclePhases(ledgerWrites, first.runId, formIdentity)).toEqual([
      "prepared",
      "complete",
    ]);
    expect(lifecyclePhases(ledgerWrites, first.runId, listingTemplateIdentity)).toEqual([
      "prepared",
      "complete",
    ]);

    const firstItems = await ledger.listItems(first.runId);
    const formLedgerItem = firstItems.find(
      (item) => item.kind === "form" && item.key === pkg.resources.forms[0]!.key
    );
    expect(formLedgerItem?.afterSnapshot).toMatchObject({
      desired: { status: "published" },
      recovery: { schemaVersion: 1, phase: "complete", stagedSnapshot: null },
    });
    const listingTemplateLedgerItem = firstItems.find(
      (item) =>
        item.kind === "listing_template" && item.key === pkg.resources.listingTemplates[0]!.key
    );
    expect(readSagaPhase(listingTemplateLedgerItem?.afterSnapshot)).toBe("complete");
    expect(
      Object.hasOwn(
        (listingTemplateLedgerItem?.afterSnapshot?.desired as Record<string, unknown>) ?? {},
        "status"
      )
    ).toBe(false);
    for (const identity of lifecycleIdentities) {
      const separator = identity.indexOf(":");
      const item = firstItems.find(
        (candidate) =>
          candidate.kind === identity.slice(0, separator) &&
          candidate.key === identity.slice(separator + 1)
      );
      expect(item).toMatchObject({ status: "success", operation: "create" });
      expect(readSagaPhase(item?.afterSnapshot)).toBe("complete");
      expect(item?.afterSnapshot).toMatchObject({
        desired: { status: "published" },
        recovery: {
          schemaVersion: 1,
          phase: "complete",
          stagedSnapshot: { desired: { status: "draft" } },
        },
      });
    }

    const pageIds = pageIdentities.map((identity) =>
      getInstalledResourceId(first.resources, identity)
    );
    const entryIds = entryIdentities.map((identity) =>
      getInstalledResourceId(first.resources, identity)
    );
    const detailId = getInstalledResourceId(first.resources, detailIdentity);
    const menuId = getInstalledResourceId(first.resources, menuIdentity);
    const formId = getInstalledResourceId(first.resources, formIdentity);
    const listingTemplateId = getInstalledResourceId(first.resources, listingTemplateIdentity);

    const installedPages = await db.select().from(pages).where(inArray(pages.id, pageIds));
    expect(installedPages).toHaveLength(7);
    expect(
      installedPages.every(
        (page) =>
          page.status === "published" && page.publishedAt !== null && page.publishedData !== null
      )
    ).toBe(true);
    const installedPageRevisions = await db
      .select()
      .from(pageRevisions)
      .where(inArray(pageRevisions.pageId, pageIds));
    expect(installedPageRevisions).toHaveLength(7);
    expect(
      installedPageRevisions.every(
        (revision) => revision.kind === "publish" && revision.createdBy === actor.id
      )
    ).toBe(true);

    const installedEntries = await db
      .select()
      .from(contentEntries)
      .where(inArray(contentEntries.id, entryIds));
    expect(installedEntries).toHaveLength(6);
    expect(
      installedEntries.every((entry) => entry.status === "published" && entry.publishedAt !== null)
    ).toBe(true);
    const installedEntryRevisions = await db
      .select()
      .from(contentRevisions)
      .where(inArray(contentRevisions.entryId, entryIds));
    expect(installedEntryRevisions).toHaveLength(6);
    expect(installedEntryRevisions.every((revision) => revision.createdBy === actor.id)).toBe(true);

    const [installedDetail] = await db
      .select()
      .from(detailPageDocuments)
      .where(eq(detailPageDocuments.id, detailId));
    expect(installedDetail).toMatchObject({
      status: "published",
      currentDocument: { status: "published" },
      publishedDocument: { status: "published" },
    });
    expect(installedDetail?.publishedAt).not.toBeNull();
    const installedDetailRevisions = await db
      .select()
      .from(detailPageRevisions)
      .where(eq(detailPageRevisions.detailPageId, detailId));
    expect(installedDetailRevisions).toHaveLength(1);
    expect(installedDetailRevisions[0]).toMatchObject({
      kind: "publish",
      createdBy: actor.id,
      document: { status: "published" },
    });

    const [installedMenu] = await db.select().from(menus).where(eq(menus.id, menuId));
    expect(installedMenu).toMatchObject({ status: "published" });
    expect(installedMenu?.publishedAt).not.toBeNull();
    expect(installedMenu?.settings).toMatchObject({
      appearance: expect.any(Object),
      document: expect.any(Object),
      published: {
        appearance: expect.any(Object),
        document: expect.any(Object),
      },
    });

    const [installedForm] = await db.select().from(forms).where(eq(forms.id, formId));
    expect(installedForm).toMatchObject({
      status: "published",
      successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE,
      submissionAccess: "public",
    });
    const installedActions = await db
      .select()
      .from(formActions)
      .where(eq(formActions.formId, formId));
    expect(installedActions).toHaveLength(1);
    expect(installedActions[0]).toMatchObject({
      type: "success_message",
      enabled: true,
      config: { message: PROJECT_BRIEF_SUCCESS_MESSAGE },
    });

    const [installedListingTemplate] = await db
      .select()
      .from(listingTemplates)
      .where(eq(listingTemplates.id, listingTemplateId));
    expect(installedListingTemplate).toBeDefined();
    expect(Object.hasOwn(installedListingTemplate ?? {}, "status")).toBe(false);

    const pageRouteContract = [
      ["home", "Dom, który wygląda jak przyszłość — i czuje się jak Ty."],
      ["oferta", "Od pierwszej koncepcji po dokumentację gotową do budowy."],
      ["projekty", "Domy, w których łatwo wyobrazić sobie własne życie."],
      ["proces", "Spokojna droga od pierwszej rozmowy do gotowego projektu."],
      ["cennik", "Jasne zasady od pierwszej rozmowy — bez ukrytych kosztów."],
      ["o-nas", "Łączymy architekturę, technologię i emocje pierwszego wrażenia."],
      ["kontakt", "Opowiedz nam o działce, marzeniu albo pomyśle na dom."],
    ] as const;
    const resolveScopedPagePath = (baseKey: (typeof pageRouteContract)[number][0]) => {
      const seed = pkg.resources.pages.find((candidate) => candidate.key === `${baseKey}-${scope}`);
      const slug = seed?.desired.slug;
      if (typeof slug !== "string") throw new Error("site_package_acceptance_page_slug_missing");
      return slug;
    };

    clearSiteCache();
    resetRateLimitBuckets();
    const pageHtmlByKey = new Map<string, string>();
    for (const [index, [baseKey, meaningfulCopy]] of pageRouteContract.entries()) {
      const path = resolveScopedPagePath(baseKey);
      const response = await handlePublicRequest(
        new Request(`http://task-547.invalid${path}`, {
          headers: {
            "user-agent": `task-547-installed-site-${baseKey}-route-test`,
            "x-forwarded-for": `127.0.0.${60 + index}`,
          },
        })
      );
      expect(response.status).toBe(200);
      const html = await response.text();
      pageHtmlByKey.set(baseKey, html);
      expect(html).toContain('<html lang="pl">');
      expect(html).toContain('data-site-header="true"');
      expect(html).toContain(`aria-label="Główna nawigacja ${scope}"`);
      expect(html).toContain('data-site-footer="true"');
      expect(html).toContain(
        "Nowoczesne projekty domów jednorodzinnych, adaptacje, koncepcje premium i wizualizacje, które pomagają podjąć dobrą decyzję jeszcze przed budową."
      );
      expect(html).toContain('data-page-responsive="true"');
      expect(html).toContain(meaningfulCopy);
    }

    const projectsPath = resolveScopedPagePath("projekty");
    const detailPath = `/projekty-${scope}/aurora-${scope}`;
    const [installedContentRoutes] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "site.contentRoutes"));
    expect(installedContentRoutes?.value).toEqual([
      {
        type: `house-project-${scope}`,
        listPath: projectsPath,
        detailPath: `/projekty-${scope}/:slug`,
        enabled: true,
        detailPageId: detailId,
      },
    ]);
    const listingHtml = pageHtmlByKey.get("projekty") ?? "";
    expect(listingHtml).toContain('data-section-id="projects-browser"');
    expect(listingHtml).toContain("Filtruj wyniki");
    expect(listingHtml).toContain("Kategoria");
    expect(listingHtml).toContain("Nowoczesna stodoła");
    expect(listingHtml).toContain("Wille");
    expect(listingHtml).toContain("Parterowe");
    expect(listingHtml).toContain("Energooszczędne");
    expect(listingHtml).toContain("Pokaż projekty");
    expect(listingHtml).toContain("Wszystkie");
    expect(listingHtml).not.toContain("Szukaj projektu");
    expect(listingHtml).not.toContain("Wpisz nazwę projektu...");
    expect(listingHtml).not.toContain("Zobacz szczegóły");
    expect(listingHtml).toContain('data-content-list-items="6"');
    expect(listingHtml).not.toMatch(
      /Filter results|Search results|Updates automatically|Updating linked results|Read more/
    );

    const detailResponse = await handlePublicRequest(
      new Request(`http://task-547.invalid${detailPath}`, {
        headers: {
          "user-agent": "task-547-installed-site-detail-route-test",
          "x-forwarded-for": "127.0.0.67",
        },
      })
    );
    expect(detailResponse.status).toBe(200);
    const detailHtml = await detailResponse.text();
    expect(
      new Set([...pageRouteContract.map(([key]) => resolveScopedPagePath(key)), detailPath]).size
    ).toBe(8);
    expect(detailHtml).toContain('<html lang="pl">');
    expect(detailHtml).toContain('data-site-header="true"');
    expect(detailHtml).toContain(`aria-label="Główna nawigacja ${scope}"`);
    expect(detailHtml).toContain(`href="/projekty-${scope}"`);
    expect(detailHtml).toContain('data-site-footer="true"');
    expect(detailHtml).toContain(
      "Nowoczesne projekty domów jednorodzinnych, adaptacje, koncepcje premium i wizualizacje, które pomagają podjąć dobrą decyzję jeszcze przed budową."
    );
    expect(detailHtml).toContain('data-page-responsive="true"');
    expect(detailHtml).toContain('[data-site-footer="true"] [data-section-id="footer-main"]');
    expect(detailHtml).toContain('data-feature-grid-count="4"');
    expect(detailHtml).toContain('data-grid-columns-count="2"');
    expect(detailHtml).toContain('data-grid-columns-count="3"');
    expect(detailHtml).toContain('data-grid-column="column:hero-art-main"');
    expect(detailHtml).toContain('data-grid-column="column:hero-art-accent"');
    expect(detailHtml).toContain('data-grid-column="column:gallery-tall"');
    expect(detailHtml).toContain("dużym przeszkleniem");
    expect(detailHtml).toContain("142 m²");
    expect(detailHtml).toContain("A++");
    expect(detailHtml).toContain("Chcę podobny dom");
    expect(detailHtml).not.toContain("Domy, w których łatwo wyobrazić sobie własne życie.");
    expect(detailHtml).not.toMatch(
      /Build your system with Coderso|Launch modern sites|Get started|Learn more|Untitled|Read more|Media [1-4]|Content list|Choose a listing query/
    );

    const listingQueryId = getInstalledResourceId(
      first.resources,
      `listing_query:${pkg.resources.listingQueries[0]!.key}`
    );
    const categoryToken = resolveFacetToken({
      id: "category",
      kind: "radio",
      label: "Kategoria",
      field: PROJECT_FACET_FIELDS[0],
      op: "eq",
    });
    const filteredUrl = new URL(`http://task-547.invalid${projectsPath}`);
    filteredUrl.searchParams.set(
      buildListingRuntimeParamName(listingQueryId, categoryToken),
      "barn"
    );
    clearSiteCache();
    const filteredResponse = await handlePublicRequest(
      new Request(filteredUrl, {
        headers: {
          "user-agent": "task-547-installed-site-filtered-list-test",
          "x-forwarded-for": "127.0.0.68",
        },
      })
    );
    expect(filteredResponse.status).toBe(200);
    const filteredHtml = await filteredResponse.text();
    expect(filteredHtml).toContain('data-content-list-items="2"');
    expect(filteredHtml).toContain("Aurora");
    expect(filteredHtml).toContain("Mono");
    expect(filteredHtml).not.toContain("Linea");
    expect(filteredHtml).not.toContain("Nova");
    expect(filteredHtml).not.toContain("Vista");
    expect(filteredHtml).not.toContain("Calm");
    expect(filteredHtml).not.toBe(listingHtml);

    const contactHtml = pageHtmlByKey.get("kontakt") ?? "";
    const formTag = contactHtml.match(/<form[^>]*data-form-id="[^"]+"[^>]*>/)?.[0] ?? "";
    const nonceTag = contactHtml.match(/<input[^>]*data-form-security-nonce="1"[^>]*>/)?.[0] ?? "";
    const renderedFormId = getHtmlAttribute(formTag, "data-form-id");
    const nonce = getHtmlAttribute(nonceTag, "value");
    expect(renderedFormId).toBe(formId);
    expect(getHtmlAttribute(formTag, "action")).toBe(`/forms/${formId}/submissions`);
    expect(nonce).toMatch(/^\d+\.[a-f0-9]{64}$/);
    if (!nonce) throw new Error("site_package_acceptance_nonce_missing");

    const submissionUrl = `http://task-547.invalid/forms/${formId}/submissions`;
    const submittedPayload = {
      name: "Test użytkownika TASK-547",
      email: `${scope}@submission.task-547.invalid`,
      stage: "Mam działkę",
      message: `Scoped acceptance ${scope}`,
      consent: "true",
    };
    const submitPublicForm = (payload: Record<string, string>, userAgent: string) => {
      resetRateLimitBuckets();
      return handlePublicRequest(
        new Request(submissionUrl, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": userAgent,
            "x-forwarded-for": "127.0.0.1",
          },
          body: new URLSearchParams(payload),
        })
      );
    };
    const expectNoFormWrites = async () => {
      expect(
        await db.select().from(formSubmissions).where(eq(formSubmissions.formId, formId))
      ).toHaveLength(0);
      expect(
        await db.select().from(formActionRuns).where(eq(formActionRuns.formId, formId))
      ).toHaveLength(0);
    };
    const tamperedNonce = `${nonce.slice(0, -1)}${nonce.endsWith("0") ? "1" : "0"}`;
    const tamperedResponse = await submitPublicForm(
      { __nl_form_nonce: tamperedNonce, ...submittedPayload },
      "task-547-installed-site-tampered-nonce-test"
    );
    expect(tamperedResponse.status).toBe(403);
    expect(await tamperedResponse.json()).toMatchObject({ error: { code: "form_nonce_invalid" } });
    await expectNoFormWrites();

    const invalidResponse = await submitPublicForm(
      { __nl_form_nonce: nonce, name: submittedPayload.name },
      "task-547-installed-site-invalid-form-test"
    );
    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toMatchObject({
      error: { code: "form_payload_required" },
    });
    await expectNoFormWrites();

    const validResponse = await submitPublicForm(
      { __nl_form_nonce: nonce, ...submittedPayload },
      "task-547-installed-site-valid-form-test"
    );
    expect(validResponse.status).toBe(200);
    const submissionResult = (await validResponse.json()) as {
      id: string;
      formId: string;
      payload: Record<string, unknown>;
      status: string;
      runtime: { successMessage: string | null; redirectUrl: string | null };
    };
    expect(submissionResult).toMatchObject({
      formId,
      status: "new",
      payload: { ...submittedPayload, consent: true },
      runtime: {
        successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE,
        redirectUrl: null,
      },
    });
    const [storedSubmission] = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.id, submissionResult.id));
    expect(storedSubmission).toMatchObject({
      formId,
      payload: { ...submittedPayload, consent: true },
      status: "new",
      ip: "127.0.0.1",
      userAgent: "task-547-installed-site-valid-form-test",
    });
    const storedActionRuns = await db
      .select()
      .from(formActionRuns)
      .where(eq(formActionRuns.submissionId, submissionResult.id));
    expect(storedActionRuns).toHaveLength(1);
    expect(storedActionRuns[0]).toMatchObject({
      formId,
      submissionId: submissionResult.id,
      actionId: installedActions[0]!.id,
      actionType: "success_message",
      actionLabel: "Potwierdzenie wysłania",
      status: "success",
      actionConfig: { message: PROJECT_BRIEF_SUCCESS_MESSAGE },
      submissionPayload: submittedPayload,
    });

    await harness.deleteFormArtifacts();
    expect(
      await db.select().from(formActionRuns).where(eq(formActionRuns.formId, formId))
    ).toHaveLength(0);
    expect(
      await db.select().from(formSubmissions).where(eq(formSubmissions.formId, formId))
    ).toHaveLength(0);

    const second = await harness.apply();
    expect(
      second.resources
        .filter((resource) => resource.operation !== "noop")
        .map((resource) => [resource.identity, resource.operation])
    ).toEqual([]);
    expect(
      second.resources
        .filter((resource) => resource.identity.startsWith("setting:"))
        .every((resource) => resource.operation === "noop" || resource.operation === "update")
    ).toBe(true);
    expect(new Set(second.resources.map((resource) => resource.id)).size).toBe(27);
    expect(
      Object.fromEntries(second.resources.map((resource) => [resource.identity, resource.id]))
    ).toEqual(
      Object.fromEntries(first.resources.map((resource) => [resource.identity, resource.id]))
    );
    const secondItems = await ledger.listItems(second.runId);
    expect(secondItems).toHaveLength(second.resources.length);
    expect(secondItems.every((item) => item.operation === "noop")).toBe(true);
    expect(
      secondItems.every((item) => item.afterSnapshot && !containsPackageRef(item.afterSnapshot))
    ).toBe(true);

    const rollback = await harness.rollback();
    expect(await ledger.getRun(rollback.runId)).toMatchObject({
      mode: "rollback",
      status: "success",
      rollbackOfRunId: first.runId,
    });
    expect(await ledger.listItems(rollback.runId)).toHaveLength(first.resources.length);
    expect(await readInstalledShellState()).toEqual(shellBefore);
    const afterResolver = createFullSiteCurrentResourceResolver(pkg.key, ledger);
    for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
      if (collection === "settings") continue;
      for (const seed of pkg.resources[collection]) {
        expect(
          await afterResolver(INSTALLED_RESOURCE_KIND_BY_COLLECTION[collection], seed)
        ).toBeNull();
      }
    }
  } finally {
    await harness.cleanup();
  }
}, 360_000);
