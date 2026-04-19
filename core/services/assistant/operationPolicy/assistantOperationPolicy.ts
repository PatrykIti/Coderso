import type { AssistantOperationPolicy } from "./policyTypes";
import { pagesFormsListingsPolicies } from "./cmsResourcePolicies";

export const assistantOperationPolicy: AssistantOperationPolicy = {
  schemaVersion: 1,
  resources: {
    ...pagesFormsListingsPolicies,
  },
  followUp: {
    pronouns: [
      "je",
      "te",
      "ten",
      "ta",
      "tych",
      "pierwszy",
      "pierwsza",
      "oba",
      "obie",
      "these",
      "first",
    ],
    countWords: {
      jeden: 1,
      jedna: 1,
      pierwszy: 1,
      pierwsza: 1,
      one: 1,
      dwa: 2,
      dwie: 2,
      dwom: 2,
      "dwóm": 2,
      oba: 2,
      obie: 2,
      two: 2,
      trzy: 3,
      three: 3,
    },
  },
  safetyDefaults: {
    destructive: {
      requireReview: true,
      allowAllWhenFiltered: false,
      allowAllUnfiltered: false,
      requireExpectedCountForPartialMatch: true,
    },
  },
};
