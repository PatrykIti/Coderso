import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";

export type CustomScreenListAction =
  | "create"
  | "activate"
  | "moveToDraft"
  | "delete";

export const customScreenListToasts =
  createListActionToastAdapter<CustomScreenListAction>({
    labels: { singular: "custom screen", plural: "custom screens" },
    actions: {
      create: { pastTense: "created", failureVerb: "create" },
      activate: { pastTense: "activated", failureVerb: "activate" },
      moveToDraft: {
        pastTense: "moved to draft",
        failureVerb: "move to draft",
        bulkPartialMessage: ({ succeededCount, failedCount, labels }) =>
          `Moved ${succeededCount} ${
            succeededCount === 1 ? labels.singular : labels.plural
          } to draft; failed ${failedCount}.`,
        bulkFailureMessage: ({ failedCount, labels }) =>
          `Failed to move ${failedCount} ${
            failedCount === 1 ? labels.singular : labels.plural
          } to draft.`,
      },
      delete: { pastTense: "deleted", failureVerb: "delete" },
    },
  });
