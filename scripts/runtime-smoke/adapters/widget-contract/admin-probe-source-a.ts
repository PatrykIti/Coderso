export const ADMIN_PROBE_SOURCE_A = `
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error && error.message ? error.message : String(error));
  });
  async function settle() {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  }
  async function fetchPages() {
    const response = await page.context().request.get(adminUrl + "/api/pages", {
      failOnStatusCode: false,
    });
    return {
      ok: response.ok(),
      status: response.status(),
      text: await response.text(),
    };
  }
  async function verifyAuthenticated() {
    const pagesResponse = await fetchPages();
    if (pagesResponse.ok) {
      requiredLogin.authenticated = true;
      return;
    }
    requiredLogin.authenticated = false;
    requiredLogin.error = "auth_state_invalid:" + pagesResponse.status;
  }
  function duplicatePaths(modes, allowedDuplicateWritablePaths) {
    const allowed = new Set((allowedDuplicateWritablePaths || []).map((entry) => entry.path));
    const owners = new Map();
    for (const mode of modes) {
      for (const path of mode.writablePaths || []) {
        const current = owners.get(path) || new Set();
        current.add(mode.mode);
        owners.set(path, current);
      }
    }
    return Array.from(owners.entries())
      .filter(([path, owners]) => owners.size > 1 && !allowed.has(path))
      .map(([path]) => path);
  }
  async function dismissCustomDirtyDialog() {
    const candidates = [
      /discard/i,
      /leave/i,
      /continue/i,
      /porzuc/i,
      /opuść/i
    ];
    for (const pattern of candidates) {
      const button = page.getByRole("button", { name: pattern }).first();
      if ((await button.count()) > 0 && await button.isVisible().catch(() => false)) {
        await button.click().catch(() => undefined);
        await settle();
        return;
      }
    }
  }
  async function selectFixtureBlock(item) {
    const typedBlocks = page.locator('[data-block-select][data-block-widget-type="' + item.widgetType + '"]');
    await typedBlocks.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    if ((await typedBlocks.count()) > 0) {
      await typedBlocks.first().click().catch(() => undefined);
      await settle();
      return { ok: true, matchedExpectedBlock: true };
    }
    const blocks = page.locator("[data-block-select]");
    await blocks.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    const blockCount = await blocks.count();
    if (blockCount === 0) return { ok: false, error: "block_select_missing", matchedExpectedBlock: false };
    const expectedLabels = [item.title, item.adminInsertLabel, item.widgetType]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    for (let index = 0; index < blockCount; index += 1) {
      const block = blocks.nth(index);
      const label = ((await block.innerText().catch(() => "")) || "").toLowerCase();
      if (expectedLabels.some((expected) => label.includes(expected))) {
        await block.click().catch(() => undefined);
        await settle();
        return { ok: true, matchedExpectedBlock: true };
      }
    }
    return { ok: false, error: "widget_block_type_missing", matchedExpectedBlock: false };
  }
  async function openFixtureAndSelect(item, pageRow, adminPath) {
    await dismissCustomDirtyDialog();
    await page
      .goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 })
      .catch(async () => {
        await dismissCustomDirtyDialog();
        await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      });
    await settle();
    await dismissCustomDirtyDialog();
    const existingEditor = page.locator('[data-widget-editor="' + item.widgetType + '"]');
    if ((await existingEditor.count()) > 0) {
      return { ok: true, matchedExpectedBlock: true };
    }
    return await selectFixtureBlock(item);
  }
  async function inspectMode(widgetType, mode) {
    const tab = page.getByRole("tab", { name: new RegExp("^" + mode + "$", "i") }).first();
    if ((await tab.count()) > 0) {
      await tab.click().catch(() => undefined);
      await settle();
    } else if (mode !== "wizard") {
      const complete = page
        .getByRole("button", { name: /finish setup and open visual|continue to layout and styling/i })
        .first();
      if ((await complete.count()) > 0) {
        await complete.click().catch(() => undefined);
        await settle();
        const nextTab = page.getByRole("tab", { name: new RegExp("^" + mode + "$", "i") }).first();
        if ((await nextTab.count()) > 0) {
          await nextTab.click().catch(() => undefined);
          await settle();
        }
      }
    }
    const root = page.locator('[data-widget-editor="' + widgetType + '"][data-widget-editor-mode="' + mode + '"]');
    const rootCount = await root.count();
    const firstRoot = root.first();
    const sectionCount = rootCount > 0 ? await firstRoot.locator("[data-widget-editor-section]").count() : 0;
    const visibleSectionCount = rootCount > 0
      ? await firstRoot.locator("[data-widget-editor-section]").evaluateAll((nodes) =>
          nodes.filter((node) => {
            if (!(node instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          }).length
        )
      : 0;
    const writablePaths = rootCount > 0
      ? await firstRoot.locator('[data-widget-control-path]:not([data-widget-control-readonly="true"])').evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-widget-control-path")).filter(Boolean)
        )
      : [];
    const controlsWithoutPath = rootCount > 0
      ? await firstRoot.locator("[data-widget-control]").evaluateAll((nodes) =>
          nodes.filter((node) => {
            if (node.hasAttribute("data-widget-control-path")) return false;
            const ownership = node.getAttribute("data-widget-control-ownership");
            return ownership !== "action" && ownership !== "preview" && ownership !== "readonly";
          }).length
        )
      : 0;
    return {
      mode,
      status: rootCount === 1 && visibleSectionCount > 0 ? "passed" : "failed",
      rootCount,
      sectionCount,
      visibleSectionCount,
      writablePaths,
      controlsWithoutPath,
      error: rootCount === 1 && visibleSectionCount > 0 ? undefined : "mode_root_or_visible_section_missing",
    };
  }
  async function runLogoCloudMediaPickerProof(item, adminPath) {
    if (item.widgetType !== "logo-cloud") return null;
    const publicPath = item.mediaProofPublicPath || item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminHasImage: false,
      publicHasImage: false,
      publicPath,
      adminAlt: null,
      publicAlt: null,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="logo-cloud"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const imageControl = editor.locator('[data-widget-control="logo-cloud.logo-1.image"]').first();
      await imageControl.waitFor({ state: "visible", timeout: 20000 });
      await imageControl.getByRole("button", { name: /browse media/i }).first().click();
      const dialog = page.getByRole("dialog", { name: /media library/i }).first();
      await dialog.waitFor({ state: "visible", timeout: 10000 });
      const search = dialog.getByPlaceholder(/search by name or title/i).first();
      if ((await search.count()) > 0) {
        await search.fill(logoCloudMediaFixture.title);
      }
      const assetButton = dialog.getByRole("button").filter({ hasText: logoCloudMediaFixture.title }).first();
      await assetButton.waitFor({ state: "visible", timeout: 10000 });
      await assetButton.click();
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
      await settle();

      const adminImage = page.locator('[data-logo-cloud-item="1"][data-logo-cloud-has-image="true"] img').first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminAlt = await adminImage.getAttribute("alt");
      const adminClassName = (await adminImage.getAttribute("class")) || "";
      if (proof.adminAlt !== logoCloudMediaFixture.alt) {
        proof.error = "admin_logo_alt_mismatch";
        return proof;
      }
      if (!adminClassName.includes("grayscale") || !adminClassName.includes("group-hover:grayscale-0")) {
        proof.error = "admin_logo_grayscale_hover_class_missing";
        return proof;
      }

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicImage = page.locator('[data-logo-cloud-item="1"][data-logo-cloud-has-image="true"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicAlt = await publicImage.getAttribute("alt");
      const publicClassName = (await publicImage.getAttribute("class")) || "";
      if (proof.publicAlt !== logoCloudMediaFixture.alt) {
        proof.error = "public_logo_alt_mismatch";
        return proof;
      }
      if (!publicClassName.includes("grayscale") || !publicClassName.includes("group-hover:grayscale-0")) {
        proof.error = "public_logo_grayscale_hover_class_missing";
        return proof;
      }
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function chooseMediaFixtureFromDialog(fixture) {
    const dialog = page.getByRole("dialog", { name: /media library/i }).first();
    await dialog.waitFor({ state: "visible", timeout: 10000 });
    const search = dialog.getByPlaceholder(/search by name or title/i).first();
    if ((await search.count()) > 0) {
      await search.fill(fixture.title);
    }
    const assetButton = dialog.getByRole("button").filter({ hasText: fixture.title }).first();
    await assetButton.waitFor({ state: "visible", timeout: 10000 });
    await assetButton.click();
    await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
    await settle();
  }
  async function setRadixSelectOption(control, optionName) {
    const combobox = control.getByRole("combobox").first();
    await combobox.waitFor({ state: "visible", timeout: 10000 });
    await combobox.click();
    const option = page.getByRole("option", { name: optionName }).first();
    await option.waitFor({ state: "visible", timeout: 10000 });
    await option.click();
    await settle();
  }
  async function runProductGalleryFixtureProof(item, adminPath) {
    if (item.widgetType !== "product-gallery") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasReadyLinks: false,
      publicHasReadyLinks: false,
      adminHasViewAll: false,
      publicHasViewAll: false,
      publicPath,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="product-gallery"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const refreshButton = editor.getByRole("button", { name: /refresh products/i }).first();
      if ((await refreshButton.count()) > 0) {
        await refreshButton.click().catch(() => undefined);
        await settle();
      }
      const adminRoot = page.locator('[data-widget="product-gallery"][data-product-gallery-route-state="ready"][data-product-gallery-view-all-state="visible"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 20000 });
      proof.adminItemCount = Number(await adminRoot.getAttribute("data-product-gallery-count")) || await adminRoot.locator("[data-product-id]").count();
      if (proof.adminItemCount < 2) {
        proof.error = "admin_product_gallery_fixture_items_missing";
        return proof;
      }
      const adminImage = adminRoot.locator("img").first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      const adminAlt = await adminImage.getAttribute("alt");
      if (productGalleryMediaFixture?.alt && adminAlt !== productGalleryMediaFixture.alt) {
        proof.error = "admin_product_gallery_image_alt_mismatch";
        return proof;
      }
      const adminReadyLinks = await adminRoot.locator('article[data-product-gallery-card-link="ready"] a[href^="/fixture-products/"]').count();
      proof.adminHasReadyLinks = adminReadyLinks >= 2;
      if (!proof.adminHasReadyLinks) {
        proof.error = "admin_product_gallery_ready_links_missing";
        return proof;
      }
      const adminViewAll = adminRoot.getByRole("link", { name: /view all fixture products/i }).first();
      await adminViewAll.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasViewAll = true;

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoot = page.locator('[data-widget="product-gallery"][data-product-gallery-route-state="ready"][data-product-gallery-view-all-state="visible"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 20000 });
      proof.publicItemCount = Number(await publicRoot.getAttribute("data-product-gallery-count")) || await publicRoot.locator("[data-product-id]").count();
      if (proof.publicItemCount < 2) {
        proof.error = "public_product_gallery_fixture_items_missing";
        return proof;
      }
      const publicImage = publicRoot.locator("img").first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      const publicAlt = await publicImage.getAttribute("alt");
      if (productGalleryMediaFixture?.alt && publicAlt !== productGalleryMediaFixture.alt) {
        proof.error = "public_product_gallery_image_alt_mismatch";
        return proof;
      }
      const publicReadyLinks = await publicRoot.locator('article[data-product-gallery-card-link="ready"] a[href^="/fixture-products/"]').count();
      proof.publicHasReadyLinks = publicReadyLinks >= 2;
      if (!proof.publicHasReadyLinks) {
        proof.error = "public_product_gallery_ready_links_missing";
        return proof;
      }
      const publicViewAll = publicRoot.getByRole("link", { name: /view all fixture products/i }).first();
      await publicViewAll.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasViewAll = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function inspectProductCompareSurface(root, fixture, scope) {
    const countFromAttr = Number(await root.getAttribute("data-product-compare-count")) || 0;
    const cardCount = await root.locator("[data-product-id]").count();
    const itemCount = Math.max(countFromAttr, cardCount);
    if (itemCount < 2) {
      return { error: scope + "_product_compare_fixture_items_missing", itemCount };
    }
    const image = root.locator("img").first();
    await image.waitFor({ state: "visible", timeout: 10000 });
    const imageCount = await root.locator("img").count();
    if (imageCount < 2) {
      return { error: scope + "_product_compare_images_missing", itemCount };
    }
    const alt = await image.getAttribute("alt");
    if (fixture?.alt && alt !== fixture.alt) {
      return { error: scope + "_product_compare_image_alt_mismatch", itemCount };
    }
    const starterTitleLink = root.getByRole("link", { name: /^Fixture Starter Home$/i }).first();
    await starterTitleLink.waitFor({ state: "visible", timeout: 10000 });
    const starterHref = await starterTitleLink.getAttribute("href");
    if (!starterHref || !starterHref.startsWith("/fixture-products/fixture-starter-home")) {
      return { error: scope + "_product_compare_title_link_href_mismatch", itemCount };
    }
    const ctaLinks = root.getByRole("link", { name: /^Inspect fixture product$/i });
    const ctaCount = await ctaLinks.count();
    if (ctaCount < 2) {
      return { error: scope + "_product_compare_cta_links_missing", itemCount };
    }
    const firstCtaHref = await ctaLinks.first().getAttribute("href");
    if (!firstCtaHref || !firstCtaHref.startsWith("/fixture-products/")) {
      return { error: scope + "_product_compare_cta_href_mismatch", itemCount };
    }
    return { itemCount };
  }
  async function runProductCompareFixtureProof(item, adminPath) {
    if (item.widgetType !== "product-compare") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasTitleLinks: false,
      publicHasTitleLinks: false,
      adminHasCta: false,
      publicHasCta: false,
      publicPath,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const advancedTab = page.getByRole("tab", { name: /^advanced$/i }).first();
      if ((await advancedTab.count()) > 0) {
        await advancedTab.click().catch(() => undefined);
        await settle();
      }
      const refreshButton = page.getByRole("button", { name: /refresh preview/i }).first();
      if ((await refreshButton.count()) > 0) {
        await refreshButton.click().catch(() => undefined);
        await settle();
      }
      const adminRoot = page.locator('[data-widget="product-compare"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 20000 });
      const adminSurface = await inspectProductCompareSurface(
        adminRoot,
        commerceProductMediaFixture,
        "admin"
      );
      if (adminSurface.error) {
        proof.error = adminSurface.error;
        proof.adminItemCount = adminSurface.itemCount || 0;
        return proof;
      }
      proof.adminItemCount = adminSurface.itemCount;
      proof.adminHasImage = true;
      proof.adminHasTitleLinks = true;
      proof.adminHasCta = true;

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoot = page.locator('[data-widget="product-compare"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 20000 });
      const publicSurface = await inspectProductCompareSurface(
        publicRoot,
        commerceProductMediaFixture,
        "public"
      );
      if (publicSurface.error) {
        proof.error = publicSurface.error;
        proof.publicItemCount = publicSurface.itemCount || 0;
        return proof;
      }
      proof.publicItemCount = publicSurface.itemCount;
      proof.publicHasImage = true;
      proof.publicHasTitleLinks = true;
      proof.publicHasCta = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function inspectProductTableSurface(root, fixture, scope) {
    const itemCount = Number(await root.getAttribute("data-product-table-count")) || 0;
    if (itemCount < 2) {
      return { error: scope + "_product_table_fixture_items_missing", itemCount };
    }
    const image = root.locator("img").first();
    await image.waitFor({ state: "visible", timeout: 10000 });
    const imageCount = await root.locator("img").count();
    if (imageCount < 2) {
      return { error: scope + "_product_table_images_missing", itemCount };
    }
    const alt = await image.getAttribute("alt");
    if (fixture?.alt && alt !== fixture.alt) {
      return { error: scope + "_product_table_image_alt_mismatch", itemCount };
    }
    const starterTitleLink = root.getByRole("link", { name: /^Fixture Starter Home$/i }).first();
    await starterTitleLink.waitFor({ state: "visible", timeout: 10000 });
    const starterHref = await starterTitleLink.getAttribute("href");
    if (!starterHref || !starterHref.startsWith("/fixture-products/fixture-starter-home")) {
      return { error: scope + "_product_table_title_link_href_mismatch", itemCount };
    }
    const actionLinks = root.getByRole("link", { name: /^Inspect fixture product$/i });
    const actionCount = await actionLinks.count();
    if (actionCount < 2) {
      return { error: scope + "_product_table_action_links_missing", itemCount };
    }
    const firstActionHref = await actionLinks.first().getAttribute("href");
    if (!firstActionHref || !firstActionHref.startsWith("/fixture-products/")) {
      return { error: scope + "_product_table_action_href_mismatch", itemCount };
    }
    return { itemCount };
  }
  async function runProductTableFixtureProof(item, adminPath) {
    if (item.widgetType !== "product-table") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasTitleLinks: false,
      publicHasTitleLinks: false,
      adminHasCta: false,
      publicHasCta: false,
      publicPath,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const advancedTab = page.getByRole("tab", { name: /^advanced$/i }).first();
      if ((await advancedTab.count()) > 0) {
        await advancedTab.click().catch(() => undefined);
        await settle();
      }
      const refreshButton = page.getByRole("button", { name: /refresh preview/i }).first();
      if ((await refreshButton.count()) > 0) {
        await refreshButton.click().catch(() => undefined);
        await settle();
      }
      const adminRoot = page.locator('[data-widget="product-table"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 20000 });
      const adminSurface = await inspectProductTableSurface(
        adminRoot,
        commerceProductMediaFixture,
        "admin"
      );
      if (adminSurface.error) {
        proof.error = adminSurface.error;
        proof.adminItemCount = adminSurface.itemCount || 0;
        return proof;
      }
      proof.adminItemCount = adminSurface.itemCount;
      proof.adminHasImage = true;
      proof.adminHasTitleLinks = true;
      proof.adminHasCta = true;

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoot = page.locator('[data-widget="product-table"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 20000 });
      const publicSurface = await inspectProductTableSurface(
        publicRoot,
        commerceProductMediaFixture,
        "public"
      );
      if (publicSurface.error) {
        proof.error = publicSurface.error;
        proof.publicItemCount = publicSurface.itemCount || 0;
        return proof;
      }
      proof.publicItemCount = publicSurface.itemCount;
      proof.publicHasImage = true;
      proof.publicHasTitleLinks = true;
      proof.publicHasCta = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runContentListFixtureProof(item, adminPath) {
    if (item.widgetType !== "content-list") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasTags: false,
      publicHasTags: false,
      adminHasCta: false,
      publicHasCta: false,
      adminHasLoadMore: false,
      publicHasViewAll: false,
      publicPath,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="content-list"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const adminRoot = page.locator('[data-listing-widget="content-list"][data-content-list-state="ready"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 15000 });
      proof.adminItemCount = Number(await adminRoot.getAttribute("data-content-list-items")) || await adminRoot.locator("[data-content-list-item]").count();
      if (proof.adminItemCount < 2) {
        proof.error = "admin_content_list_fixture_items_missing";
        return proof;
      }
      const adminImage = adminRoot.locator('[data-content-list-item="1"] img').first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminHasTags = (await adminRoot.locator("text=launch").count()) > 0 && (await adminRoot.locator("text=featured").count()) > 0;
      if (!proof.adminHasTags) {
        proof.error = "admin_content_list_tags_missing";
        return proof;
      }
      const adminCta = adminRoot.locator('a[href="/fixture-content-list/launch-brief"]').first();
      await adminCta.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasCta = true;
      const adminLoadMore = adminRoot.getByRole("link", { name: /more fixture stories/i }).first();
      await adminLoadMore.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasLoadMore = true;

      const paginationModeControl = editor.locator('[data-widget-control="content-list.visual.pagination.mode"]').first();
      await paginationModeControl.waitFor({ state: "visible", timeout: 10000 });
      await setRadixSelectOption(paginationModeControl, /view all page/i);

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoot = page.locator('[data-listing-widget="content-list"][data-content-list-state="ready"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 15000 });
      proof.publicItemCount = Number(await publicRoot.getAttribute("data-content-list-items")) || await publicRoot.locator("[data-content-list-item]").count();
      if (proof.publicItemCount < 2) {
        proof.error = "public_content_list_fixture_items_missing";
        return proof;
      }
      const publicImage = publicRoot.locator('[data-content-list-item="1"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicHasTags = (await publicRoot.locator("text=launch").count()) > 0 && (await publicRoot.locator("text=featured").count()) > 0;
      if (!proof.publicHasTags) {
        proof.error = "public_content_list_tags_missing";
        return proof;
      }
      const publicCta = publicRoot.locator('a[href="/fixture-content-list/launch-brief"]').first();
      await publicCta.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasCta = true;
      const publicViewAll = publicRoot.locator('a[href="/fixture-content-list"]').first();
      await publicViewAll.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasViewAll = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
`;
