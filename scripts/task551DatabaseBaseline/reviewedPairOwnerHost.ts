import {
  installTask551L02OwnerPauseResumeIngressForOwnerHost,
  revokeTask551L02OwnerPauseResumeIngressForOwnerHost,
  type Task551L02OwnerPauseResumeIngressV1,
} from "./reviewedPairTransition";

type Task551OwnerReviewFactory = () => Task551L02OwnerPauseResumeIngressV1["review"];

let focusedOwnerReviewFactory: Task551OwnerReviewFactory | undefined;

function createTask551OwnerReviewChannelForOwnerHost(): Task551L02OwnerPauseResumeIngressV1["review"] {
  const factory = focusedOwnerReviewFactory;
  if (factory !== undefined) return factory();
  return () => Object.freeze({ approved: false });
}

export async function runTask551L02OwnerHostInSameRealm<T>(
  invokeWorkflow: () => Promise<T>
): Promise<T> {
  if (typeof invokeWorkflow !== "function") {
    throw new Error("l02_owned_reviewed_transition_invalid");
  }
  let ownerReviewChannel: Task551L02OwnerPauseResumeIngressV1["review"] | undefined;
  let installed = false;
  try {
    ownerReviewChannel = createTask551OwnerReviewChannelForOwnerHost();
    installTask551L02OwnerPauseResumeIngressForOwnerHost(ownerReviewChannel);
    installed = true;
    return await invokeWorkflow();
  } finally {
    if (installed) revokeTask551L02OwnerPauseResumeIngressForOwnerHost();
    focusedOwnerReviewFactory = undefined;
    ownerReviewChannel = undefined as never;
  }
}

// The focused L02 persistence suite is the only supported consumer of this
// private host seam. It lets the suite model an owner decision without exposing
// an ingress through the facade, runner, or workflow callback.
export function replaceTask551OwnerReviewFactoryForFocusedTest(
  factory: Task551OwnerReviewFactory | undefined
): void {
  if (factory !== undefined && typeof factory !== "function") {
    throw new Error("l02_owned_reviewed_transition_invalid");
  }
  focusedOwnerReviewFactory = factory;
}

export function resetTask551OwnerReviewFactoryForFocusedTest(): void {
  focusedOwnerReviewFactory = undefined;
}
