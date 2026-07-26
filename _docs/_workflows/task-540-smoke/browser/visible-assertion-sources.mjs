import { invariant } from "../executor/foundation.mjs";
import {
  changedJsonPointersExact,
  collectRendererIdsExact,
  normalizeRelationEnumerationExact,
  validateCurrentDraftAuthorityExact,
  validateResetDraftAuthorityExact,
} from "../executor/json-schema.mjs";
import {
  expandRegisteredPath,
  registeredSelector,
  resolveExactRef,
  resolveFixtureValue,
} from "../executor/ref-dsl.mjs";

function resolveVisibleAssertionTarget(name, plan, captures) {
  const targetRef = plan.registries.visibleAssertionTargets[name];
  invariant(targetRef !== undefined, "visible assertion target is not registered: " + name);
  const value = resolveExactRef(
    targetRef,
    {
      plan,
      captures,
      priorOutputs: new Map(),
      variables: new Map(),
      currentOutput: null,
      root: null,
    },
    "visible assertion target " + name
  );
  invariant(
    typeof value === "string" && value.length > 0 && value.length <= 2048,
    "visible assertion target is invalid: " + name
  );
  return value;
}

function buildVisibleAssertionSource(action, name, plan, captures) {
  const assertion = plan.registries.visibleAssertions[name];
  invariant(assertion !== undefined, "unknown visible assertion: " + name);
  const ordinaryAssertion =
    assertion.schema?.type === "object" &&
    Object.hasOwn(assertion.schema.properties ?? {}, "assertion");
  const captureValue = (captureName) =>
    captures.has(captureName) ? captures.get(captureName) : null;
  const capturedBlockSelector = (captureName) => {
    const value = captureValue(captureName);
    return value === null ? null : registeredSelector(plan, "blockRoot", [value]);
  };
  const resolvedEntryBaseline =
    name === "relation-diff-exact"
      ? resolveFixtureValue(plan.fixtureBlueprint.entry.baseline, captures)
      : null;
  const relationFields = [
    {
      field: "relationA",
      rootId: plan.fixtureBlueprint.screen.blockIds.relationAField,
      rootSelector: registeredSelector(plan, "blockRoot", [
        plan.fixtureBlueprint.screen.blockIds.relationAField,
      ]),
      options: [
        {
          id: captureValue("related-entry-a1.id"),
          title: plan.fixtureBlueprint.relatedEntries.a1.title,
        },
        {
          id: captureValue("related-entry-a2.id"),
          title: plan.fixtureBlueprint.relatedEntries.a2.title,
        },
      ],
    },
    {
      field: "relationB",
      rootId: plan.fixtureBlueprint.screen.blockIds.relationBField,
      rootSelector: registeredSelector(plan, "blockRoot", [
        plan.fixtureBlueprint.screen.blockIds.relationBField,
      ]),
      options: [
        {
          id: captureValue("related-entry-b1.id"),
          title: plan.fixtureBlueprint.relatedEntries.b1.title,
        },
        {
          id: captureValue("related-entry-b2.id"),
          title: plan.fixtureBlueprint.relatedEntries.b2.title,
        },
      ],
    },
  ];
  const expectedResetDraft =
    resolvedEntryBaseline === null
      ? null
      : {
          controls: {
            headline: resolvedEntryBaseline.headline,
            mediaAssetIds: [resolvedEntryBaseline.mediaAsset],
            unrelatedNote: resolvedEntryBaseline.unrelatedNote,
          },
          presentation: { tone: "inherit" },
          relations: {
            relationA: [...resolvedEntryBaseline.relationA],
            relationB: [...resolvedEntryBaseline.relationB],
          },
        };
  const expectedRc017Draft =
    expectedResetDraft === null
      ? null
      : {
          controls: {
            ...expectedResetDraft.controls,
            unrelatedNote: plan.fixtureBlueprint.entry.relatedUnrelatedDraft,
          },
          presentation: { tone: plan.fixtureBlueprint.entry.presentationDraft.tone },
          relations: {
            relationA: [...expectedResetDraft.relations.relationA],
            relationB: [...expectedResetDraft.relations.relationB],
          },
        };
  const config = {
    name,
    actionId: action.id,
    target: ordinaryAssertion ? resolveVisibleAssertionTarget(name, plan, captures) : null,
    outputFields: Object.keys(assertion.schema.properties ?? {}),
    observationFields: ordinaryAssertion
      ? Object.keys(assertion.schema.properties.observations.properties)
      : null,
    adminOrigin: plan.fixtureBlueprint.origins.admin,
    recordsUrl: expandRegisteredPath(plan, "records", captures),
    frontSafeUrl: plan.fixtureBlueprint.paths.safeFront,
    nestedHash: plan.fixtureBlueprint.paths.nestedHash,
    screenId: captureValue("screen.id"),
    retryScreenId: captureValue("retry-screen.id"),
    entryId: captureValue("entry.id"),
    mediaId: captureValue("media.id"),
    mediaUrl: captureValue("media.resolved-url"),
    mediaTitle: plan.fixtureBlueprint.media.title,
    userAId: captureValue("user-a.id"),
    userBId: captureValue("user-b.id"),
    palette: {
      button: captureValue("palette.button"),
      image: captureValue("palette.image"),
      mediaField: captureValue("palette.media-field"),
      outerTabs: captureValue("palette.outer-tabs"),
      innerTabs: captureValue("palette.inner-tabs"),
      dirtyText: captureValue("palette.dirty-text"),
    },
    paletteSelectors: {
      button: capturedBlockSelector("palette.button"),
      outerTabs: capturedBlockSelector("palette.outer-tabs"),
      innerTabs: capturedBlockSelector("palette.inner-tabs"),
    },
    draftSelectors: {
      headline: registeredSelector(plan, "blockRoot", [
        plan.fixtureBlueprint.screen.blockIds.headlineField,
      ]),
      media: registeredSelector(plan, "blockRoot", [
        plan.fixtureBlueprint.screen.blockIds.mediaField,
      ]),
      unrelatedNote: registeredSelector(plan, "blockRoot", [
        plan.fixtureBlueprint.screen.blockIds.spaceNoteField,
      ]),
    },
    relationFields,
    blockIds: plan.fixtureBlueprint.screen.blockIds,
    retryBlockId: plan.fixtureBlueprint.retryScreen.relatedListBlockId,
    typeSlug: plan.fixtureBlueprint.contentTypes.editable.slug,
    preferencePath: "/admin/api/user-settings/customScreens.entry.preferences",
    legacyPreferenceKey: "coderso.screens.entry.preferences.v1",
    relatedListPaths: {
      a: "/admin/api/content/" + plan.fixtureBlueprint.contentTypes.relatedA.slug + "/entries",
      b: "/admin/api/content/" + plan.fixtureBlueprint.contentTypes.relatedB.slug + "/entries",
      failure:
        "/admin/api/content/" + plan.fixtureBlueprint.contentTypes.relatedFailure.slug + "/entries",
    },
    entry: plan.fixtureBlueprint.entry,
    entryBaseline: resolvedEntryBaseline,
    expectedResetDraft,
    expectedRc017Draft,
    tabs: plan.fixtureBlueprint.tabs,
    users: {
      a: { id: captureValue("user-a.id"), name: plan.fixtureBlueprint.users.a.displayName },
      b: { id: captureValue("user-b.id"), name: plan.fixtureBlueprint.users.b.displayName },
    },
    related: {
      a1: {
        id: captureValue("related-entry-a1.id"),
        title: plan.fixtureBlueprint.relatedEntries.a1.title,
        updatedTitle: plan.fixtureBlueprint.relatedEntries.a1.updatedTitle,
      },
      a2: {
        id: captureValue("related-entry-a2.id"),
        title: plan.fixtureBlueprint.relatedEntries.a2.title,
      },
      b1: {
        id: captureValue("related-entry-b1.id"),
        title: plan.fixtureBlueprint.relatedEntries.b1.title,
      },
      b2: {
        id: captureValue("related-entry-b2.id"),
        title: plan.fixtureBlueprint.relatedEntries.b2.title,
      },
      failure1: {
        id: captureValue("related-entry-failure1.id"),
        title: plan.fixtureBlueprint.relatedEntries.failure1.title,
      },
    },
    selectors: {
      canvas: registeredSelector(plan, "canvas"),
      previewShell: registeredSelector(plan, "previewShell"),
      recordActions: registeredSelector(plan, "recordActions"),
      metadata: registeredSelector(plan, "metadata"),
      relatedAlert: registeredSelector(plan, "relatedAlert"),
      relatedRetry: registeredSelector(plan, "relatedRetry"),
      canvasScroller: registeredSelector(plan, "canvasScroller"),
      editorPanel: registeredSelector(plan, "editorPanel"),
      colorMode: registeredSelector(plan, "colorMode"),
      userA: registeredSelector(plan, "userMenu", [plan.fixtureBlueprint.users.a.displayName]),
      userB: registeredSelector(plan, "userMenu", [plan.fixtureBlueprint.users.b.displayName]),
      headlineEditableBadge: registeredSelector(plan, "fieldBadge", [
        plan.fixtureBlueprint.screen.blockIds.headlineField,
        "Editable",
      ]),
      headlineTextBadge: registeredSelector(plan, "fieldBadge", [
        plan.fixtureBlueprint.screen.blockIds.headlineField,
        "Text",
      ]),
      readOnlyReadBadge: registeredSelector(plan, "fieldBadge", [
        plan.fixtureBlueprint.screen.blockIds.readOnlyField,
        "Read",
      ]),
      readOnlyTextBadge: registeredSelector(plan, "fieldBadge", [
        plan.fixtureBlueprint.screen.blockIds.readOnlyField,
        "Text",
      ]),
    },
  };
  return `(async (page) => {
    const config = ${JSON.stringify(config)};
    const context = page.context();
    const changedJsonPointers = ${changedJsonPointersExact.toString()};
    const normalizeRelationEnumeration = ${normalizeRelationEnumerationExact.toString()};
    const validateResetDraftAuthority = ${validateResetDraftAuthorityExact.toString()};
    const validateCurrentDraftAuthority = ${validateCurrentDraftAuthorityExact.toString()};
    const collectRendererIds = ${collectRendererIdsExact.toString()};
    const finiteRect = (value) => {
      if (!value) return null;
      const result = { left: value.x, right: value.x + value.width, width: value.width, height: value.height };
      if (Object.values(result).some((item) => !Number.isFinite(item))) throw new Error("wf540_nonfinite_geometry");
      return result;
    };
    const positive = (rect) => Boolean(rect && rect.width > 0 && rect.height > 0);
    const one = async (selector) => {
      const locator = page.locator(selector);
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline && await locator.count() !== 1) await page.waitForTimeout(25);
      if (await locator.count() !== 1) throw new Error("wf540_assertion_target_count");
      return locator;
    };
    const exactKeys = (value, keys) => Boolean(
      value && typeof value === "object" && !Array.isArray(value) &&
      Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    );
    const waitFor = async (read) => {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        const value = await read();
        if (value) return value;
        await page.waitForTimeout(25);
      }
      throw new Error("wf540_assertion_timeout");
    };
    const exactVisibleWithin = async (scope, selector, code) => {
      if (typeof selector !== "string" || selector.length === 0) throw new Error(code + "_selector");
      const locator = scope.locator(selector);
      return waitFor(async () => {
        if (await locator.count() !== 1) return null;
        const rect = finiteRect(await locator.boundingBox());
        return positive(rect) && await locator.isVisible() ? locator : null;
      });
    };
    const deeplyFrozen = (value, seen = new Set()) => {
      if (value === null || typeof value !== "object") return true;
      if (seen.has(value) || !Object.isFrozen(value)) return false;
      seen.add(value);
      return Object.values(value).every((child) => deeplyFrozen(child, seen));
    };
    const finalizeOutput = (value) => {
      if (["preference-a-write-hit-before-release", "preference-a-write-hit-after-release", "queued-a-write-zero-dispatch"].includes(config.name)) {
        if (!Number.isSafeInteger(value)) throw new Error("wf540_assertion_scalar_output");
        return value;
      }
      if (!exactKeys(value, config.outputFields)) throw new Error("wf540_assertion_output_keys");
      if (config.observationFields !== null) {
        if (value.assertion !== config.name || value.target !== config.target || !exactKeys(value.observations, config.observationFields)) throw new Error("wf540_assertion_observation_keys");
      }
      return value;
    };
    const safeGet = async (pathname) => {
      const response = await page.evaluate(async (target) => {
        const result = await fetch(target, { credentials: "same-origin", headers: { Accept: "application/json" } });
        return { status: result.status, text: await result.text() };
      }, pathname);
      if (response.status !== 200 || response.text.length === 0 || response.text.length > 1048576) throw new Error("wf540_assertion_api_read");
      const value = JSON.parse(response.text);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("wf540_assertion_api_shape");
      return value;
    };
    const screen = () => safeGet("/admin/api/custom-screens/" + encodeURIComponent(config.screenId));
    const entry = () => safeGet("/admin/api/content/" + encodeURIComponent(config.typeSlug) + "/entries/" + encodeURIComponent(config.entryId));
    const preference = () => safeGet("/admin/api/user-settings/customScreens.entry.preferences");
    const strictPreference = async () => {
      const value = await preference();
      if (!exactKeys(value, ["key", "value"]) || value.key !== "customScreens.entry.preferences" || !exactKeys(value.value, ["version", "showFieldMetadata"]) || value.value.version !== 1 || typeof value.value.showFieldMetadata !== "boolean") throw new Error("wf540_preference_shape");
      return { key: value.key, value: { version: 1, showFieldMetadata: value.value.showFieldMetadata } };
    };
    const overrides = async () => {
      const value = await safeGet("/admin/api/custom-screens/" + encodeURIComponent(config.screenId) + "/entries/" + encodeURIComponent(config.entryId) + "/overrides");
      if (!exactKeys(value, ["overrides"]) || !Array.isArray(value.overrides)) throw new Error("wf540_override_shape");
      const normalized = value.overrides.map((item) => {
        if (!exactKeys(item, ["blockId", "propPath", "value"]) ||
          typeof item.blockId !== "string" || item.blockId.length === 0 ||
          typeof item.propPath !== "string" || item.propPath.length === 0 ||
          typeof item.value !== "string") throw new Error("wf540_override_item_shape");
        return { blockId: item.blockId, propPath: item.propPath, value: item.value };
      }).sort((left, right) => (left.blockId + "\\u0000" + left.propPath).localeCompare(right.blockId + "\\u0000" + right.propPath));
      if (new Set(normalized.map((item) => item.blockId + "\\u0000" + item.propPath)).size !== normalized.length) throw new Error("wf540_override_duplicate");
      return normalized;
    };
    const relatedRoot = async (blockId) => {
      const root = await one('[data-screen-block-id="' + blockId + '"]');
      const rows = root.locator("[data-screen-related-entry]");
      const rowIds = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-screen-related-entry") ?? ""));
      const rowText = await rows.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()));
      const rects = [];
      for (let index = 0; index < await rows.count(); index += 1) rects.push(finiteRect(await rows.nth(index).boundingBox()));
      const skeletons = root.locator('span:text-is("Chip")');
      const skeletonRects = [];
      for (let index = 0; index < await skeletons.count(); index += 1) skeletonRects.push(finiteRect(await skeletons.nth(index).boundingBox()));
      const empty = root.locator("p", { hasText: "No related" });
      return { rootId: blockId, rowIds, rowText, rects, skeletonChipCount: await skeletons.count(), skeletonRects, emptyVisible: await empty.count() > 0 && await empty.first().isVisible() };
    };
    const entryDraft = async () => {
      const runtime = await one(config.selectors.canvasScroller);
      const content = await runtime.locator('[data-screen-section-id] [role="textbox"]').evaluateAll((nodes) => nodes.map((node) => ({
        blockId: node.closest('[data-screen-block-id]')?.getAttribute('data-screen-block-id') ?? "",
        label: node.getAttribute("aria-label"),
        text: node.textContent ?? "",
        value: "value" in node ? node.value : null,
      })).sort((left, right) => (left.blockId + "\\u0000" + left.label).localeCompare(right.blockId + "\\u0000" + right.label)));
      const panel = page.locator('[data-custom-screen-entry-presentation-panel="true"]');
      if (await panel.count() !== 1) throw new Error("wf540_presentation_panel_count");
      const presentation = await panel.evaluate((node) => node.innerHTML);
      return { content: JSON.stringify(content), presentation: JSON.stringify(presentation) };
    };
    const preferenceEffect = async () => {
      const toggle = await one(config.selectors.metadata);
      const toggleRect = finiteRect(await toggle.boundingBox());
      if (!positive(toggleRect) || !(await toggle.isVisible())) throw new Error("wf540_metadata_toggle_geometry");
      const ariaChecked = await toggle.getAttribute("aria-checked");
      const dataState = await toggle.getAttribute("data-state");
      if (ariaChecked !== "true" && ariaChecked !== "false" && dataState !== "checked" && dataState !== "unchecked") throw new Error("wf540_metadata_state");
      const visibleValue = ariaChecked === "true" || dataState === "checked";
      const badgeSelectors = [
        config.selectors.headlineEditableBadge,
        config.selectors.headlineTextBadge,
        config.selectors.readOnlyReadBadge,
        config.selectors.readOnlyTextBadge,
      ];
      let visibleBadges = 0;
      for (const selector of badgeSelectors) {
        const badge = page.locator(selector);
        if (visibleValue) {
          if (await badge.count() !== 1 || !(await badge.isVisible()) || !positive(finiteRect(await badge.boundingBox()))) throw new Error("wf540_metadata_badge_geometry");
          visibleBadges += 1;
        } else if (await badge.count() !== 0) {
          throw new Error("wf540_metadata_badge_absence");
        }
      }
      return { visibleValue, metadataEffect: visibleValue && visibleBadges === badgeSelectors.length };
    };
    const relationSelections = async () => {
      const fields = [];
      for (const expectedField of config.relationFields) {
        const root = await exactVisibleWithin(page, expectedField.rootSelector, "wf540_relation_field_root");
        const rootId = (await root.getAttribute("data-screen-block-id")) ?? "";
        const buttons = root.locator("[data-screen-relation-option-id]");
        await waitFor(async () => {
          const count = await buttons.count();
          if (count > expectedField.options.length) throw new Error("wf540_relation_option_extra");
          return count === expectedField.options.length ? true : null;
        });
        const options = [];
        for (let index = 0; index < await buttons.count(); index += 1) {
          const button = buttons.nth(index);
          const indicator = button.locator('[data-relation-selection-indicator="true"]');
          const title = button.locator("p.text-sm.font-medium");
          const rect = finiteRect(await button.boundingBox());
          options.push({
            id: (await button.getAttribute("data-screen-relation-option-id")) ?? "",
            title: await title.count() === 1 ? ((await title.textContent()) ?? "").trim() : "",
            tagName: await button.evaluate((element) => element.tagName),
            ariaPressed: (await button.getAttribute("aria-pressed")) ?? "",
            indicatorCount: await indicator.count(),
            indicatorAriaHidden: await indicator.count() === 1 ? ((await indicator.getAttribute("aria-hidden")) ?? "") : "",
            indicatorState: await indicator.count() === 1 ? ((await indicator.getAttribute("data-state")) ?? "") : "",
            nestedControlCount: await button.locator('button, [role="checkbox"]').count(),
            visible: positive(rect) && await button.isVisible(),
            enabled: await button.isEnabled(),
          });
        }
        fields.push({ field: expectedField.field, rootId, options });
      }
      return normalizeRelationEnumeration(fields, config.relationFields.map(({ field, rootId, options }) => ({ field, rootId, options })));
    };
    const readFullDraftSnapshot = async (tone, relations = null) => {
      if (typeof tone !== "string" || !["inherit", "muted"].includes(tone)) throw new Error("wf540_draft_tone");
      const runtime = await one(config.selectors.canvasScroller);
      const readTextbox = async (rootSelector, label) => {
        const root = runtime.locator(rootSelector);
        if (await root.count() !== 1) throw new Error("wf540_draft_control_root");
        const textbox = root.locator('[role="textbox"]');
        if (await textbox.count() !== 1 || (await textbox.getAttribute("aria-label")) !== label) throw new Error("wf540_draft_textbox");
        const value = await textbox.evaluate((node) => "value" in node ? node.value : node.textContent ?? "");
        if (typeof value !== "string") throw new Error("wf540_draft_textbox_value");
        return value;
      };
      const mediaRoot = runtime.locator(config.draftSelectors.media);
      if (await mediaRoot.count() !== 1) throw new Error("wf540_draft_media_root");
      const selectedMedia = mediaRoot.locator("[data-media-picker-selected-id]");
      await waitFor(async () => {
        const count = await selectedMedia.count();
        if (count > 1) throw new Error("wf540_draft_media_extra");
        if (count !== 1) return null;
        const rect = finiteRect(await selectedMedia.boundingBox());
        return positive(rect) && await selectedMedia.isVisible() ? true : null;
      });
      const mediaAssetIds = await selectedMedia.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-media-picker-selected-id") ?? ""));
      if (mediaAssetIds.length !== 1 || mediaAssetIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) || new Set(mediaAssetIds).size !== mediaAssetIds.length) throw new Error("wf540_draft_media_ids");
      const relationState = relations ?? await relationSelections();
      return {
        controls: {
          headline: await readTextbox(config.draftSelectors.headline, "Headline"),
          mediaAssetIds,
          unrelatedNote: await readTextbox(config.draftSelectors.unrelatedNote, "Unrelated note"),
        },
        presentation: { tone },
        relations: { relationA: [...relationState.relationA], relationB: [...relationState.relationB] },
      };
    };
    const ownedTabs = async (root) => root.evaluate((element) => {
      const owns = (node) => node.closest('[data-screen-block-id]') === element;
      const tabs = [...element.querySelectorAll('[role="tab"]')].filter(owns);
      const panels = [...element.querySelectorAll('[role="tabpanel"]')].filter(owns);
      const rawTabId = (tab) => panels.find((panel) => panel.id === tab.getAttribute("aria-controls"))?.getAttribute("data-screen-runtime-tab") ?? "";
      return {
        tabs: tabs.map((tab) => ({
          tabId: rawTabId(tab),
          domTabId: tab.id,
          label: (tab.textContent ?? "").trim(),
          ariaControls: tab.getAttribute("aria-controls") ?? "",
          selected: tab.getAttribute("aria-selected") === "true",
        })),
        panels: panels.map((panel) => ({
          panelId: panel.getAttribute("data-screen-runtime-tab") ?? "",
          domPanelId: panel.id,
          ariaLabelledBy: panel.getAttribute("aria-labelledby") ?? "",
          hidden: panel.hidden,
        })),
      };
    });
    const ordinary = (observations) => ({ assertion: config.name, target: config.target, observations });
    let output;
    if (config.name === "media-cache-cold-before-route") {
      const canvas = await one(config.selectors.canvas);
      output = { builderUrl: page.url(), builderMarkerVisible: positive(finiteRect(await canvas.boundingBox())) && await canvas.isVisible(), localStorageAbsent: await page.evaluate(() => localStorage.getItem("media:list") === null), mediaGetCount: context.__wf540ReadMediaGetCount() };
    } else if (["prior-media-resolution-pending", "newer-media-winner-selected-pending", "stale-media-result-ignored"].includes(config.name)) {
      const root = await one('[data-screen-block-id="' + config.blockIds.raceImage + '"]');
      const placeholder = root.locator('[data-image-disabled="true"]');
      const common = { overridePresent: (await root.getAttribute("data-screen-presentation-override")) === "true", imagePresent: await root.locator("img").count() > 0, placeholderVisible: await placeholder.count() === 1 && positive(finiteRect(await placeholder.boundingBox())) && await placeholder.isVisible() };
      if (config.name === "newer-media-winner-selected-pending") {
        const dirty = page.getByText("Unsaved presentation", { exact: true });
        output = { ...common, presentationDirtyVisible: await dirty.count() === 1 && await dirty.isVisible(), mediaGetCount: context.__wf540ReadMediaGetCount() };
      } else if (config.name === "stale-media-result-ignored") {
        const images = await root.locator("img").evaluateAll((nodes) => nodes.map((node) => node.src));
        const acquiredUrl = await page.evaluate((value) => new URL(value, location.href).href, config.mediaUrl);
        output = { ...common, acquiredUrlPresent: images.some((value) => value === acquiredUrl), mediaGetCount: context.__wf540ReadMediaGetCount() };
      } else output = { ...common, mediaGetCount: context.__wf540ReadMediaGetCount() };
    } else if (["preference-a-write-hit-before-release", "preference-a-write-hit-after-release", "queued-a-write-zero-dispatch"].includes(config.name)) {
      const hits = context.__wf540RouteGet("preference-a-write-exit").hits();
      output = config.name === "queued-a-write-zero-dispatch" ? Math.max(0, hits - 1) : hits;
    } else if (config.name === "persisted-no-empty-binding") {
      const persisted = await screen();
      const bindings = persisted.definition?.editorView?.bindings ?? persisted.bindings ?? [];
      const href = bindings.filter((item) => item.blockId === config.palette.button && item.propPath === "href");
      output = ordinary({ screenId: persisted.id, hrefBindingCount: href.length, hrefBindingField: href[0]?.field ?? null, emptyFieldCount: bindings.filter((item) => item.field === "").length });
    } else if (config.name === "safe-link-front-url") {
      const sample = context.__wf540Recall("bi-056a-safe-link-observe");
      output = ordinary({ tagName: sample.tagName, href: sample.href, pageUrl: page.url() });
    } else if (config.name === "unsafe-link-disabled") {
      const root = await exactVisibleWithin(page, config.paletteSelectors.button, "wf540_button_root");
      const affordance = root.locator('[data-screen-button-affordance="true"]');
      if (await affordance.count() !== 1) throw new Error("wf540_button_affordance_count");
      output = ordinary({ tagName: await affordance.evaluate((element) => element.tagName), ariaDisabled: await affordance.getAttribute("aria-disabled"), href: await affordance.getAttribute("href"), anchorCount: await root.locator("a").count() });
    } else if (config.name === "direct-image-safe-url") {
      const root = await one('[data-screen-block-id="' + config.target + '"]');
      const images = root.locator("img");
      const imageCount = await images.count();
      if (imageCount !== 1) throw new Error("wf540_direct_image_count");
      const src = await images.evaluate((image) => image.src);
      if (typeof config.mediaUrl !== "string" || !config.mediaUrl.includes("://")) {
        throw new Error("wf540_direct_image_expected_url");
      }
      if (src !== config.mediaUrl) {
        const pathname = (href) => {
          const scheme = href.indexOf("://");
          const start = href.indexOf("/", scheme === -1 ? 0 : scheme + 3);
          return start === -1 ? "/" : href.slice(start);
        };
        throw new Error(
          pathname(src) === pathname(config.mediaUrl)
            ? "wf540_direct_image_origin_mismatch"
            : "wf540_direct_image_url_mismatch"
        );
      }
      const placeholderVisible = await root.locator('[data-image-disabled="true"]').count() > 0;
      if (placeholderVisible) throw new Error("wf540_direct_image_placeholder_visible");
      output = ordinary({ imageCount, src, placeholderVisible });
    } else if (config.name === "missing-or-unsafe-placeholder") {
      const root = await one('[data-screen-block-id="' + config.target + '"]');
      const placeholder = root.locator('[data-image-disabled="true"]');
      const unsafeUrlPresent = await root.evaluate((element) => [...element.querySelectorAll("*")].some((node) =>
        ["href", "src", "xlink:href"].some((attribute) => (node.getAttribute(attribute) ?? "").trim().toLowerCase().startsWith("javascript:"))
      ));
      output = ordinary({ imageCount: await root.locator("img").count(), placeholderVisible: await placeholder.count() === 1 && await placeholder.isVisible() && positive(finiteRect(await placeholder.boundingBox())), unsafeUrlPresent });
    } else if (config.name === "media-field-keeps-uuid") {
      const persisted = await entry();
      const root = await one('[data-screen-block-id="' + config.target + '"]');
      const title = root.locator('p:text-is("' + config.mediaTitle + '")');
      if (await title.count() !== 1 || !(await title.isVisible()) || !positive(finiteRect(await title.boundingBox()))) throw new Error("wf540_media_title_geometry");
      const image = root.locator("img");
      if (await image.count() !== 1 || !(await image.isVisible()) || !positive(finiteRect(await image.boundingBox()))) throw new Error("wf540_media_image_geometry");
      const selectedMediaTitle = (await title.textContent())?.trim() ?? "";
      const selectedImageSrc = await image.evaluate((node) => node.src);
      const persistedMediaId = persisted.data?.mediaAsset ?? null;
      output = ordinary({ selectedMediaTitle, selectedImageSrc, persistedMediaId, persistedResolvedUrlPresent: JSON.stringify(persistedMediaId).includes(config.mediaUrl) });
    } else if (config.name === "three-tabs-persisted") {
      const persisted = await screen();
      const canvas = await one(config.selectors.canvas);
      const root = await exactVisibleWithin(canvas, config.paletteSelectors.outerTabs, "wf540_builder_outer_tabs");
      const owned = await ownedTabs(root);
      const tabIds = owned.tabs.map(({ tabId }) => tabId);
      const labels = owned.tabs.map(({ label }) => label);
      const slotIds = owned.panels.map(({ panelId }) => panelId);
      const nestedText = [];
      for (const expectedText of Object.values(config.tabs.text)) {
        const text = root.locator('p:text-is("' + expectedText + '")');
        if (await text.count() !== 1) throw new Error("wf540_tab_text_count");
        nestedText.push((await text.textContent())?.trim() ?? "");
      }
      if (!JSON.stringify(persisted.definition ?? {}).includes(nestedText[0])) throw new Error("wf540_tab_persistence");
      output = ordinary({ tabIds, labels, slotIds, nestedText });
    } else if (config.name === "one-panel-visible") {
      const sample = context.__wf540Recall("tc-038-history-state");
      output = ordinary({ activeTabId: sample.activeTabId, visiblePanelIds: sample.visiblePanelIds, visibleRects: sample.rects.filter(positive) });
    } else if (config.name === "other-panels-zero-geometry") {
      const sample = context.__wf540Recall("tc-038-history-state");
      const hiddenRects = sample.rects.filter((rect) => !positive(rect));
      output = ordinary({ hiddenPanelIds: sample.hiddenPanelIds, hiddenValues: sample.hiddenPanelIds.map(() => true), rects: hiddenRects });
    } else if (config.name === "armed-slot-equals-active-tab") {
      const samples = [context.__wf540Recall("tc-036-details-state"), context.__wf540Recall("tc-038-history-state")];
      const selectedTabId = [];
      const canvas = await one(config.selectors.canvas);
      const root = await exactVisibleWithin(canvas, config.paletteSelectors.outerTabs, "wf540_armed_outer_tabs");
      const current = await ownedTabs(root);
      selectedTabId.push(samples[0].activeTabId, current.tabs.find(({ selected }) => selected)?.tabId ?? "");
      output = ordinary({ activeTabId: samples.map((item) => item.activeTabId), armedSlotId: samples.map((item) => item.armedSlotId), selectedTabId });
    } else if (config.name === "arrow-home-end-focus") {
      output = ordinary({ steps: ["tk-014-observe-left", "tk-016-observe-right", "tk-018-observe-home", "tk-020-observe-end"].map((id) => context.__wf540Recall(id)) });
    } else if (config.name === "aria-reciprocal") {
      const previewShell = await exactVisibleWithin(page, config.selectors.previewShell, "wf540_aria_preview_shell");
      const root = await exactVisibleWithin(previewShell, config.paletteSelectors.outerTabs, "wf540_aria_outer_tabs");
      const owned = await ownedTabs(root);
      const pairs = owned.tabs.map((tab) => {
        const panel = owned.panels.find(({ domPanelId }) => domPanelId === tab.ariaControls);
        if (!panel) throw new Error("wf540_aria_panel_missing");
        if (panel.ariaLabelledBy !== tab.domTabId) throw new Error("wf540_aria_reciprocal");
        return { tabId: tab.tabId, panelId: panel.panelId, ariaControls: panel.panelId, ariaLabelledBy: tab.tabId, selected: tab.selected, hidden: panel.hidden };
      });
      const visiblePanelId = owned.panels.find(({ hidden }) => !hidden)?.panelId ?? "";
      const hiddenPanelIds = owned.panels.filter(({ hidden }) => hidden).map(({ panelId }) => panelId);
      output = ordinary({ pairs, visiblePanelId, hiddenPanelIds });
    } else if (config.name === "nested-tabs-isolated") {
      const previewShell = await exactVisibleWithin(page, config.selectors.previewShell, "wf540_nested_preview_shell");
      const outer = await exactVisibleWithin(previewShell, config.paletteSelectors.outerTabs, "wf540_nested_outer_tabs");
      const inner = await exactVisibleWithin(outer, config.paletteSelectors.innerTabs, "wf540_nested_inner_tabs");
      const outerOwned = await ownedTabs(outer);
      const innerOwned = await ownedTabs(inner);
      output = ordinary({ outerRootId: await outer.getAttribute("data-screen-block-id"), innerRootId: await inner.getAttribute("data-screen-block-id"), outerSelectedId: outerOwned.tabs.find(({ selected }) => selected)?.tabId ?? "", innerSelectedId: innerOwned.tabs.find(({ selected }) => selected)?.tabId ?? "" });
    } else if (config.name === "renderer-ids-unique") {
      const readRendererRealm = async (surfaceSelector) => {
        const surface = await exactVisibleWithin(page, surfaceSelector, "wf540_renderer_surface");
        const outer = await exactVisibleWithin(surface, config.paletteSelectors.outerTabs, "wf540_renderer_outer_tabs");
        const inner = await exactVisibleWithin(outer, config.paletteSelectors.innerTabs, "wf540_renderer_inner_tabs");
        return { outer: await ownedTabs(outer), inner: await ownedTabs(inner) };
      };
      const builderRealm = await readRendererRealm(config.selectors.canvas);
      const previewRealm = await readRendererRealm(config.selectors.previewShell);
      const ids = collectRendererIds([builderRealm, previewRealm]);
      output = ordinary({ ids, uniqueCount: new Set(ids).size });
    } else if (config.name === "space-text-preserved") {
      const editor = await one('[data-screen-block-id="' + config.blockIds.spaceNoteField + '"] [role="textbox"]');
      output = ordinary({ text: (await editor.textContent()) ?? "", expectedText: config.entry.spacePhrase });
    } else if (config.name === "nested-controls-do-not-select") {
      const before = context.__wf540Recall("ss-011-selection-before");
      const afterInput = context.__wf540Recall("ss-022-selection-after-input");
      const afterLink = context.__wf540Recall("ss-024-selection-after-link");
      output = ordinary({ linkActivated: afterLink.url.endsWith(config.nestedHash), inputFocused: afterInput.focused, selectedBefore: before.selectedBlockId, selectedAfter: afterLink.selectedBlockId });
    } else if (config.name === "selection-handle-independent") {
      output = ordinary(context.__wf540Recall("selection-handle"));
    } else if (config.name === "builder-cancel-byte-identical") {
      const before = context.__wf540Recall("dg-011-builder-before-cancel");
      const draftAfter = await page.locator(config.selectors.canvas).evaluate((node) => JSON.stringify({ text: node.textContent, html: node.innerHTML }));
      output = ordinary({ draftBefore: before.draftBytes, draftAfter, urlBefore: before.url, urlAfter: page.url() });
    } else if (config.name === "builder-confirm-navigates-once") {
      const before = context.__wf540Recall("dg-011-builder-before-cancel");
      const expectedRecordsUrl = config.recordsUrl;
      const recordActions = page.locator(config.selectors.recordActions);
      const builderCanvas = page.locator(config.selectors.canvas);
      const builderDirtyBadge = page.getByText("Unsaved changes", { exact: true });
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        const count = await recordActions.count();
        const rect = count === 1 ? finiteRect(await recordActions.boundingBox()) : null;
        const builderCanvasCount = await builderCanvas.count();
        const builderDirtyBadgeCount = await builderDirtyBadge.count();
        if (page.url() === expectedRecordsUrl && count === 1 && await recordActions.isVisible() && positive(rect) && builderCanvasCount === 0 && builderDirtyBadgeCount === 0) break;
        if (count > 1) throw new Error("wf540_builder_confirm_record_actions_duplicate");
        await page.waitForTimeout(25);
      }
      const recordActionsCount = await recordActions.count();
      const recordActionsRect = recordActionsCount === 1 ? finiteRect(await recordActions.boundingBox()) : null;
      const builderCanvasCount = await builderCanvas.count();
      const builderDirtyBadgeCount = await builderDirtyBadge.count();
      if (page.url() !== expectedRecordsUrl) throw new Error("wf540_builder_confirm_records_url");
      if (recordActionsCount !== 1 || !(await recordActions.isVisible()) || !positive(recordActionsRect)) throw new Error("wf540_builder_confirm_records_workspace");
      if (builderCanvasCount !== 0 || builderDirtyBadgeCount !== 0) throw new Error("wf540_builder_confirm_draft_retained");
      output = ordinary({ urlBefore: before.url, urlAfter: page.url(), navigationCount: page.__wf540ReadNavigationCount() - before.navigationCount, draftDiscarded: builderCanvasCount === 0 && builderDirtyBadgeCount === 0 });
    } else if (config.name === "entry-cancel-byte-identical" || config.name === "entry-cancel-url-stable") {
      const before = context.__wf540Recall("dg-023-entry-before-cancel");
      const after = await entryDraft();
      output = config.name === "entry-cancel-byte-identical" ? ordinary({ contentBefore: before.contentBytes, contentAfter: after.content, presentationBefore: before.presentationBytes, presentationAfter: after.presentation }) : ordinary({ urlBefore: before.url, urlAfter: page.url() });
    } else if (config.name === "entry-confirm-navigates-once") {
      const before = context.__wf540Recall("dg-023-entry-before-cancel");
      output = ordinary({ urlBefore: before.url, urlAfter: page.url(), navigationCount: page.__wf540ReadNavigationCount() - before.navigationCount });
    } else if (config.name === "entry-error-retains-both-drafts") {
      const headline = await one('[data-screen-block-id="' + config.blockIds.headlineField + '"] [role="textbox"][aria-label="Headline"]');
      const presentationPanel = await one('[data-custom-screen-entry-presentation-panel="true"]');
      const tone = presentationPanel.locator('[data-presentation-control="tone"] button[role="combobox"]');
      if (await tone.count() !== 1) throw new Error("wf540_tone_control_count");
      const toneValue = (await tone.textContent())?.trim().toLowerCase() ?? "";
      const contentValue = await headline.evaluate((node) => "value" in node ? node.value : node.textContent ?? "");
      const alert = page.locator('[role="alert"]');
      output = ordinary({ errorVisible: await alert.count() > 0 && await alert.first().isVisible(), contentValue, presentationValue: { tone: toneValue }, contentDirty: (await page.getByText("Unsaved changes", { exact: true }).count()) > 0, presentationDirty: (await page.getByText("Unsaved presentation", { exact: true }).count()) > 0 });
    } else if (config.name === "beforeunload-active") {
      const observed = await page.evaluate(() => { const event = new Event("beforeunload", { cancelable: true }); const dispatched = window.dispatchEvent(event); return { defaultPrevented: event.defaultPrevented || !dispatched, returnValueSet: event.returnValue !== true && event.returnValue !== undefined }; });
      output = ordinary(observed);
    } else if (config.name === "successful-retry-clears-persisted-channel") {
      const persisted = await entry();
      const persistedOverrides = await overrides();
      const before = context.__wf540Recall("dg-023-entry-before-cancel");
      const currentDraft = await entryDraft();
      const presentationPanel = await one('[data-custom-screen-entry-presentation-panel="true"]');
      const tone = presentationPanel.locator('[data-presentation-control="tone"] button[role="combobox"]');
      if (await tone.count() !== 1) throw new Error("wf540_retry_tone_control_count");
      const toneValue = (await tone.textContent())?.trim().toLowerCase() ?? "";
      const serverContainsIntentionalDraft = persistedOverrides.some((item) =>
        item && item.blockId === config.blockIds.headlineField && item.propPath === "tone" && item.value === config.entry.presentationDraft.tone
      );
      const contentDirty = (await page.getByText("Unsaved changes", { exact: true }).count()) > 0;
      const presentationDirty = (await page.getByText("Unsaved presentation", { exact: true }).count()) === 1;
      output = ordinary({
        persistedContentMatches: persisted.data?.headline === config.entry.contentDraft,
        persistedPresentationUnchanged: persistedOverrides.length === 0 && !serverContainsIntentionalDraft,
        localPresentationPreserved: currentDraft.presentation === before.presentationBytes && toneValue === config.entry.presentationDraft.tone,
        contentDirty,
        presentationDirty,
      });
    } else if (config.name === "related-error-visible-before-retry" || config.name === "visible-retry-succeeds") {
      const settled = await waitFor(async () => {
        const root = await relatedRoot(config.retryBlockId);
        const errorVisible = await page.locator(config.selectors.relatedAlert).count() === 1 && await page.locator(config.selectors.relatedAlert).isVisible();
        const retryVisible = await page.locator(config.selectors.relatedRetry).count() === 1 && await page.locator(config.selectors.relatedRetry).isVisible();
        const ready = config.name === "related-error-visible-before-retry"
          ? errorVisible && retryVisible && root.rowIds.length === 0 && root.skeletonChipCount === 3 && !root.emptyVisible
          : !errorVisible && !retryVisible && root.rowIds.length === 1 && root.rects.every(positive) && root.skeletonChipCount === 0 && !root.emptyVisible;
        return ready ? { root, errorVisible, retryVisible } : null;
      });
      const { root, errorVisible, retryVisible } = settled;
      output = config.name === "related-error-visible-before-retry" ? ordinary({ rootId: root.rootId, errorVisible, retryVisible, rowCount: root.rowIds.length, skeletonChipCount: root.skeletonChipCount, skeletonRects: root.skeletonRects, emptyVisible: root.emptyVisible }) : ordinary({ rootId: root.rootId, errorVisible, retryVisible, failureRowIds: root.rowIds, failureRowRects: root.rects, skeletonVisible: root.skeletonChipCount > 0, emptyVisible: root.emptyVisible });
    } else if (config.name === "same-target-visible-rows-retained") {
      const before = context.__wf540Recall("rc-017a-pre-route-a-baseline");
      const pending = await relatedRoot(config.blockIds.relatedListA);
      const alert = page.locator(config.selectors.relatedAlert);
      output = ordinary({ rootId: pending.rootId, rowIdsBefore: before.rowIds, rowIdsPending: pending.rowIds, rowTextBefore: before.rowText, rowTextPending: pending.rowText, rectsBefore: before.rects, rectsPending: pending.rects, errorVisible: await alert.count() === 1 && await alert.isVisible(), skeletonVisible: pending.skeletonChipCount > 0, emptyVisible: pending.emptyVisible });
    } else if (config.name === "target-switch-immediate-empty") {
      const a = await relatedRoot(config.blockIds.relatedListA);
      const b = await relatedRoot(config.blockIds.relatedListB);
      output = ordinary({ aRootId: a.rootId, bRootId: b.rootId, aRowCount: a.rowIds.length, bRowCount: b.rowIds.length, aEmptyVisible: a.emptyVisible, bEmptyVisible: b.emptyVisible, aSkeletonChipCount: a.skeletonChipCount, bSkeletonChipCount: b.skeletonChipCount, skeletonRects: [...a.skeletonRects, ...b.skeletonRects] });
    } else if (config.name === "only-b-rows-visible") {
      const b = await relatedRoot(config.blockIds.relatedListB);
      const baseline = context.__wf540Recall("rc-012c-picker-warm-proof").bListGetCount;
      const counts = context.__wf540ReadRelatedListGetCounts();
      if (!Object.prototype.hasOwnProperty.call(counts, config.relatedListPaths.b)) throw new Error("wf540_related_b_count_path");
      const current = counts[config.relatedListPaths.b];
      output = ordinary({ rootId: b.rootId, visibleRowIds: b.rowIds, visibleRects: b.rects, skeletonVisible: b.skeletonChipCount > 0, emptyVisible: b.emptyVisible, bListGetCountBaseline: baseline, bListGetCount: current, bListGetDelta: current - baseline });
    } else if (config.name === "unrelated-draft-byte-identical") {
      const before = context.__wf540Recall("rc-017-unrelated-before");
      const after = await entryDraft();
      output = ordinary({ contentBefore: before.contentBytes, contentAfter: after.content, presentationBefore: before.presentationBytes, presentationAfter: after.presentation });
    } else if (config.name === "relation-diff-exact") {
      const before = context.__wf540Recall("rc-017-private-authority");
      const observedRelationIds = {
        relationA: config.relationFields[0].options.map(({ id }) => id),
        relationB: config.relationFields[1].options.map(({ id }) => id),
      };
      const resetExpected = {
        sourceActionId: "rc-002-entry-proof",
        capturedAtActionId: "rc-012c-picker-warm-proof",
        persistedData: config.entryBaseline,
        resetDraft: config.expectedResetDraft,
        observedRelationIds,
      };
      validateResetDraftAuthority(before.resetAuthority, resetExpected);
      validateCurrentDraftAuthority(before, {
        sourceActionId: "rc-017-unrelated-before",
        capturedAtActionId: "rc-017-unrelated-before",
        resetSourceActionId: "rc-002-entry-proof",
        currentDraft: config.expectedRc017Draft,
        observedRelationIds,
        diffFromReset: ["/controls/unrelatedNote", "/presentation/tone"],
      });
      const after = await relationSelections();
      const tone = page.locator('[data-custom-screen-entry-presentation-panel="true"] [data-presentation-control="tone"] button[role="combobox"]');
      if (await tone.count() !== 1) throw new Error("wf540_rc032_tone_count");
      const currentDraft = await readFullDraftSnapshot(((await tone.textContent()) ?? "").trim().toLowerCase(), after);
      const allDiffPaths = changedJsonPointers(before.draft, currentDraft);
      const relationRoots = ["/relations/relationA", "/relations/relationB"];
      const isRelationPath = (pointer) => relationRoots.some((root) => pointer === root || pointer.startsWith(root + "/"));
      const relationDiffPaths = allDiffPaths.filter(isRelationPath);
      const otherDiffPaths = allDiffPaths.filter((pointer) => !isRelationPath(pointer));
      if (relationDiffPaths.length === 0 || allDiffPaths.length !== relationDiffPaths.length || otherDiffPaths.length !== 0) throw new Error("wf540_rc032_union_leaf_scope");
      const relationBefore = before.resetAuthority.draft.relations;
      output = ordinary({ relationABefore: [...relationBefore.relationA], relationAAfter: after.relationA, relationBBefore: [...relationBefore.relationB], relationBAfter: after.relationB, otherDiffPaths });
    } else if (config.name === "stale-a-cannot-commit") {
      const a = await relatedRoot(config.blockIds.relatedListA);
      const b = await relatedRoot(config.blockIds.relatedListB);
      output = ordinary({ aRootId: a.rootId, bRootId: b.rootId, aRowCount: a.rowIds.length, bRowIds: b.rowIds, staleATextPresent: a.rowText.some((value) => value.includes(config.related.a1.updatedTitle)) });
    } else if (config.name === "flow6-exit-discarded-once") {
      const baseline = context.__wf540Recall("rc-017a-pre-route-a-baseline").navigationCount;
      const current = page.__wf540ReadNavigationCount();
      output = ordinary({ url: page.url(), navigationCountBaseline: baseline, navigationCountCurrent: current, navigationCountDelta: current - baseline, entryDirtyBadgeCount: await page.getByText("Unsaved changes", { exact: true }).count(), presentationDirtyBadgeCount: await page.getByText("Unsaved presentation", { exact: true }).count() });
    } else if (config.name === "narrow-padding-and-positive-geometry" || config.name === "wide-padding-delta-300" || config.name === "panel-inside-viewport") {
      const ids = config.name === "narrow-padding-and-positive-geometry" ? ["ru-010-closed-320", "ru-012-open-320", "ru-015-closed-390", "ru-017-open-390", "ru-020-closed-480", "ru-022-open-480"] : config.name === "wide-padding-delta-300" ? ["ru-025-closed-1024", "ru-027-open-1024", "ru-030-closed-1280", "ru-032-open-1280"] : ["ru-012-open-320", "ru-017-open-390", "ru-022-open-480", "ru-027-open-1024", "ru-032-open-1280"];
      output = ordinary({ samples: ids.map((id) => context.__wf540Recall(id)) });
    } else if (config.name === "same-user-authoritative-refresh") {
      const before = context.__wf540Recall("ru-047-a-write-settle");
      const server = await strictPreference();
      const effect = await preferenceEffect();
      output = ordinary({ before: before.value.showFieldMetadata, server: server.value.showFieldMetadata, after: effect.visibleValue, metadataEffect: effect.metadataEffect });
    } else if (config.name === "same-user-retained-view-pending") {
      const durable = context.__wf540Recall("ru-053b-a-nondefault-write-settled");
      const effect = await preferenceEffect();
      output = ordinary({ visibleValue: effect.visibleValue, durableA: durable.value.showFieldMetadata, readPending: context.__wf540RouteGet("preference-a-read-refresh").hits() === 1, metadataEffect: effect.metadataEffect });
    } else if (config.name === "newer-local-write-pending") {
      const write = context.__wf540Recall("ru-059a-new-local-browser-write-settled");
      const effect = await preferenceEffect();
      output = ordinary({ visibleValue: effect.visibleValue, newLocalValue: write.value.showFieldMetadata, readPending: context.__wf540RouteGet("preference-a-read-refresh").hits() === 1, metadataEffect: effect.metadataEffect });
    } else if (config.name === "newer-local-write-wins-refresh") {
      const durable = context.__wf540Recall("ru-059a-new-local-browser-write-settled");
      const routeProjection = context.__wf540RouteGet("preference-a-read-refresh").projection();
      const effect = await preferenceEffect();
      output = ordinary({ visibleValue: effect.visibleValue, persistedValue: durable.value.showFieldMetadata, staleReadValue: routeProjection.preferenceValue, metadataEffect: effect.metadataEffect });
    } else if (config.name === "legacy-local-storage-absent") {
      const observed = await page.evaluate((key) => ({
        key,
        value: localStorage.getItem(key),
        writeCount: typeof window.__wf540ReadLegacyStorageWrites === "function" ? window.__wf540ReadLegacyStorageWrites() : -1,
      }), config.legacyPreferenceKey);
      output = ordinary(observed);
    } else if (config.name === "light-and-dark-computed") {
      output = ordinary({ userA: context.__wf540Recall("ru-045-a-light-capture"), userB: context.__wf540Recall("ru-072-b-dark-capture") });
    } else if (config.name === "user-a-b-a-isolated") {
      const first = context.__wf540Recall("ru-047-a-write-settle");
      const b = context.__wf540Recall("ru-072-b-dark-capture");
      const returned = await preferenceEffect();
      const durable = await strictPreference();
      // rootColor must match themeSample's root-scoped token read, not the root element's own
      // background: the html element carries no background here, so its computed
      // background-color is rgba(0, 0, 0, 0) in both modes and this action's inequality
      // against the dark capture could never hold. See browser/observation-sources.mjs.
      const computed = await page.evaluate(() => ({ theme: document.documentElement.classList.contains("dark") ? "dark" : "light", rootColor: getComputedStyle(document.documentElement).getPropertyValue("--background").trim(), bodyColor: getComputedStyle(document.body).backgroundColor }));
      const toggleAriaPressed = await (await one(config.selectors.colorMode)).getAttribute("aria-pressed");
      if (toggleAriaPressed !== "true" && toggleAriaPressed !== "false") throw new Error("wf540_return_theme_toggle");
      output = ordinary({ userAFirst: first.value.showFieldMetadata, userB: b.metadataEffect, userAReturn: returned.visibleValue, durableA: durable.value.showFieldMetadata, metadataEffects: { userAFirst: first.switchChecked && positive(first.metadataRect), userB: b.metadataEffect, userAReturn: returned.metadataEffect }, userAReturnComputed: { ...computed, toggleAriaPressed } });
    } else if (config.name === "second-a-intent-visible-before-exit") {
      const route = context.__wf540RouteGet("preference-a-write-exit");
      const effect = await preferenceEffect();
      output = ordinary({ visibleValue: effect.visibleValue, queuedIntent: Math.max(0, route.hits() - 1) > 0, firstWritePending: route.hits() === 1 && route.active(), metadataEffect: effect.metadataEffect });
    } else if (config.name === "user-b-default-before-release") {
      const response = await strictPreference();
      const effect = await preferenceEffect();
      output = ordinary({ response, metadataEffect: effect.metadataEffect });
    } else if (config.name === "user-b-default-unchanged") {
      const before = context.__wf540Recall("assert:ru-095-b-before-release");
      const after = await strictPreference();
      const effect = await preferenceEffect();
      output = ordinary({ before: before.observations.response, after, metadataEffect: effect.metadataEffect });
    } else if (config.name === "final-a-retry-converges") {
      const pageId = page.__wf540PageIdentity.pageId;
      const baseline = context.__wf540Recall("ru-106a-a3-fresh-read-settled:preference-write-baseline");
      const writes = await waitFor(() => {
        const rows = context.__wf540ReadPreferenceWrites();
        return rows.length === baseline + 1 ? rows : null;
      });
      const settledWrite = writes.at(-1);
      if (settledWrite.pageId !== pageId || settledWrite.sequence !== baseline + 1 ||
        settledWrite.status < 200 || settledWrite.status > 299 ||
        settledWrite.expectedUserIdMatches !== true ||
        settledWrite.value.version !== 1 || settledWrite.value.showFieldMetadata !== false) {
        throw new Error("wf540_final_preference_write_identity");
      }
      const durable = await strictPreference();
      const effect = await preferenceEffect();
      output = ordinary({ visibleValue: effect.visibleValue, persistedValue: durable.value.showFieldMetadata, writePending: context.__wf540RouteHas("preference-a-write-exit") && context.__wf540RouteGet("preference-a-write-exit").active(), unhandledRejectionCount: context.__wf540ReadAggregateChannels().pageErrors.length, metadataEffect: effect.metadataEffect });
    } else {
      throw new Error("wf540_unknown_assertion");
    }
    output = finalizeOutput(output);
    context.__wf540Remember("assert:" + config.actionId, output);
    return output;
  })`;
}

export { buildVisibleAssertionSource, resolveVisibleAssertionTarget };
