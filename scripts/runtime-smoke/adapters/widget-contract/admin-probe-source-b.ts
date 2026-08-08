export const ADMIN_PROBE_SOURCE_B = `
  async function runGalleryMosaicMediaPickerProof(item, adminPath) {
    if (item.widgetType !== "gallery-mosaic") return null;
    const publicPath = item.mediaProofPublicPath || item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminHasImage: false,
      publicHasImage: false,
      publicPath,
      adminAlt: null,
      publicAlt: null,
      publicLightboxOpened: false,
      publicLightboxClosed: false,
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
      const editor = page.locator('[data-widget-editor="gallery-mosaic"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const mediaSection = editor.locator('[data-widget-editor-section="gallery-mosaic.visual.media-items-links"]').first();
      await mediaSection.waitFor({ state: "visible", timeout: 20000 });
      await mediaSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(galleryMosaicImageFixture);

      const interactionControl = editor.locator('[data-widget-control="gallery-mosaic.interaction.mode"]').first();
      await interactionControl.waitFor({ state: "visible", timeout: 10000 });
      await setRadixSelectOption(interactionControl, /open lightbox on click/i);

      const adminImage = page.locator('[data-gallery-item="1"][data-gallery-media-type="image"] img').first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminAlt = await adminImage.getAttribute("alt");
      proof.adminSrc = await adminImage.getAttribute("src");
      if (proof.adminAlt !== galleryMosaicImageFixture.alt) {
        proof.error = "admin_gallery_alt_mismatch";
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
      const publicImage = page.locator('[data-gallery-item="1"][data-gallery-media-type="image"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicAlt = await publicImage.getAttribute("alt");
      proof.publicSrc = await publicImage.getAttribute("src");
      if (proof.publicAlt !== galleryMosaicImageFixture.alt) {
        proof.error = "public_gallery_alt_mismatch";
        return proof;
      }
      const root = page.locator('[data-gallery-lightbox-root="1"]').first();
      await root.waitFor({ state: "visible", timeout: 10000 });
      const trigger = root.locator("[data-gallery-lightbox-trigger]").first();
      await trigger.waitFor({ state: "visible", timeout: 10000 });
      await trigger.click();
      const dialog = root.locator("[data-gallery-lightbox-dialog]").first();
      await dialog.waitFor({ state: "visible", timeout: 10000 });
      const isOpen = await root.getAttribute("data-gallery-lightbox-open");
      if (isOpen !== "true") {
        proof.error = "public_gallery_lightbox_not_open";
        return proof;
      }
      proof.publicLightboxOpened = true;
      await dialog.locator("[data-gallery-lightbox-close]").first().click();
      await page.waitForFunction(
        () => document.querySelector('[data-gallery-lightbox-root="1"]')?.getAttribute("data-gallery-lightbox-open") === "false",
        null,
        { timeout: 10000 }
      ).catch(() => undefined);
      const closedState = await root.getAttribute("data-gallery-lightbox-open");
      if (closedState !== "false") {
        proof.error = "public_gallery_lightbox_not_closed";
        return proof;
      }
      proof.publicLightboxClosed = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runTeamMediaPickerProof(item, adminPath) {
    if (item.widgetType !== "team") return null;
    const publicPath = item.mediaProofPublicPath || item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminHasImage: false,
      publicHasImage: false,
      publicPath,
      adminAlt: null,
      publicAlt: null,
      adminSrc: null,
      publicSrc: null,
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
      const editor = page.locator('[data-widget-editor="team"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const membersSection = editor.locator('[data-widget-editor-section="team.visual.members-content-order"]').first();
      await membersSection.waitFor({ state: "visible", timeout: 20000 });

      await membersSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(teamPhotoFixture);
      const firstMember = page.locator('[data-team-member="1"]').first();
      const adminImage = firstMember.locator("img").first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminAlt = await adminImage.getAttribute("alt");
      proof.adminSrc = await adminImage.getAttribute("src");
      if (!proof.adminSrc || /images\\.unsplash\\.com/i.test(proof.adminSrc)) {
        proof.error = "admin_team_seeded_photo_not_selected";
        return proof;
      }
      if (!/^Photo of /.test(proof.adminAlt || "")) {
        proof.error = "admin_team_photo_alt_mismatch";
        return proof;
      }

      await membersSection.getByRole("button", { name: /clear photo/i }).first().click();
      await settle();
      if ((await firstMember.locator("img").count()) > 0) {
        proof.error = "admin_team_clear_photo_failed";
        return proof;
      }

      await membersSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(teamPhotoFixture);
      await firstMember.locator("img").first().waitFor({ state: "visible", timeout: 10000 });

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
      const publicImage = page.locator('[data-team-member="1"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicAlt = await publicImage.getAttribute("alt");
      proof.publicSrc = await publicImage.getAttribute("src");
      if (!proof.publicSrc || /images\\.unsplash\\.com/i.test(proof.publicSrc)) {
        proof.error = "public_team_seeded_photo_not_rendered";
        return proof;
      }
      if (!/^Photo of /.test(proof.publicAlt || "")) {
        proof.error = "public_team_photo_alt_mismatch";
        return proof;
      }
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runRichTextSectionMediaAndSanitizerProof(item, adminPath) {
    if (item.widgetType !== "rich-text-section") return null;
    const publicPath = item.mediaProofPublicPath || item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminHasImage: false,
      publicHasImage: false,
      adminHasAttachment: false,
      publicHasAttachment: false,
      publicPath,
      adminAlt: null,
      publicAlt: null,
      adminSrc: null,
      publicSrc: null,
      adminAttachmentHref: null,
      publicAttachmentHref: null,
      sanitizerGuidanceShown: false,
      unsafeHrefBlocked: false,
      rawIframeBlocked: false,
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
      const editor = page.locator('[data-widget-editor="rich-text-section"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const bodySection = editor.locator('[data-widget-editor-section="rich-text-section.visual.body-content"]').first();
      await bodySection.waitFor({ state: "visible", timeout: 20000 });
      await setRadixSelectOption(bodySection, /use structured blocks only/i);

      const bodyEditable = bodySection.locator('[data-post-editor-primary-editable="true"]').first();
      await bodyEditable.waitFor({ state: "visible", timeout: 10000 });
      await page.evaluate(() => {
        window.__codersoRichTextOriginalPrompt = window.prompt;
        window.prompt = (message, defaultValue) => {
          if (/enter link url/i.test(String(message))) return "javascript:alert(1)";
          return "Unsafe link label";
        };
      });
      await bodyEditable.click();
      await bodySection.getByRole("button", { name: /^link$/i }).first().click();
      await settle();
      await page.evaluate(() => {
        if (window.__codersoRichTextOriginalPrompt) {
          window.prompt = window.__codersoRichTextOriginalPrompt;
          delete window.__codersoRichTextOriginalPrompt;
        }
      }).catch(() => undefined);
      const linkedBodyHtml = await bodyEditable.evaluate((node) => node.innerHTML);
      proof.unsafeHrefBlocked = !/javascript:/i.test(linkedBodyHtml);
      proof.sanitizerGuidanceShown =
        (await bodySection.getByText(/unsafe link urls are rewritten/i).count()) > 0;
      if (!proof.unsafeHrefBlocked) {
        proof.error = "admin_rich_text_unsafe_link_not_blocked";
        return proof;
      }
      if (!proof.sanitizerGuidanceShown) {
        proof.error = "admin_rich_text_unsafe_link_guidance_missing";
        return proof;
      }

      await bodyEditable.evaluate((node) => {
        node.focus();
        const payload = {
          "text/html": '<p>Unsafe pasted embed</p><iframe src="https://example.com/embed"></iframe>',
          "text/plain": "Unsafe pasted embed",
        };
        const clipboardData = {
          files: [],
          items: [],
          getData: (type) => payload[type] || "",
        };
        const event = new Event("paste", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "clipboardData", { value: clipboardData });
        node.dispatchEvent(event);
      });
      await settle();
      const pastedBodyHtml = await bodyEditable.evaluate((node) => node.innerHTML);
      proof.rawIframeBlocked = !/<iframe/i.test(pastedBodyHtml);
      if (!proof.rawIframeBlocked) {
        proof.error = "admin_rich_text_raw_iframe_not_blocked";
        return proof;
      }

      const blocksSection = editor.locator('[data-widget-editor-section="rich-text-section.visual.structured-content-blocks"]').first();
      await blocksSection.waitFor({ state: "visible", timeout: 20000 });
      await blocksSection.getByRole("button", { name: /add image block/i }).first().click();
      await settle();
      await blocksSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(richTextSectionImageFixture);
      const adminRoot = page.locator('[data-rich-text-rendered-source="blocks"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 10000 });
      const adminImage = adminRoot.locator("img").first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminAlt = await adminImage.getAttribute("alt");
      proof.adminSrc = await adminImage.getAttribute("src");
      if (proof.adminAlt !== richTextSectionImageFixture.alt) {
        proof.error = "admin_rich_text_image_alt_mismatch";
        return proof;
      }

      await blocksSection.getByRole("button", { name: /add attachment block/i }).first().click();
      await settle();
      await blocksSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(richTextSectionDocumentFixture);
      const adminAttachment = adminRoot
        .getByRole("link", { name: richTextSectionDocumentFixture.title })
        .first();
      await adminAttachment.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasAttachment = true;
      proof.adminAttachmentHref = await adminAttachment.getAttribute("href");
      if (!proof.adminAttachmentHref) {
        proof.error = "admin_rich_text_attachment_href_missing";
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
      const publicRoot = page.locator('[data-rich-text-rendered-source="blocks"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 10000 });
      const publicImage = publicRoot.locator("img").first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicAlt = await publicImage.getAttribute("alt");
      proof.publicSrc = await publicImage.getAttribute("src");
      if (proof.publicAlt !== richTextSectionImageFixture.alt) {
        proof.error = "public_rich_text_image_alt_mismatch";
        return proof;
      }
      const publicAttachment = publicRoot
        .getByRole("link", { name: richTextSectionDocumentFixture.title })
        .first();
      await publicAttachment.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasAttachment = true;
      proof.publicAttachmentHref = await publicAttachment.getAttribute("href");
      if (!proof.publicAttachmentHref) {
        proof.error = "public_rich_text_attachment_href_missing";
        return proof;
      }
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    } finally {
      await page.evaluate(() => {
        if (window.__codersoRichTextOriginalPrompt) {
          window.prompt = window.__codersoRichTextOriginalPrompt;
          delete window.__codersoRichTextOriginalPrompt;
        }
      }).catch(() => undefined);
    }
  }
  async function runWidgetMediaPickerProof(item, adminPath) {
    const logoProof = await runLogoCloudMediaPickerProof(item, adminPath);
    if (logoProof) return logoProof;
    const galleryProof = await runGalleryMosaicMediaPickerProof(item, adminPath);
    if (galleryProof) return galleryProof;
    const teamProof = await runTeamMediaPickerProof(item, adminPath);
    if (teamProof) return teamProof;
    return await runRichTextSectionMediaAndSanitizerProof(item, adminPath);
  }
  async function runWidgetProductGalleryProof(item, adminPath) {
    return await runProductGalleryFixtureProof(item, adminPath);
  }
  async function runWidgetProductCompareProof(item, adminPath) {
    return await runProductCompareFixtureProof(item, adminPath);
  }
  async function runWidgetProductTableProof(item, adminPath) {
    return await runProductTableFixtureProof(item, adminPath);
  }
  async function runWidgetContentProof(item, adminPath) {
    return await runContentListFixtureProof(item, adminPath);
  }
  async function runPostsFeedFixtureProof(item, adminPath) {
    if (item.widgetType !== "posts-feed") return null;
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
      const editor = page.locator('[data-widget-editor="posts-feed"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const adminMotion = page.locator('[data-posts-feed-motion="fade"]').first();
      await adminMotion.waitFor({ state: "visible", timeout: 15000 });
      const adminRoot = page.locator('[data-listing-widget="content-list"][data-content-list-source="post"][data-content-list-state="ready"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 15000 });
      proof.adminItemCount = Number(await adminRoot.getAttribute("data-content-list-items")) || await adminRoot.locator("[data-content-list-item]").count();
      if (proof.adminItemCount < 3) {
        proof.error = "admin_posts_feed_fixture_items_missing";
        return proof;
      }
      const adminImage = adminRoot.locator('[data-content-list-item="1"] img').first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminHasTags = (await adminRoot.locator("text=featured").count()) > 0 && (await adminRoot.locator("text=launch").count()) > 0;
      if (!proof.adminHasTags) {
        proof.error = "admin_posts_feed_tags_missing";
        return proof;
      }
      const adminCta = adminRoot.locator('a[href="/fixture-posts/fixture-posts-launch-brief"]').first();
      await adminCta.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasCta = true;
      const adminLoadMore = adminRoot.getByRole("link", { name: /more fixture posts/i }).first();
      await adminLoadMore.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasLoadMore = true;

      const paginationModeControl = editor.locator('[data-widget-control="posts-feed.visual.pagination-mode"]').first();
      await paginationModeControl.waitFor({ state: "visible", timeout: 10000 });
      await setRadixSelectOption(paginationModeControl, /view all link/i);

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
      const publicMotion = page.locator('[data-posts-feed-motion="fade"]').first();
      await publicMotion.waitFor({ state: "visible", timeout: 15000 });
      const publicRoot = page.locator('[data-listing-widget="content-list"][data-content-list-source="post"][data-content-list-state="ready"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 15000 });
      proof.publicItemCount = Number(await publicRoot.getAttribute("data-content-list-items")) || await publicRoot.locator("[data-content-list-item]").count();
      if (proof.publicItemCount < 3) {
        proof.error = "public_posts_feed_fixture_items_missing";
        return proof;
      }
      const publicImage = publicRoot.locator('[data-content-list-item="1"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicHasTags = (await publicRoot.locator("text=featured").count()) > 0 && (await publicRoot.locator("text=launch").count()) > 0;
      if (!proof.publicHasTags) {
        proof.error = "public_posts_feed_tags_missing";
        return proof;
      }
      const publicCta = publicRoot.locator('a[href="/fixture-posts/fixture-posts-launch-brief"]').first();
      await publicCta.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasCta = true;
      const publicViewAll = publicRoot.locator('a[href="/fixture-posts"]').first();
      await publicViewAll.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasViewAll = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runEntryTeaserFixtureProof(item, adminPath) {
    if (item.widgetType !== "entry-teaser") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminReadyCount: 0,
      publicReadyCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasTags: false,
      publicHasTags: false,
      adminHasCta: false,
      publicHasCta: false,
      adminHasLoadMore: false,
      publicHasViewAll: false,
      publicPath,
      consoleErrors: [],
      error: undefined,
    };
    const consoleStartIndex = consoleErrors.length;
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
      const editor = page.locator('[data-widget-editor="entry-teaser"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const adminRoots = page.locator('[data-listing-widget="entry-teaser"][data-entry-teaser-state="ready"]');
      await adminRoots.first().waitFor({ state: "visible", timeout: 15000 });
      proof.adminReadyCount = await adminRoots.count();
      proof.adminItemCount = proof.adminReadyCount;
      if (proof.adminReadyCount < 3) {
        proof.error = "admin_entry_teaser_ready_roots_missing";
        return proof;
      }
      const adminImage = adminRoots.first().locator("img").first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminHasTags =
        (await page.locator("text=manual").count()) > 0 &&
        (await page.locator("text=launch").count()) > 0 &&
        (await page.locator("text=featured").count()) > 0 &&
        (await page.locator("text=fallback").count()) > 0;
      if (!proof.adminHasTags) {
        proof.error = "admin_entry_teaser_tags_missing";
        return proof;
      }
      const adminCta = page
        .locator('a[href="/fixture-entry-teaser/fixture-entry-teaser-manual-brief"]')
        .first();
      await adminCta.waitFor({ state: "visible", timeout: 10000 });
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
      const publicRoots = page.locator('[data-listing-widget="entry-teaser"][data-entry-teaser-state="ready"]');
      await publicRoots.first().waitFor({ state: "visible", timeout: 15000 });
      proof.publicReadyCount = await publicRoots.count();
      proof.publicItemCount = proof.publicReadyCount;
      if (proof.publicReadyCount < 3) {
        proof.error = "public_entry_teaser_ready_roots_missing";
        return proof;
      }
      const publicImage = publicRoots.first().locator("img").first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicHasTags =
        (await page.locator("text=manual").count()) > 0 &&
        (await page.locator("text=launch").count()) > 0 &&
        (await page.locator("text=featured").count()) > 0 &&
        (await page.locator("text=fallback").count()) > 0;
      if (!proof.publicHasTags) {
        proof.error = "public_entry_teaser_tags_missing";
        return proof;
      }
      const publicCta = page
        .locator('a[href="/fixture-entry-teaser/fixture-entry-teaser-manual-brief"]')
        .first();
      await publicCta.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasCta = true;

      proof.consoleErrors = consoleErrors.slice(consoleStartIndex);
      if (proof.consoleErrors.length > 0) {
        proof.error = "entry_teaser_console_errors";
        return proof;
      }
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.consoleErrors = consoleErrors.slice(consoleStartIndex);
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runWidgetPostsProof(item, adminPath) {
    return await runPostsFeedFixtureProof(item, adminPath);
  }
  async function runWidgetEntryTeaserProof(item, adminPath) {
    return await runEntryTeaserFixtureProof(item, adminPath);
  }
  await verifyAuthenticated();
  if (!requiredLogin.authenticated) {
    return JSON.stringify({ login: requiredLogin, results: [], error: requiredLogin.error || "login_failed" });
  }
  const pagesResponse = await fetchPages();
  if (!pagesResponse.ok) {
    return JSON.stringify({ login: requiredLogin, results: [], error: "pages_api_failed:" + pagesResponse.status });
  }
  const pages = JSON.parse(pagesResponse.text);
  const results = [];
  for (const item of cases) {
    const pageRow = pages.find((page) => page.slug === item.adminFixtureSlug);
    if (!pageRow) {
      results.push({ widgetType: item.widgetType, status: "fixture-gap", modes: [], duplicateWritablePaths: [], error: "admin_fixture_not_found" });
      continue;
    }
    const adminPath = adminUrl + "/pages/" + encodeURIComponent(pageRow.id);
    const modes = [];
    let selected = await openFixtureAndSelect(item, pageRow, adminPath);
    if (!selected.ok) {
      await settle();
      selected = await openFixtureAndSelect(item, pageRow, adminPath);
    }
    if (!selected.ok) {
      results.push({
        widgetType: item.widgetType,
        status: "failed",
        pageId: pageRow.id,
        adminPath,
        modes,
        duplicateWritablePaths: [],
        error: selected.error || "block_select_missing"
      });
      continue;
    }
    for (const mode of item.requiredModes) {
      modes.push(await inspectMode(item.widgetType, mode));
    }
    const hasMetadataGap = modes.some((mode) => mode.controlsWithoutPath > 0);
    const duplicates = hasMetadataGap ? [] : duplicatePaths(modes, item.allowedDuplicateWritablePaths || []);
    const hasModeFailure = modes.some((mode) => mode.status === "failed");
    const mediaProof = hasModeFailure ? null : await runWidgetMediaPickerProof(item, adminPath);
    const productGalleryProof = hasModeFailure ? null : await runWidgetProductGalleryProof(item, adminPath);
    const productCompareProof = hasModeFailure ? null : await runWidgetProductCompareProof(item, adminPath);
    const productTableProof = hasModeFailure ? null : await runWidgetProductTableProof(item, adminPath);
    const contentProof = hasModeFailure ? null : await runWidgetContentProof(item, adminPath);
    const postsProof = hasModeFailure ? null : await runWidgetPostsProof(item, adminPath);
    const entryTeaserProof = hasModeFailure ? null : await runWidgetEntryTeaserProof(item, adminPath);
    const hasMediaProofFailure = Boolean(mediaProof && mediaProof.status !== "passed");
    const hasProductGalleryProofFailure = Boolean(productGalleryProof && productGalleryProof.status !== "passed");
    const hasProductCompareProofFailure = Boolean(productCompareProof && productCompareProof.status !== "passed");
    const hasProductTableProofFailure = Boolean(productTableProof && productTableProof.status !== "passed");
    const hasContentProofFailure = Boolean(contentProof && contentProof.status !== "passed");
    const hasPostsProofFailure = Boolean(postsProof && postsProof.status !== "passed");
    const hasEntryTeaserProofFailure = Boolean(entryTeaserProof && entryTeaserProof.status !== "passed");
    const hasFailure = hasModeFailure || duplicates.length > 0 || hasMediaProofFailure || hasProductGalleryProofFailure || hasProductCompareProofFailure || hasProductTableProofFailure || hasContentProofFailure || hasPostsProofFailure || hasEntryTeaserProofFailure;
    results.push({
      widgetType: item.widgetType,
      status: hasFailure ? "failed" : hasMetadataGap ? "metadata-gap" : "passed",
      pageId: pageRow.id,
      adminPath,
      modes,
      duplicateWritablePaths: duplicates,
      mediaProof: mediaProof || undefined,
      productGalleryProof: productGalleryProof || undefined,
      productCompareProof: productCompareProof || undefined,
      productTableProof: productTableProof || undefined,
      contentProof: contentProof || undefined,
      postsProof: postsProof || undefined,
      entryTeaserProof: entryTeaserProof || undefined,
      error: hasMediaProofFailure
        ? mediaProof.error || "media_picker_proof_failed"
        : hasProductGalleryProofFailure
          ? productGalleryProof.error || "product_gallery_fixture_proof_failed"
          : hasProductCompareProofFailure
            ? productCompareProof.error || "product_compare_fixture_proof_failed"
            : hasProductTableProofFailure
              ? productTableProof.error || "product_table_fixture_proof_failed"
              : hasContentProofFailure
                ? contentProof.error || "content_list_fixture_proof_failed"
                : hasPostsProofFailure
                  ? postsProof.error || "posts_feed_fixture_proof_failed"
                  : hasEntryTeaserProofFailure
                    ? entryTeaserProof.error || "entry_teaser_fixture_proof_failed"
                    : undefined,
    });
  }
  return JSON.stringify({ login: requiredLogin, results });
`;
