import { useEffect, useMemo, useState } from "react";

import { getSetting, type PostEditorMode } from "@/services/settingsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { EntryEditor } from "@/ui/entries/EntryEditor";

import { PostBlockEditorShell } from "./editor/PostBlockEditorShell";

const isPostEditorMode = (value: unknown): value is PostEditorMode =>
  value === "blocks" || value === "classic";

const resolveModeFromPathQuery = (path: string): PostEditorMode | null => {
  const searchIndex = path.indexOf("?");
  if (searchIndex === -1) return null;
  const hashIndex = path.indexOf("#", searchIndex);
  const search = hashIndex === -1 ? path.slice(searchIndex) : path.slice(searchIndex, hashIndex);
  const params = new URLSearchParams(search);
  const queryValue = params.get("editor");
  return isPostEditorMode(queryValue) ? queryValue : null;
};

export const resolvePostEditorMode = (
  path: string,
  settingsValue: unknown
): PostEditorMode => {
  const fromQuery = resolveModeFromPathQuery(path);
  if (fromQuery) return fromQuery;
  if (isPostEditorMode(settingsValue)) return settingsValue;
  return "blocks";
};

export function PostEditorPage() {
  const { path } = useAdminRouter();
  const [settingsMode, setSettingsMode] = useState<unknown>(null);

  const queryMode = useMemo(() => resolveModeFromPathQuery(path), [path]);

  useEffect(() => {
    if (queryMode) return;
    let active = true;
    getSetting("posts.editor.mode")
      .then((setting) => {
        if (!active) return;
        setSettingsMode(setting?.value);
      })
      .catch(() => {
        if (!active) return;
        setSettingsMode(null);
      });
    return () => {
      active = false;
    };
  }, [queryMode]);

  const mode = useMemo(
    () => resolvePostEditorMode(path, settingsMode),
    [path, settingsMode]
  );

  if (mode === "classic") {
    return <EntryEditor mode="posts" />;
  }

  return <PostBlockEditorShell />;
}
