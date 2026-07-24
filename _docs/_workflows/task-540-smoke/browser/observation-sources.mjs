import {
  AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES,
  EXPECTED_AUTH_CHALLENGE_PHASES,
} from "../executor/config.mjs";
import { invariant } from "../executor/foundation.mjs";
import {
  changedJsonPointersExact,
  normalizeRelationEnumerationExact,
  validateCurrentDraftAuthorityExact,
  validateResetDraftAuthorityExact,
} from "../executor/json-schema.mjs";
import { registeredSelector, resolveFixtureValue } from "../executor/ref-dsl.mjs";

function buildObservationSource(action, name, plan, captures, selectionSelector = null) {
  const outputContract = plan.registries.observations[name];
  invariant(outputContract !== undefined, "unknown observation: " + name);
  const authClosePhase = EXPECTED_AUTH_CHALLENGE_PHASES.find(
    ({ closeActionId }) => closeActionId === action.id
  );
  const screenId = captures.has("screen.id") ? captures.get("screen.id") : null;
  const entryId = captures.has("entry.id") ? captures.get("entry.id") : null;
  const capturedBlockSelector = (captureName) =>
    captures.has(captureName)
      ? registeredSelector(plan, "blockRoot", [captures.get(captureName)])
      : null;
  const requiresEntryBaseline =
    name === "relation-pickers-a-b-warm" || name === "related-unrelated-drafts-before";
  const resolvedEntryBaseline = requiresEntryBaseline
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
          id: captures.has("related-entry-a1.id") ? captures.get("related-entry-a1.id") : null,
          title: plan.fixtureBlueprint.relatedEntries.a1.title,
        },
        {
          id: captures.has("related-entry-a2.id") ? captures.get("related-entry-a2.id") : null,
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
          id: captures.has("related-entry-b1.id") ? captures.get("related-entry-b1.id") : null,
          title: plan.fixtureBlueprint.relatedEntries.b1.title,
        },
        {
          id: captures.has("related-entry-b2.id") ? captures.get("related-entry-b2.id") : null,
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
    name !== "related-unrelated-drafts-before"
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
    adminRootUrl: plan.fixtureBlueprint.origins.admin + "/admin/",
    loginUrl: plan.fixtureBlueprint.origins.admin + plan.fixtureBlueprint.paths.login,
    screenId,
    entryId,
    typeSlug: plan.fixtureBlueprint.contentTypes.editable.slug,
    screenBlockIds: plan.fixtureBlueprint.screen.blockIds,
    retryBlockId: plan.fixtureBlueprint.retryScreen.relatedListBlockId,
    userAId: captures.has("user-a.id") ? captures.get("user-a.id") : null,
    userAName: plan.fixtureBlueprint.users.a.displayName,
    userBId: captures.has("user-b.id") ? captures.get("user-b.id") : null,
    userBName: plan.fixtureBlueprint.users.b.displayName,
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
    entryIdentity: {
      id: entryId,
      title: plan.fixtureBlueprint.entry.title,
      slug: plan.fixtureBlueprint.entry.slug,
    },
    entryBaseline: resolvedEntryBaseline,
    expectedResetDraft,
    expectedRc017Draft,
    outputFields: Object.keys(outputContract.schema.properties),
    preferencePath: "/admin/api/user-settings/customScreens.entry.preferences",
    relatedListPaths: {
      a: "/admin/api/content/" + plan.fixtureBlueprint.contentTypes.relatedA.slug + "/entries",
      b: "/admin/api/content/" + plan.fixtureBlueprint.contentTypes.relatedB.slug + "/entries",
    },
    relatedEntryWritePath: captures.has("related-entry-a1.id")
      ? "/admin/api/content/" +
        plan.fixtureBlueprint.contentTypes.relatedA.slug +
        "/entries/" +
        encodeURIComponent(captures.get("related-entry-a1.id"))
      : null,
    selectionSelector,
    related: {
      a1: captures.has("related-entry-a1.id")
        ? {
            id: captures.get("related-entry-a1.id"),
            title: plan.fixtureBlueprint.relatedEntries.a1.title,
            updatedTitle: plan.fixtureBlueprint.relatedEntries.a1.updatedTitle,
          }
        : null,
      a2: captures.has("related-entry-a2.id")
        ? {
            id: captures.get("related-entry-a2.id"),
            title: plan.fixtureBlueprint.relatedEntries.a2.title,
          }
        : null,
      b1: captures.has("related-entry-b1.id")
        ? {
            id: captures.get("related-entry-b1.id"),
            title: plan.fixtureBlueprint.relatedEntries.b1.title,
          }
        : null,
      b2: captures.has("related-entry-b2.id")
        ? {
            id: captures.get("related-entry-b2.id"),
            title: plan.fixtureBlueprint.relatedEntries.b2.title,
          }
        : null,
    },
    selectors: {
      loginEmail: registeredSelector(plan, "loginEmail"),
      loginPassword: registeredSelector(plan, "loginPassword"),
      loginSubmit: registeredSelector(plan, "loginSubmit"),
      bootstrapUserMenu: registeredSelector(plan, "bootstrapUserMenu"),
      userA: registeredSelector(plan, "userMenu", [plan.fixtureBlueprint.users.a.displayName]),
      userB: registeredSelector(plan, "userMenu", [plan.fixtureBlueprint.users.b.displayName]),
      colorMode: registeredSelector(plan, "colorMode"),
      canvas: registeredSelector(plan, "canvas"),
      previewShell: registeredSelector(plan, "previewShell"),
      canvasScroller: registeredSelector(plan, "canvasScroller"),
      editorPanel: registeredSelector(plan, "editorPanel"),
      metadata: registeredSelector(plan, "metadata"),
      entrySave: registeredSelector(plan, "entrySave"),
      secondTabTitle: registeredSelector(plan, "secondTabTitle"),
      secondTabSave: registeredSelector(plan, "secondTabSave"),
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
    const finiteRect = (value) => {
      if (!value) return null;
      const result = { left: value.x, right: value.x + value.width, width: value.width, height: value.height };
      if (Object.values(result).some((item) => !Number.isFinite(item))) throw new Error("wf540_nonfinite_geometry");
      return result;
    };
    const positive = (value) => Boolean(value && value.width > 0 && value.height > 0);
    const one = async (selector) => {
      const locator = page.locator(selector);
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline && await locator.count() !== 1) {
        await page.waitForTimeout(25);
      }
      if (await locator.count() !== 1) throw new Error("wf540_observation_target_count");
      return locator;
    };
    const visible = async (selector) => {
      const locator = await one(selector);
      return positive(finiteRect(await locator.boundingBox())) && await locator.isVisible();
    };
    const exactOutput = (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("wf540_observation_output_object");
      const keys = Object.keys(value);
      if (keys.length !== config.outputFields.length || !config.outputFields.every((key) => Object.prototype.hasOwnProperty.call(value, key))) throw new Error("wf540_observation_output_keys");
      return value;
    };
    const exactAuthSettlementFailureOutput = (value) => {
      const observationNames = [
        "bootstrap-auth-identity-settled",
        "auth-identity-settled-users-a",
        "auth-identity-settled-users-b",
      ];
      const failureClasses = ${JSON.stringify(AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES)};
      if (!observationNames.includes(config.name) || !value || typeof value !== "object" || Array.isArray(value)) return null;
      const keys = Object.keys(value);
      if (keys.length !== 2 || !keys.includes("failureClass") || !keys.includes("settled")) return null;
      if (value.settled !== false || !failureClasses.includes(value.failureClass)) return null;
      return { failureClass: value.failureClass, settled: false };
    };
    const waitFor = async (read) => {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        const value = await read();
        if (value) return value;
        await page.waitForTimeout(25);
      }
      throw new Error("wf540_observation_timeout");
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
    const safeGet = async (pathname) => {
      const response = await page.evaluate(async (target) => {
        const result = await fetch(target, { credentials: "same-origin", headers: { Accept: "application/json" } });
        return { status: result.status, text: await result.text() };
      }, pathname);
      if (response.status !== 200 || response.text.length === 0 || response.text.length > 1048576) throw new Error("wf540_observation_api_read");
      const value = JSON.parse(response.text);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("wf540_observation_api_shape");
      return value;
    };
    const preferenceEffect = async () => {
      const toggle = await one(config.selectors.metadata);
      const switchRect = finiteRect(await toggle.boundingBox());
      if (!positive(switchRect) || !(await toggle.isVisible())) throw new Error("wf540_metadata_toggle_geometry");
      const ariaChecked = await toggle.getAttribute("aria-checked");
      const dataState = await toggle.getAttribute("data-state");
      if (ariaChecked !== "true" && ariaChecked !== "false" && dataState !== "checked" && dataState !== "unchecked") throw new Error("wf540_metadata_switch_state");
      const switchChecked = ariaChecked === "true" || dataState === "checked";
      const badgeSelectors = [
        config.selectors.headlineEditableBadge,
        config.selectors.headlineTextBadge,
        config.selectors.readOnlyReadBadge,
        config.selectors.readOnlyTextBadge,
      ];
      const badgeRects = [];
      for (const selector of badgeSelectors) {
        const badges = page.locator(selector);
        if (switchChecked) {
          if (await badges.count() !== 1 || !(await badges.isVisible())) throw new Error("wf540_metadata_badge_count");
          const rect = finiteRect(await badges.boundingBox());
          if (!positive(rect)) throw new Error("wf540_metadata_badge_geometry");
          badgeRects.push(rect);
        } else if (await badges.count() !== 0) {
          throw new Error("wf540_metadata_badge_absence");
        }
      }
      return {
        switchChecked,
        switchRect,
        metadataRect: switchChecked ? badgeRects[0] : null,
        metadataEffect: switchChecked,
      };
    };
    const themeSample = async (includeMetadata = false) => {
      const toggle = await one(config.selectors.colorMode);
      const colors = await page.evaluate(() => ({
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        rootColor: getComputedStyle(document.documentElement).backgroundColor,
        bodyColor: getComputedStyle(document.body).backgroundColor,
      }));
      if (!colors.rootColor || !colors.bodyColor) throw new Error("wf540_theme_color");
      const toggleAriaPressed = await toggle.getAttribute("aria-pressed");
      if (toggleAriaPressed !== "true" && toggleAriaPressed !== "false") throw new Error("wf540_theme_toggle_state");
      return includeMetadata
        ? { ...colors, toggleAriaPressed, metadataEffect: (await preferenceEffect()).metadataEffect }
        : { ...colors, toggleAriaPressed };
    };
    const loginSample = async (clientAborted = undefined) => {
      const result = {
        url: page.url(),
        loginEmailVisible: await visible(config.selectors.loginEmail),
        loginPasswordVisible: await visible(config.selectors.loginPassword),
        loginSubmitVisible: await visible(config.selectors.loginSubmit),
      };
      if (result.url !== config.loginUrl) throw new Error("wf540_login_url");
      return clientAborted === undefined ? result : { ...result, clientAborted };
    };
    const settleAuthRealm = async (selector, expectedName = null, userId = null) => {
      const deadline = Date.now() + 180000;
      const remainingAuthTime = () => {
        return Math.max(1, deadline - Date.now());
      };
      const menu = page.locator(selector);
      let failureClass = "dom_read_failed";
      while (Date.now() < deadline) {
        try {
          if (page.isClosed()) {
            failureClass = "page_closed";
            break;
          }
          const candidateUrl = page.url();
          if (candidateUrl !== config.adminRootUrl) {
            failureClass = candidateUrl === config.loginUrl ? "login_route" : "noncanonical_route";
          } else {
            const menuCount = await menu.count();
            if (menuCount === 0) {
              const loading = page.getByText("Loading...", { exact: true });
              failureClass = await loading.count() > 0 && await loading.first().isVisible()
                ? "loading_view"
                : "menu_absent";
            } else if (menuCount > 1) {
              failureClass = "menu_duplicate";
            } else {
              const label = menu.locator("span.block.text-sm");
              const labelCount = await label.count();
              if (labelCount === 0) {
                failureClass = "label_absent";
              } else if (labelCount > 1) {
                failureClass = "label_duplicate";
              } else {
                const userName = (await label.textContent({ timeout: remainingAuthTime() }))?.trim() ?? "";
                const rawMenuRect = await menu.boundingBox({ timeout: remainingAuthTime() });
                const geometryIsFinite = rawMenuRect === null ||
                  [rawMenuRect.x, rawMenuRect.y, rawMenuRect.width, rawMenuRect.height]
                    .every((item) => Number.isFinite(item));
                const menuRect = geometryIsFinite ? finiteRect(rawMenuRect) : null;
                const userMenuVisible = await menu.isVisible();
                const nameMatches = expectedName === null ? userName.length > 0 : userName === expectedName;
                if (userName.length === 0) {
                  failureClass = "name_empty";
                } else if (!nameMatches) {
                  failureClass = "name_mismatch";
                } else if (rawMenuRect === null) {
                  failureClass = "geometry_absent";
                } else if (!geometryIsFinite) {
                  failureClass = "geometry_nonfinite";
                } else if (!positive(menuRect)) {
                  failureClass = "geometry_nonpositive";
                } else if (!userMenuVisible) {
                  failureClass = "menu_hidden";
                } else {
                  const observedUrl = page.url();
                  if (observedUrl !== config.adminRootUrl) {
                    failureClass = "url_unstable";
                  } else {
                    if (userId !== null) context.__wf540BindActiveUser(page.__wf540PageIdentity.pageId, userId);
                    return { url: observedUrl, userMenuVisible, userName };
                  }
                }
              }
            }
          }
        } catch {
          failureClass = page.isClosed() ? "page_closed" : "dom_read_failed";
        }
        const waitMs = deadline - Date.now();
        if (waitMs > 0) {
          try {
            await page.waitForTimeout(Math.min(25, waitMs));
          } catch {
            failureClass = page.isClosed() ? "page_closed" : "dom_read_failed";
            break;
          }
        }
      }
      try {
        const projection = context.__wf540ReadLogProjection();
        if (projection.firstUnexpected !== null) failureClass = "runtime_failure";
      } catch {}
      return { settled: false, failureClass };
    };
    const geometrySample = async () => {
      const match = /^geometry-(320|390|480|1024|1280)-(open|closed)$/.exec(config.name);
      if (!match) throw new Error("wf540_geometry_name");
      const scroller = await one(config.selectors.canvasScroller);
      const panel = page.locator(config.selectors.editorPanel);
      const values = await scroller.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const contentWidth = rect.width - parseFloat(style.paddingLeft || "0") - parseFloat(style.paddingRight || "0") - parseFloat(style.borderLeftWidth || "0") - parseFloat(style.borderRightWidth || "0");
        return {
          viewportWidth: innerWidth,
          paddingRight: style.paddingRight,
          border: { x: rect.x, width: rect.width, height: rect.height },
          content: { x: rect.x + parseFloat(style.borderLeftWidth || "0") + parseFloat(style.paddingLeft || "0"), width: contentWidth, height: rect.height },
        };
      });
      const panelRect = await panel.count() === 1 && await panel.isVisible() ? finiteRect(await panel.boundingBox()) : null;
      return {
        width: values.viewportWidth,
        state: positive(panelRect) ? "open" : "closed",
        viewportWidth: values.viewportWidth,
        paddingRight: values.paddingRight,
        scrollerBorder: finiteRect(values.border),
        scrollerContent: finiteRect(values.content),
        panel: panelRect,
      };
    };
    const selectedBlock = async () => {
      const selected = page.locator('button[data-screen-select-block][aria-pressed="true"]');
      if (await selected.count() !== 1) throw new Error("wf540_selected_block_count");
      return (await selected.getAttribute("data-screen-select-block")) ?? "";
    };
    const entryDraftSample = async () => {
      const runtime = await one(config.selectors.canvasScroller);
      const content = await runtime.locator('[data-screen-section-id] [role="textbox"]').evaluateAll((nodes) => nodes.map((node) => ({
        blockId: node.closest('[data-screen-block-id]')?.getAttribute('data-screen-block-id') ?? "",
        label: node.getAttribute("aria-label"),
        text: node.textContent ?? "",
        value: "value" in node ? node.value : null,
      })).sort((left, right) => (left.blockId + "\\u0000" + left.label).localeCompare(right.blockId + "\\u0000" + right.label)));
      const panel = await one('[data-custom-screen-entry-presentation-panel="true"]');
      const presentation = await panel.evaluate((node) => node.innerHTML);
      return { contentBytes: JSON.stringify(content), presentationBytes: JSON.stringify(presentation), url: page.url(), navigationCount: page.__wf540ReadNavigationCount() };
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
      const rect = (node) => {
        const value = node.getBoundingClientRect();
        return { left: value.left, right: value.right, width: value.width, height: value.height };
      };
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
          hidden: panel.hidden,
          rect: rect(panel),
        })),
      };
    });
    const relatedRootSample = async (blockId) => {
      const root = await one('[data-screen-block-id="' + blockId + '"]');
      const rows = root.locator("[data-screen-related-entry]");
      const rowIds = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-screen-related-entry") ?? ""));
      const rowText = await rows.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()));
      const rects = [];
      for (let index = 0; index < await rows.count(); index += 1) rects.push(finiteRect(await rows.nth(index).boundingBox()));
      const skeletons = root.locator('span:text-is("Chip")');
      const empty = root.locator("p", { hasText: "No related" });
      return { rootId: blockId, rowIds, rowText, rects, skeletonCount: await skeletons.count(), emptyVisible: await empty.count() > 0 && await empty.first().isVisible(), navigationCount: page.__wf540ReadNavigationCount() };
    };
    let output;
    if (["theme-light", "theme-dark", "theme-light-user-a-candidate", "user-a-light-computed", "user-b-dark-computed"].includes(config.name)) {
      output = await themeSample(config.name === "user-b-dark-computed");
    } else if (config.name === "bootstrap-auth-identity-settled") {
      output = await settleAuthRealm(config.selectors.bootstrapUserMenu);
    } else if (config.name === "auth-identity-settled-users-a") {
      output = await settleAuthRealm(config.selectors.userA, config.userAName, config.userAId);
      context.__wf540Remember(config.actionId + ":preference-read-baseline", context.__wf540ReadPreferenceReads().length);
    } else if (config.name === "auth-identity-settled-users-b") {
      output = await settleAuthRealm(config.selectors.userB, config.userBName, config.userBId);
    } else if (["signout-settled-bootstrap", "signout-settled-user-a", "signout-settled-user-b"].includes(config.name)) {
      output = await loginSample();
    } else if (config.name === "signout-settled-user-a-with-abort") {
      const route = context.__wf540RouteGet("preference-a-write-exit");
      const aborted = await Promise.race([route.clientAborted, page.waitForTimeout(540000).then(() => { throw new Error("wf540_abort_timeout"); })]);
      output = await loginSample(aborted === true);
    } else if (config.name.startsWith("geometry-")) {
      output = await geometrySample();
    } else if (config.name === "binding-after-save") {
      const response = await page.evaluate(async (pathname) => {
        const result = await fetch(pathname, { credentials: "same-origin", headers: { Accept: "application/json" } });
        return { status: result.status, text: await result.text() };
      }, "/admin/api/custom-screens/" + encodeURIComponent(config.screenId));
      if (response.status !== 200 || response.text.length === 0 || response.text.length > 1048576) throw new Error("wf540_screen_read");
      const payload = JSON.parse(response.text);
      output = { screenId: payload.id, bindings: payload.definition?.editorView?.bindings ?? payload.bindings ?? [] };
    } else if (config.name === "safe-link-anchor-before-activation") {
      const root = await exactVisibleWithin(page, config.paletteSelectors.button, "wf540_safe_link_capture");
      const locator = root.locator('[data-screen-button-affordance="true"]');
      if (await locator.count() !== 1) throw new Error("wf540_safe_link_affordance_count");
      output = { tagName: await locator.evaluate((element) => element.tagName), href: await locator.getAttribute("href"), rect: finiteRect(await locator.boundingBox()) };
    } else if (config.name === "outer-tabs-details-state" || config.name === "outer-tabs-history-state") {
      const root = await exactVisibleWithin(page, config.paletteSelectors.outerTabs, "wf540_outer_tabs");
      const owned = await ownedTabs(root);
      const selected = owned.tabs.filter(({ selected }) => selected);
      if (selected.length !== 1 || owned.tabs.length !== 3 || owned.panels.length !== 3) throw new Error("wf540_owned_tabs_shape");
      const activeTabId = selected[0].tabId;
      const visiblePanelIds = owned.panels.filter(({ hidden, rect }) => !hidden && positive(rect)).map(({ panelId }) => panelId);
      const hiddenPanelIds = owned.panels.filter(({ hidden, rect }) => hidden && !positive(rect)).map(({ panelId }) => panelId);
      const rects = owned.panels.map(({ rect }) => rect);
      output = { activeTabId, visiblePanelIds, hiddenPanelIds, armedSlotId: activeTabId, rects };
    } else if (config.name === "preview-shell-desktop") {
      const shell = await exactVisibleWithin(page, config.selectors.previewShell, "wf540_preview_shell");
      const outer = await exactVisibleWithin(shell, config.paletteSelectors.outerTabs, "wf540_preview_outer_tabs");
      await exactVisibleWithin(outer, config.paletteSelectors.innerTabs, "wf540_preview_inner_tabs");
      const device = (await shell.getAttribute("data-preview-device")) ?? "";
      if (device !== "desktop") throw new Error("wf540_preview_device");
      output = { shellVisible: true, device, outerTabsVisible: true, innerTabsVisible: true };
    } else if (config.name.startsWith("key-step-")) {
      const keyByName = { "key-step-arrow-left": "ArrowLeft", "key-step-arrow-right": "ArrowRight", "key-step-home": "Home", "key-step-end": "End" };
      output = await page.evaluate((key) => {
        const focused = document.activeElement;
        const selected = focused?.closest('[data-screen-block-id]')?.querySelector('[role="tab"][aria-selected="true"]');
        const rawId = (tab) => document.getElementById(tab?.getAttribute("aria-controls") ?? "")?.getAttribute("data-screen-runtime-tab") ?? "";
        return { key, focusedTabText: focused?.textContent?.trim() ?? "", focusedTabId: rawId(focused), selectedTabId: rawId(selected), tabIndex: focused?.tabIndex ?? -1 };
      }, keyByName[config.name]);
    } else if (config.name === "selected-block-before-nested-controls") {
      if (typeof config.selectionSelector !== "string" || config.selectionSelector.length === 0) throw new Error("wf540_selection_selector");
      const handle = await one(config.selectionSelector);
      await handle.click();
      const selectedBlockId = await waitFor(async () => {
        const wrapper = handle.locator("xpath=..");
        const selected = await selectedBlock();
        return selected === config.screenBlockIds.spaceGroup &&
          await handle.getAttribute("aria-pressed") === "true" &&
          await wrapper.getAttribute("data-selected") === "true"
          ? selected
          : null;
      });
      output = { selectedBlockId, url: page.url() };
    } else if (config.name === "selected-block-after-nested-input" || config.name === "selected-block-after-nested-link") {
      output = { selectedBlockId: await selectedBlock(), focused: await page.evaluate(() => document.activeElement?.getAttribute("role") === "textbox" || document.activeElement?.tagName === "A"), url: page.url() };
    } else if (config.name === "builder-draft-url-before-cancel") {
      const draftBytes = await page.locator(config.selectors.canvas).evaluate((node) => JSON.stringify({ text: node.textContent, html: node.innerHTML }));
      output = { draftBytes, url: page.url(), navigationCount: page.__wf540ReadNavigationCount() };
    } else if (config.name === "entry-drafts-url-before-cancel") {
      output = await entryDraftSample();
    } else if (config.name === "entry-save-failure-ui-settled") {
      const save = await one(config.selectors.entrySave);
      const alert = page.locator('[role="alert"]');
      output = await waitFor(async () => {
        const errorVisible = await alert.count() > 0 && await alert.first().isVisible();
        const saveEnabled = await save.isEnabled();
        const saveLabel = (await save.textContent())?.trim() ?? "";
        return errorVisible && saveEnabled && saveLabel === "Save"
          ? { errorVisible, saveEnabled, saveLabel }
          : null;
      });
    } else if (config.name === "relation-pickers-a-b-warm") {
      const relations = await relationSelections();
      const persisted = await safeGet("/admin/api/content/" + encodeURIComponent(config.typeSlug) + "/entries/" + encodeURIComponent(config.entryId));
      if (persisted.id !== config.entryIdentity.id || persisted.title !== config.entryIdentity.title || persisted.slug !== config.entryIdentity.slug || !persisted.data || typeof persisted.data !== "object" || Array.isArray(persisted.data) || changedJsonPointers(config.entryBaseline, persisted.data).length !== 0) throw new Error("wf540_rc002_persisted_entry");
      const persistedOverrides = await safeGet("/admin/api/custom-screens/" + encodeURIComponent(config.screenId) + "/entries/" + encodeURIComponent(config.entryId) + "/overrides");
      if (Object.keys(persistedOverrides).length !== 1 || !Array.isArray(persistedOverrides.overrides) || persistedOverrides.overrides.length !== 0) throw new Error("wf540_rc002_persisted_overrides");
      const resetDraft = await readFullDraftSnapshot("inherit", relations);
      if (changedJsonPointers(config.expectedResetDraft, resetDraft).length !== 0) throw new Error("wf540_rc002_reset_draft");
      context.__wf540Remember("rc-002-private-authority", {
        authorityVersion: 1,
        sourceActionId: "rc-002-entry-proof",
        capturedAtActionId: config.actionId,
        persisted: { data: persisted.data, overrides: persistedOverrides.overrides },
        draft: resetDraft,
        observedRelationIds: relations.observedIds,
        proof: {
          persistedFixtureMatches: true,
          persistedOverridesEmpty: true,
          draftMatchesPersisted: true,
          completeWritableControls: true,
          relationEnumerationComplete: true,
        },
      });
      const resetAuthority = context.__wf540Recall("rc-002-private-authority");
      validateResetDraftAuthority(resetAuthority, {
        sourceActionId: "rc-002-entry-proof",
        capturedAtActionId: config.actionId,
        persistedData: config.entryBaseline,
        resetDraft: config.expectedResetDraft,
        observedRelationIds: {
          relationA: config.relationFields[0].options.map(({ id }) => id),
          relationB: config.relationFields[1].options.map(({ id }) => id),
        },
      });
      const aButtons = relations.observedTitles.relationA;
      const bButtons = relations.observedTitles.relationB;
      const aRows = (await relatedRootSample(config.screenBlockIds.relatedListA)).rowIds;
      const relatedCounts = context.__wf540ReadRelatedListGetCounts();
      output = { aButtons, bButtons, aRows, bListGetCount: relatedCounts[config.relatedListPaths.b] };
    } else if (config.name === "related-unrelated-drafts-before") {
      const sample = await entryDraftSample();
      const resetExpected = {
        sourceActionId: "rc-002-entry-proof",
        capturedAtActionId: "rc-012c-picker-warm-proof",
        persistedData: config.entryBaseline,
        resetDraft: config.expectedResetDraft,
        observedRelationIds: {
          relationA: config.relationFields[0].options.map(({ id }) => id),
          relationB: config.relationFields[1].options.map(({ id }) => id),
        },
      };
      const resetAuthority = context.__wf540Recall("rc-002-private-authority");
      validateResetDraftAuthority(resetAuthority, resetExpected);
      const relations = await relationSelections();
      const tone = page.locator('[data-custom-screen-entry-presentation-panel="true"] [data-presentation-control="tone"] button[role="combobox"]');
      if (await tone.count() !== 1) throw new Error("wf540_rc017_tone_count");
      const toneValue = ((await tone.textContent()) ?? "").trim().toLowerCase();
      const currentDraft = await readFullDraftSnapshot(toneValue, relations);
      const diffFromReset = changedJsonPointers(resetAuthority.draft, currentDraft);
      const expectedDiff = ["/controls/unrelatedNote", "/presentation/tone"];
      if (changedJsonPointers(config.expectedRc017Draft, currentDraft).length !== 0 || JSON.stringify(diffFromReset) !== JSON.stringify(expectedDiff)) throw new Error("wf540_rc017_exact_union_leaf_diff");
      context.__wf540Remember("rc-017-private-authority", {
        authorityVersion: 1,
        sourceActionId: config.actionId,
        capturedAtActionId: config.actionId,
        resetAuthority,
        draft: currentDraft,
        observedRelationIds: relations.observedIds,
        diffFromReset,
        proof: {
          resetAuthorityValid: true,
          exactTwoLeafDiff: true,
          unrelatedNoteMatches: true,
          toneMatches: true,
          relationsUnchanged: true,
          completeWritableControls: true,
        },
      });
      const currentAuthority = context.__wf540Recall("rc-017-private-authority");
      validateResetDraftAuthority(currentAuthority.resetAuthority, resetExpected);
      validateCurrentDraftAuthority(currentAuthority, {
        sourceActionId: config.actionId,
        capturedAtActionId: config.actionId,
        resetSourceActionId: "rc-002-entry-proof",
        currentDraft: config.expectedRc017Draft,
        observedRelationIds: resetExpected.observedRelationIds,
        diffFromReset: expectedDiff,
      });
      output = { contentBytes: sample.contentBytes, presentationBytes: sample.presentationBytes };
    } else if (config.name === "related-a-visible-baseline") {
      output = await relatedRootSample(config.screenBlockIds.relatedListA);
    } else if (config.name === "related-tab-save-settled") {
      const write = await waitFor(() => context.__wf540ReadRelatedEntryWrites().find((item) => item.pageId === page.__wf540PageIdentity.pageId && item.idMatches && item.titleMatches));
      const save = await one(config.selectors.secondTabSave);
      const title = await one(config.selectors.secondTabTitle);
      const pageHref = page.url();
      const pageAuthorityEnd = pageHref.indexOf("/", pageHref.indexOf("://") + 3);
      const pagePathname = (pageAuthorityEnd === -1 ? "/" : pageHref.slice(pageAuthorityEnd)).split(/[?#]/u, 1)[0];
      const editorEntryId = pagePathname.split("/").filter(Boolean).at(-1) ?? "";
      if (!write.pathMatches || editorEntryId !== config.related.a1.id || config.relatedEntryWritePath === null) throw new Error("wf540_related_write_identity");
      const settled = await waitFor(async () => {
        const saveEnabled = await save.isEnabled();
        const savingAbsent = await page.getByText("Saving...", { exact: true }).count() === 0;
        return saveEnabled && savingAbsent ? { saveEnabled, savingAbsent } : null;
      });
      output = { method: write.method, pathname: config.relatedEntryWritePath, status: write.status, entryId: editorEntryId, title: await title.inputValue(), ...settled };
    } else if (config.name === "preference-a-write-settled" || config.name === "nondefault-browser-patch-settled" || config.name === "new-local-browser-patch-settled") {
      const expectedSequence = config.name === "preference-a-write-settled" ? 1 : config.name === "nondefault-browser-patch-settled" ? 2 : 3;
      const rows = await waitFor(() => { const candidates = context.__wf540ReadPreferenceWrites(); return candidates.length >= expectedSequence ? candidates : null; });
      const request = rows[expectedSequence - 1];
      const base = { sequence: request.sequence, method: "PATCH", pathname: config.preferencePath, status: request.status, userIdMatches: request.expectedUserIdMatches, value: request.value };
      if (config.name === "preference-a-write-settled") {
        const effect = await preferenceEffect();
        output = { ...base, switchChecked: effect.switchChecked, switchRect: effect.switchRect, metadataRect: effect.metadataRect };
      } else output = base;
    } else if (config.name === "post-redirect-a-fresh-read-settled") {
      const baseline = context.__wf540Recall("ru-105a-a3-identity-settled:preference-read-baseline");
      const requests = await waitFor(() => { const rows = context.__wf540ReadPreferenceReads(); return rows.length === baseline + 1 ? rows : null; });
      const request = requests.at(-1);
      if (request.pageId !== page.__wf540PageIdentity.pageId || !request.keyMatches) throw new Error("wf540_fresh_preference_read_identity");
      const settled = await waitFor(async () => {
        try {
          const menu = await one(config.selectors.userA);
          const activeUserMenuVisible = positive(finiteRect(await menu.boundingBox())) && await menu.isVisible();
          const effect = await preferenceEffect();
          return activeUserMenuVisible && effect.switchChecked && positive(effect.metadataRect)
            ? { activeUserMenuVisible, effect }
            : null;
        } catch {
          return null;
        }
      });
      const { activeUserMenuVisible, effect } = settled;
      context.__wf540Remember(config.actionId + ":preference-write-baseline", context.__wf540ReadPreferenceWrites().length);
      output = { sequence: request.sequence, method: "GET", pathname: config.preferencePath, status: request.status, activeUserMenuVisible, value: request.value, switchChecked: effect.switchChecked, metadataRect: effect.metadataRect };
    } else {
      throw new Error("wf540_unknown_observation");
    }
    ${
      authClosePhase
        ? `
      context.__wf540CloseExpectedAuthChallenge({
        closeActionId: ${JSON.stringify(authClosePhase.closeActionId)},
        pageId: page.__wf540PageIdentity?.pageId,
        navigationEpoch: page.__wf540ReadNavigationCount(),
        url: page.url(),
      });
    `
        : ""
    }
    const authSettlementFailureOutput = exactAuthSettlementFailureOutput(output);
    if (authSettlementFailureOutput !== null) return authSettlementFailureOutput;
    output = exactOutput(output);
    context.__wf540Remember(config.actionId, output);
    return output;
  })`;
}

export { buildObservationSource };
