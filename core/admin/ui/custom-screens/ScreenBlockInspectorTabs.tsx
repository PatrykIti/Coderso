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
  onPatchBlock,
  onArmSlotInsert,
  armedInsertSlotId,
}: {
  block: ScreenBlockV1;
  onPatchBlock: ScreenBlockInspectorProps["onPatchBlock"];
  onArmSlotInsert?: ScreenBlockInspectorProps["onArmSlotInsert"];
  armedInsertSlotId: string | null;
}) {
  const tabs = Array.isArray(block.data.tabs) ? (block.data.tabs as ScreenTabItem[]) : [];
  const slots = block.slots ?? {};

  const commit = (nextTabs: ScreenTabItem[], nextSlots: Record<string, ScreenBlockV1[]>) => {
    if (nextTabs.length < SCREEN_TABS_MIN || nextTabs.length > SCREEN_TABS_MAX) return;
    onPatchBlock(block.id, {
      data: { ...block.data, tabs: nextTabs },
      slots: nextSlots,
    });
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
              key={`${block.id}:${tab.id}:${tab.label}`}
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
                commit(nextTabs, nextSlots);
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
