import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";

export type ListingActionToastValue = "create" | "update" | "delete";

const listingActions = {
  create: { pastTense: "created", failureVerb: "create" },
  update: { pastTense: "updated", failureVerb: "update" },
  delete: { pastTense: "deleted", failureVerb: "delete" },
} satisfies Record<
  ListingActionToastValue,
  {
    pastTense: string;
    failureVerb: string;
  }
>;

export const listingQueryToasts = createListActionToastAdapter({
  labels: { singular: "listing query", plural: "listing queries" },
  actions: listingActions,
});

export const listingTemplateToasts = createListActionToastAdapter({
  labels: { singular: "listing template", plural: "listing templates" },
  actions: listingActions,
});
