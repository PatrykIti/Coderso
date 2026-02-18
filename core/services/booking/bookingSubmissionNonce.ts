import { assertFormSubmissionNonce, createFormSubmissionNonce } from "../forms/submissionNonce";

const BOOKING_SUBMISSION_NONCE_SCOPE = "booking_public_submission";

export function createBookingSubmissionNonce(now = Date.now()) {
  return createFormSubmissionNonce(BOOKING_SUBMISSION_NONCE_SCOPE, now);
}

export function assertBookingSubmissionNonce(
  nonce: string | null | undefined,
  now = Date.now()
) {
  assertFormSubmissionNonce(BOOKING_SUBMISSION_NONCE_SCOPE, nonce, now);
}
