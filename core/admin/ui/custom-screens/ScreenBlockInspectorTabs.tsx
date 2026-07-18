import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SCREEN_TAB_LABEL_MAX,
  SCREEN_TABS_MAX,
  SCREEN_TABS_MIN,
  type ScreenBlockV1,
  type ScreenTabItem,
} from "../../../services/customScreens/customScreenSchemas";
import { collectScreenBlockIds } from "../../../services/customScreens/screenDocumentOps";
import { InspectorRow } from "./ScreenBlockInspectorControls";
import type { ScreenBlockInspectorProps } from "./screenBlockInspectorModel";

const nextTabId = (tabs: readonly ScreenTabItem[]) => {
  let suffix = tabs.length + 1;
  while (tabs.some((tab) => tab.id === `tab-${suffix}`)) suffix += 1;
  return `tab-${suffix}`;
};

const screenLabelLength = (value: string) => Array.from(value).length;

type ScreenTabLabelDraft = Readonly<{
  baseLabel: string;
  value: string;
}>;

function TabLabelInput({
  tab,
  index,
  onCommit,
}: {
  tab: ScreenTabItem;
  index: number;
  onCommit: (label: string) => void;
}) {
  const [draft, setDraft] = useState<ScreenTabLabelDraft>(() => ({
    baseLabel: tab.label,
    value: tab.label,
  }));
  // The input keeps a commit-stable key so a keyboard commit never remounts (and so
  // never drops focus). Stale-draft invalidation therefore happens here: whenever the
  // committed label moves away from the one this draft was based on, the draft resets
  // during render.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (draft.baseLabel !== tab.label) {
    setDraft({ baseLabel: tab.label, value: tab.label });
  }
  const restoreCommitted = () => setDraft({ baseLabel: tab.label, value: tab.label });
  const commitDraft = (raw: string) => {
    const label = raw.trim();
    if (!label || screenLabelLength(label) > SCREEN_TAB_LABEL_MAX) {
      restoreCommitted();
      return;
    }
    if (label === tab.label) {
      restoreCommitted();
      return;
    }
    setDraft({ baseLabel: tab.label, value: label });
    onCommit(label);
  };

  return (
    <Input
      value={draft.value}
      data-screen-tab-label={tab.id}
      aria-label={`Label for ${tab.label}`}
      onChange={(event) => {
        setDraft({ baseLabel: tab.label, value: event.target.value });
      }}
      onBlur={(event) => commitDraft(event.currentTarget.value)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          commitDraft(event.currentTarget.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          restoreCommitted();
        }
      }}
      placeholder={`Tab ${index + 1}`}
    />
  );
}

/** Tabs authoring keeps labels buffered and data.tabs / slots in lockstep. */
export function TabsEditor({
  block,
  bindings,
  onPatchBlock,
  onPatchBinding,
  onArmSlotInsert,
  armedInsertSlotId,
}: {
  block: ScreenBlockV1;
  bindings: ScreenBlockInspectorProps["bindings"];
  onPatchBlock: ScreenBlockInspectorProps["onPatchBlock"];
  onPatchBinding: ScreenBlockInspectorProps["onPatchBinding"];
  onArmSlotInsert?: ScreenBlockInspectorProps["onArmSlotInsert"];
  armedInsertSlotId: string | null;
}) {
  const tabs = Array.isArray(block.data.tabs) ? (block.data.tabs as ScreenTabItem[]) : [];
  const slots: Record<string, ScreenBlockV1[]> = block.slots ?? {};

  const commit = (nextTabs: ScreenTabItem[], nextSlots: Record<string, ScreenBlockV1[]>) => {
    if (nextTabs.length < SCREEN_TABS_MIN || nextTabs.length > SCREEN_TABS_MAX) return false;
    onPatchBlock(block.id, {
      data: { ...block.data, tabs: nextTabs },
      slots: nextSlots,
    });
    return true;
  };

  // Removing a tab deletes its whole slot subtree, so the bindings that pointed into
  // it must be collected on the same gesture. Block and section deletion already do
  // this on the host; the generic block patch does not, which would otherwise leave
  // this one deletion path raising the orphan-bindings alert.
  const clearBindingsForSlot = (slotId: string) => {
    const removedBlockIds = new Set((slots[slotId] ?? []).flatMap(collectScreenBlockIds));
    if (removedBlockIds.size === 0) return;
    for (const binding of bindings) {
      if (removedBlockIds.has(binding.blockId)) {
        onPatchBinding(binding.blockId, binding.propPath, { field: "" });
      }
    }
  };

  const commitLabel = (tab: ScreenTabItem, label: string) => {
    commit(
      tabs.map((item) => (item.id === tab.id ? { ...item, label } : item)),
      slots
    );
  };

  return (
    <InspectorRow label="Tabs">
      <div className="flex flex-col gap-2">
        {tabs.map((tab, index) => (
          <div key={tab.id} className="flex flex-wrap items-center gap-2">
            <TabLabelInput
              key={`${block.id}:${tab.id}`}
              tab={tab}
              index={index}
              onCommit={(label) => commitLabel(tab, label)}
            />
            <Button
              type="button"
              variant={armedInsertSlotId === tab.id ? "secondary" : "outline"}
              size="sm"
              aria-label={`Edit content for ${tab.label}`}
              aria-pressed={armedInsertSlotId === tab.id}
              onClick={(event) => {
                event.stopPropagation();
                onArmSlotInsert?.(block.id, tab.id);
              }}
            >
              Edit content
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Remove ${tab.label || `tab ${index + 1}`}`}
              disabled={tabs.length <= SCREEN_TABS_MIN}
              onClick={(event) => {
                event.stopPropagation();
                if (tabs.length <= SCREEN_TABS_MIN) return;
                const nextTabs = tabs.filter((_, itemIndex) => itemIndex !== index);
                const nextSlots = Object.fromEntries(
                  Object.entries(slots).filter(([slotId]) => slotId !== tab.id)
                );
                if (commit(nextTabs, nextSlots)) clearBindingsForSlot(tab.id);
                const nearestTab = nextTabs[Math.min(index, nextTabs.length - 1)];
                if (nearestTab) onArmSlotInsert?.(block.id, nearestTab.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={tabs.length >= SCREEN_TABS_MAX}
          onClick={(event) => {
            event.stopPropagation();
            if (tabs.length >= SCREEN_TABS_MAX) return;
            const nextId = nextTabId(tabs);
            const nextTabs = [...tabs, { id: nextId, label: `Tab ${tabs.length + 1}` }];
            commit(nextTabs, { ...slots, [nextId]: [] });
            onArmSlotInsert?.(block.id, nextId);
          }}
        >
          Add tab
        </Button>
      </div>
    </InspectorRow>
  );
}
