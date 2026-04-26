import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";

export type CommerceListAction =
  | "create"
  | "publish"
  | "draft"
  | "archive"
  | "delete";

export const commerceListToasts =
  createListActionToastAdapter<CommerceListAction>({
    labels: { singular: "product", plural: "products" },
    actions: {
      create: { pastTense: "created", failureVerb: "create" },
      publish: { pastTense: "published", failureVerb: "publish" },
      draft: { pastTense: "moved to draft", failureVerb: "move to draft" },
      archive: { pastTense: "archived", failureVerb: "archive" },
      delete: { pastTense: "deleted", failureVerb: "delete" },
    },
  });
