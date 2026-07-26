import { useEffect, useState } from "react";

import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

export type EntryRelationTarget = { slug: string; name: string };

const mapRelationTargets = (items: ContentTypeSummary[]): EntryRelationTarget[] =>
  items.map((item) => ({ slug: item.slug, name: item.name }));

/**
 * The relation-field target list: seeded synchronously from the content-types cache
 * so the first render already has options, refreshed once on mount, and re-read
 * whenever the content-types list changes in this or another tab. Nothing else in the
 * editor reads or writes it, which makes it a self-contained unit.
 */
export function useEntryRelationTargets(): EntryRelationTarget[] {
  const [relationTargets, setRelationTargets] = useState<EntryRelationTarget[]>(() =>
    mapRelationTargets(getCachedContentTypes() ?? [])
  );

  useEffect(() => {
    let active = true;
    listContentTypesCached({ force: true })
      .then((types) => {
        if (!active) return;
        setRelationTargets(mapRelationTargets(types));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.contentTypesList) return;
      listContentTypesCached({ force: true })
        .then((types) => {
          setRelationTargets(mapRelationTargets(types));
        })
        .catch(() => undefined);
    });
  }, []);

  return relationTargets;
}
