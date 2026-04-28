import { assertFormSubmissionNonce, createFormSubmissionNonce } from "../forms/submissionNonce";

const BOOKING_SLOTS_TOKEN_SCOPE = "booking_public_slots";

export function createBookingSlotsToken(now = Date.now()) {
  return createFormSubmissionNonce(BOOKING_SLOTS_TOKEN_SCOPE, now);
}

export function assertBookingSlotsToken(
  token: string | null | undefined,
  now = Date.now()
) {
  assertFormSubmissionNonce(BOOKING_SLOTS_TOKEN_SCOPE, token, now);
}
