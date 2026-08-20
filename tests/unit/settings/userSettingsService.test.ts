import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { users } from "../../../core/db/schema";
import {
  getUserSetting,
  listUserSettings,
  setUserSetting,
  validateUserSettingValue,
} from "../../../core/services/settings/userSettingsService";
import {
  normalizeScreenEntryPreferences,
  normalizeScreenEntryPreferencesSetting,
} from "../../../core/services/settings/screenEntryPreferencesContract";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanupUserIds: string[] = [];

afterAll(async () => {
  if (!hasDb) return;
  for (const userId of cleanupUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
});

testIfDb(
  "set/get/list user settings",
  async () => {
    const userId = randomUUID();
    cleanupUserIds.push(userId);

    await db.insert(users).values({
      id: userId,
      email: `user-${userId}@example.com`,
      passwordHash: "hash",
    });

    const defaultValue = await getUserSetting(userId, "pages.openAfterCreate");
    expect(defaultValue).toBe(true);
    const defaultCustomScreensOpenAfterCreate = await getUserSetting(
      userId,
      "customScreens.openAfterCreate"
    );
    expect(defaultCustomScreensOpenAfterCreate).toBe(true);
    const defaultFormsOpenAfterCreate = await getUserSetting(userId, "forms.openAfterCreate");
    expect(defaultFormsOpenAfterCreate).toBe(true);
    const defaultMedia = await getUserSetting(userId, "media.openAfterUpload");
    expect(defaultMedia).toBe(false);
    const defaultHeroPresets = await getUserSetting(userId, "widgets.hero.presets");
    expect(defaultHeroPresets).toEqual([]);
    const defaultPostEditorPreferences = await getUserSetting(userId, "posts.editor.preferences");
    expect(defaultPostEditorPreferences).toEqual({
      version: 2,
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: true,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: true,
    });
    const defaultAssistantMode = await getUserSetting(userId, "assistant.mode");
    expect(defaultAssistantMode).toBeNull();
    const defaultAssistantUi = await getUserSetting(userId, "assistant.ui.enabled");
    expect(defaultAssistantUi).toBe(true);
    const defaultAssistantAvatarEnabled = await getUserSetting(
      userId,
      "assistant.ui.avatarEnabled"
    );
    expect(defaultAssistantAvatarEnabled).toBe(false);
    const defaultAssistantAvatarAsset = await getUserSetting(userId, "assistant.ui.avatarAsset");
    expect(defaultAssistantAvatarAsset).toBeNull();
    const defaultScreenEntryPreferences = await getUserSetting(
      userId,
      "customScreens.entry.preferences"
    );
    expect(defaultScreenEntryPreferences).toEqual({
      version: 1,
      showFieldMetadata: false,
    });

    await setUserSetting(userId, "pages.openAfterCreate", false);
    await setUserSetting(userId, "customScreens.openAfterCreate", false);
    await setUserSetting(userId, "forms.openAfterCreate", false);
    await setUserSetting(userId, "media.openAfterUpload", true);
    await setUserSetting(userId, "widgets.hero.presets", [
      {
        name: "Homepage Hero",
        variant: "media-center",
        data: { headline: "Build faster" },
        updatedAt: "2026-02-06T10:00:00.000Z",
      },
    ]);
    await setUserSetting(userId, "posts.editor.preferences", {
      focusModeOnOpen: true,
      compactSidePanels: true,
      showOutlineHints: false,
      editorDensity: "compact",
      showKeyboardHints: false,
      defaultInspectorTab: "block",
      restoreLastSidebarsState: false,
    });
    await setUserSetting(userId, "assistant.mode", "docs-only");
    await setUserSetting(userId, "assistant.ui.enabled", false);
    await setUserSetting(userId, "assistant.ui.avatarEnabled", true);
    await setUserSetting(userId, "assistant.ui.avatarAsset", "assistant-bot.glb");
    await setUserSetting(userId, "customScreens.entry.preferences", {
      version: 1,
      showFieldMetadata: true,
    });
    const updated = await getUserSetting(userId, "pages.openAfterCreate");
    expect(updated).toBe(false);
    const updatedCustomScreensOpenAfterCreate = await getUserSetting(
      userId,
      "customScreens.openAfterCreate"
    );
    expect(updatedCustomScreensOpenAfterCreate).toBe(false);
    const updatedFormsOpenAfterCreate = await getUserSetting(userId, "forms.openAfterCreate");
    expect(updatedFormsOpenAfterCreate).toBe(false);
    const updatedMedia = await getUserSetting(userId, "media.openAfterUpload");
    expect(updatedMedia).toBe(true);
    const updatedHeroPresets = (await getUserSetting(userId, "widgets.hero.presets")) as Array<{
      data: Record<string, unknown>;
    }>;
    expect(updatedHeroPresets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Homepage Hero",
          variant: "media-center",
          data: expect.objectContaining({
            headline: "Build faster",
            layout: expect.objectContaining({
              align: "center",
              maxWidth: "xl",
              contentWidth: "lg",
              height: "auto",
              bleed: "contained",
            }),
          }),
          updatedAt: "2026-02-06T10:00:00.000Z",
        }),
      ])
    );
    const updatedPostEditorPreferences = await getUserSetting(userId, "posts.editor.preferences");
    expect(updatedPostEditorPreferences).toEqual({
      version: 2,
      focusModeOnOpen: true,
      compactSidePanels: true,
      showOutlineHints: false,
      editorDensity: "compact",
      showKeyboardHints: false,
      defaultInspectorTab: "block",
      restoreLastSidebarsState: false,
    });
    const updatedAssistantMode = await getUserSetting(userId, "assistant.mode");
    expect(updatedAssistantMode).toBe("docs-only");
    const updatedAssistantUi = await getUserSetting(userId, "assistant.ui.enabled");
    expect(updatedAssistantUi).toBe(false);
    const updatedAssistantAvatarEnabled = await getUserSetting(
      userId,
      "assistant.ui.avatarEnabled"
    );
    expect(updatedAssistantAvatarEnabled).toBe(true);
    const updatedAssistantAvatarAsset = await getUserSetting(userId, "assistant.ui.avatarAsset");
    expect(updatedAssistantAvatarAsset).toBe("assistant-bot.glb");
    expect(await getUserSetting(userId, "customScreens.entry.preferences")).toEqual({
      version: 1,
      showFieldMetadata: true,
    });

    const list = await listUserSettings(userId);
    expect(list["pages.openAfterCreate"]).toBe(false);
    expect(list["customScreens.openAfterCreate"]).toBe(false);
    expect(list["forms.openAfterCreate"]).toBe(false);
    expect(list["media.openAfterUpload"]).toBe(true);
    expect(list["widgets.hero.presets"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Homepage Hero",
          variant: "media-center",
          data: expect.objectContaining({
            headline: "Build faster",
            layout: expect.objectContaining({
              align: "center",
              maxWidth: "xl",
              contentWidth: "lg",
              height: "auto",
              bleed: "contained",
            }),
          }),
          updatedAt: "2026-02-06T10:00:00.000Z",
        }),
      ])
    );
    expect(list["posts.editor.preferences"]).toEqual({
      version: 2,
      focusModeOnOpen: true,
      compactSidePanels: true,
      showOutlineHints: false,
      editorDensity: "compact",
      showKeyboardHints: false,
      defaultInspectorTab: "block",
      restoreLastSidebarsState: false,
    });
    expect(list["assistant.mode"]).toBe("docs-only");
    expect(list["assistant.ui.enabled"]).toBe(false);
    expect(list["assistant.ui.avatarEnabled"]).toBe(true);
    expect(list["assistant.ui.avatarAsset"]).toBe("assistant-bot.glb");
    expect(list["customScreens.entry.preferences"]).toEqual({
      version: 1,
      showFieldMetadata: true,
    });
  },
  15_000
);

testIfDb(
  "normalizes hero preset data before persisting",
  async () => {
    const userId = randomUUID();
    cleanupUserIds.push(userId);

    await db.insert(users).values({
      id: userId,
      email: `user-${userId}@example.com`,
      passwordHash: "hash",
    });

    await setUserSetting(userId, "widgets.hero.presets", [
      {
        name: "Showcase Hero",
        variant: "media-center",
        data: {
          headline: "Product hero",
          layout: { height: "screen" },
          style: {
            cardShadow: "invalid-token",
            headlineSize: "giant",
            bodyWeight: "bold",
          },
          extra: "drop-me",
        },
        updatedAt: "2026-05-19T08:00:00.000Z",
      },
    ]);

    const updatedHeroPresets = (await getUserSetting(userId, "widgets.hero.presets")) as Array<{
      data: Record<string, unknown>;
    }>;

    expect(updatedHeroPresets).toEqual([
      {
        name: "Showcase Hero",
        variant: "media-center",
        data: expect.objectContaining({
          headline: "Product hero",
          layout: expect.objectContaining({
            align: "center",
            maxWidth: "xl",
            contentWidth: "lg",
            height: "screen",
            bleed: "contained",
          }),
          style: expect.objectContaining({
            cardShadow: "none",
            headlineSize: "3xl",
            bodyWeight: "bold",
          }),
        }),
        updatedAt: "2026-05-19T08:00:00.000Z",
      },
    ]);
    expect(updatedHeroPresets[0]?.data.extra).toBeUndefined();
  },
  15_000
);

testIfDb("rejects unknown key", async () => {
  const userId = randomUUID();
  cleanupUserIds.push(userId);

  await db.insert(users).values({
    id: userId,
    email: `user-${userId}@example.com`,
    passwordHash: "hash",
  });

  await expect(setUserSetting(userId, "unknown.key", true)).rejects.toThrow(
    "user_settings_key_invalid"
  );
});

testIfDb("rejects the retired widgets.favorites key", async () => {
  const userId = randomUUID();
  cleanupUserIds.push(userId);

  await db.insert(users).values({
    id: userId,
    email: `user-${userId}@example.com`,
    passwordHash: "hash",
  });

  await expect(setUserSetting(userId, "widgets.favorites", "hero")).rejects.toThrow(
    "user_settings_key_invalid"
  );

  await expect(setUserSetting(userId, "widgets.favorites", ["hero", "footer"])).rejects.toThrow(
    "user_settings_key_invalid"
  );

  await expect(
    setUserSetting(
      userId,
      "widgets.favorites",
      Array.from({ length: 51 }, (_, index) => `widget-${index}`)
    )
  ).rejects.toThrow("user_settings_key_invalid");
});

testIfDb("rejects invalid hero presets", async () => {
  const userId = randomUUID();
  cleanupUserIds.push(userId);

  await db.insert(users).values({
    id: userId,
    email: `user-${userId}@example.com`,
    passwordHash: "hash",
  });

  await expect(setUserSetting(userId, "widgets.hero.presets", "invalid")).rejects.toThrow(
    "user_settings_value_invalid"
  );

  await expect(
    setUserSetting(userId, "widgets.hero.presets", [
      {
        name: "  ",
        variant: "centered",
        data: { headline: "x" },
        updatedAt: "2026-02-06T10:00:00.000Z",
      },
    ])
  ).rejects.toThrow("user_settings_value_invalid");

  await expect(
    setUserSetting(userId, "widgets.hero.presets", [
      {
        name: "Preset",
        variant: "invalid",
        data: { headline: "x" },
        updatedAt: "2026-02-06T10:00:00.000Z",
      },
    ])
  ).rejects.toThrow("user_settings_value_invalid");

  await expect(
    setUserSetting(userId, "widgets.hero.presets", [
      {
        name: "Preset",
        variant: "centered",
        data: "invalid",
        updatedAt: "2026-02-06T10:00:00.000Z",
      },
    ])
  ).rejects.toThrow("user_settings_value_invalid");

  await expect(
    setUserSetting(
      userId,
      "widgets.hero.presets",
      Array.from({ length: 25 }, (_, index) => ({
        name: `Preset ${index}`,
        variant: "centered",
        data: { headline: `${index}` },
        updatedAt: "2026-02-06T10:00:00.000Z",
      }))
    )
  ).rejects.toThrow("user_settings_value_invalid");
});

testIfDb("rejects invalid assistant user settings", async () => {
  const userId = randomUUID();
  cleanupUserIds.push(userId);

  await db.insert(users).values({
    id: userId,
    email: `user-${userId}@example.com`,
    passwordHash: "hash",
  });

  await expect(setUserSetting(userId, "assistant.mode", "invalid")).rejects.toThrow(
    "user_settings_value_invalid"
  );
  await expect(setUserSetting(userId, "assistant.ui.enabled", "yes")).rejects.toThrow(
    "user_settings_value_invalid"
  );
  await expect(setUserSetting(userId, "assistant.ui.avatarAsset", 123)).rejects.toThrow(
    "user_settings_value_invalid"
  );
});

testIfDb("rejects invalid post editor preferences payload", async () => {
  const userId = randomUUID();
  cleanupUserIds.push(userId);

  await db.insert(users).values({
    id: userId,
    email: `user-${userId}@example.com`,
    passwordHash: "hash",
  });

  await expect(setUserSetting(userId, "posts.editor.preferences", "invalid")).rejects.toThrow(
    "user_settings_value_invalid"
  );
});

test("validateUserSettingValue validates assistant and post editor settings", () => {
  expect(validateUserSettingValue("customScreens.openAfterCreate", true)).toBe(true);
  expect(validateUserSettingValue("forms.openAfterCreate", true)).toBe(true);
  expect(() => validateUserSettingValue("customScreens.openAfterCreate", "yes")).toThrow(
    "user_settings_value_invalid"
  );
  expect(() => validateUserSettingValue("forms.openAfterCreate", "yes")).toThrow(
    "user_settings_value_invalid"
  );
  expect(validateUserSettingValue("assistant.mode", "llm-guide")).toBe("llm-guide");
  expect(validateUserSettingValue("assistant.mode", "llm-rag")).toBe("llm-guide");
  expect(validateUserSettingValue("assistant.mode", null)).toBeNull();
  expect(validateUserSettingValue("assistant.ui.enabled", true)).toBe(true);
  expect(validateUserSettingValue("assistant.ui.avatarEnabled", false)).toBe(false);
  expect(validateUserSettingValue("assistant.ui.avatarAsset", " assistant.glb ")).toBe(
    "assistant.glb"
  );
  expect(validateUserSettingValue("assistant.ui.avatarAsset", " ")).toBeNull();
  expect(() => validateUserSettingValue("assistant.mode", "unsupported")).toThrow(
    "user_settings_value_invalid"
  );
  expect(() =>
    validateUserSettingValue("assistant.ui.avatarAsset", {
      id: "asset-1",
    })
  ).toThrow("user_settings_value_invalid");

  expect(
    validateUserSettingValue("posts.editor.preferences", {
      focusModeOnOpen: true,
      compactSidePanels: true,
      showOutlineHints: false,
      editorDensity: "compact",
      showKeyboardHints: false,
      defaultInspectorTab: "block",
      restoreLastSidebarsState: false,
    })
  ).toEqual({
    version: 2,
    focusModeOnOpen: true,
    compactSidePanels: true,
    showOutlineHints: false,
    editorDensity: "compact",
    showKeyboardHints: false,
    defaultInspectorTab: "block",
    restoreLastSidebarsState: false,
  });

  expect(
    validateUserSettingValue("posts.editor.preferences", {
      focusModeOnOpen: "yes",
      editorDensity: "dense",
      defaultInspectorTab: "meta",
    })
  ).toEqual({
    version: 2,
    focusModeOnOpen: false,
    compactSidePanels: false,
    showOutlineHints: true,
    editorDensity: "comfortable",
    showKeyboardHints: true,
    defaultInspectorTab: "post",
    restoreLastSidebarsState: true,
  });
});

test("Screen entry preference storage is strict while its public view remains compatible", () => {
  expect(
    validateUserSettingValue("customScreens.entry.preferences", {
      version: 1,
      showFieldMetadata: true,
    })
  ).toEqual({ version: 1, showFieldMetadata: true });
  expect(
    normalizeScreenEntryPreferencesSetting({
      version: 1,
      showFieldMetadata: false,
    })
  ).toEqual({ version: 1, showFieldMetadata: false });
  expect(normalizeScreenEntryPreferences({ showFieldMetadata: true })).toEqual({
    showFieldMetadata: true,
  });

  for (const invalid of [
    null,
    [],
    { showFieldMetadata: true },
    { version: 2, showFieldMetadata: true },
    { version: 1, showFieldMetadata: "yes" },
    { version: 1, showFieldMetadata: true, extra: true },
  ]) {
    expect(() => validateUserSettingValue("customScreens.entry.preferences", invalid)).toThrow(
      "user_settings_value_invalid"
    );
    expect(() => normalizeScreenEntryPreferencesSetting(invalid)).toThrow(
      "user_settings_value_invalid"
    );
  }
});

testIfDb(
  "Screen entry preferences stay isolated by user",
  async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    cleanupUserIds.push(userA, userB);
    await db.insert(users).values([
      { id: userA, email: `user-${userA}@example.com`, passwordHash: "hash" },
      { id: userB, email: `user-${userB}@example.com`, passwordHash: "hash" },
    ]);

    await setUserSetting(userA, "customScreens.entry.preferences", {
      version: 1,
      showFieldMetadata: true,
    });
    expect(await getUserSetting(userA, "customScreens.entry.preferences")).toEqual({
      version: 1,
      showFieldMetadata: true,
    });
    expect(await getUserSetting(userB, "customScreens.entry.preferences")).toEqual({
      version: 1,
      showFieldMetadata: false,
    });
  },
  15_000
);
