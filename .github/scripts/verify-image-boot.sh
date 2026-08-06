#!/usr/bin/env bash
#
# Boot gate for the coderso-core runtime image.
#
# WHY THIS EXISTS
# The image runs the application straight off TypeScript source
# (`CMD ["bun", ..., "run", "server/dockerStart.ts"]`), so imports are resolved
# at BOOT, not at build time. A module that is missing from the runner stage
# therefore does not break `docker build` at all — it breaks the first start of
# the container. Every gate that only builds the image is blind to that whole
# class of change.
#
# WHAT IT PROVES
#   1. the image starts;
#   2. it survives `dockerStart.ts` — startup migrations applied from an empty
#      database, then the assistant docs reindex;
#   3. it answers HTTP on the port it was told to use, serving the admin bundle
#      that the builder stage produced;
#   4. a routed API request completes a database round trip.
#
# FAIL-CLOSED CONTRACT
# The only exit status 0 in this script is the one at the very bottom, reached
# after every assertion above has passed. Every other path — bad input, docker
# refusing to start the container, the container exiting, the probe timing out,
# a non-200 answer, a missing startup-migration line — prints the container's
# own log and exits non-zero. There is no warn-and-continue branch.
#
# REQUIRED ENVIRONMENT
#   IMAGE_REF     image to boot; must already exist in the local docker daemon
#   DATABASE_URL  connection string handed to the container
#
# OPTIONAL ENVIRONMENT
#   APP_PORT               port the app binds and the probe dials (default 3210)
#   BOOT_TIMEOUT_SECONDS   total wait for the first HTTP 200 (default 240)
#   POLL_INTERVAL_SECONDS  delay between probes (default 3)
#   CONTAINER_NAME         docker container name (default coderso-image-boot-gate)
#   BOOT_LOG_FILE          where the container log is written (default
#                          .tmp/image-boot-gate.log)

set -Eeuo pipefail

IMAGE_REF="${IMAGE_REF:-}"
DATABASE_URL="${DATABASE_URL:-}"
APP_PORT="${APP_PORT:-3210}"
BOOT_TIMEOUT_SECONDS="${BOOT_TIMEOUT_SECONDS:-240}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-3}"
CONTAINER_NAME="${CONTAINER_NAME:-coderso-image-boot-gate}"
BOOT_LOG_FILE="${BOOT_LOG_FILE:-.tmp/image-boot-gate.log}"

# Matches how every Bun/Node runtime words "this module is not in the image".
MISSING_MODULE_PATTERN='cannot find (module|package)|could not resolve|failed to resolve|ERR_MODULE_NOT_FOUND|maybe you need to "bun install"'

fail() {
  echo "::error::$*" >&2
  exit 1
}

log_section() {
  echo "----- $* -----"
}

capture_logs() {
  if docker inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
    docker logs "${CONTAINER_NAME}" >"${BOOT_LOG_FILE}" 2>&1 || true
  fi
  [ -f "${BOOT_LOG_FILE}" ] || : >"${BOOT_LOG_FILE}"
}

dump_logs() {
  log_section "container log (${CONTAINER_NAME})"
  cat "${BOOT_LOG_FILE}" || true
  log_section "end container log"
}

# Turn the raw log into a named cause. A boot failure that only says "timed out"
# is a gate that tells you nothing, so the recognised signatures each get their
# own annotation naming what the image is actually missing.
diagnose() {
  if grep -qiE "${MISSING_MODULE_PATTERN}" "${BOOT_LOG_FILE}"; then
    echo "::error::MISSING MODULE AT BOOT — the runtime stage of the image does not contain a module the boot path imports. The build could not catch this: the container runs TypeScript source and resolves imports when it starts. Matching log lines:"
    grep -inE "${MISSING_MODULE_PATTERN}" "${BOOT_LOG_FILE}" | head -n 20 || true
    return
  fi
  if grep -q "startup_migrations_database_url_missing" "${BOOT_LOG_FILE}"; then
    echo "::error::The container booted without a usable DATABASE_URL, so this run proved nothing about the image. Check that the postgres service container is healthy and that DATABASE_URL reached the container."
    return
  fi
  if grep -q "\[startup\] Database migrations failed" "${BOOT_LOG_FILE}"; then
    echo "::error::STARTUP MIGRATIONS FAILED against an empty database — the migration set does not apply from zero."
    grep -n "\[startup\] Database migrations failed" "${BOOT_LOG_FILE}" | head -n 5 || true
    return
  fi
  if grep -q "assistant_startup_docs_source_missing" "${BOOT_LOG_FILE}"; then
    echo "::error::The image does not contain the assistant docs source tree the boot path reindexes (Dockerfile 'COPY docs docs')."
    return
  fi
  # This gate turns the reindex ON (CODERSO_ASSISTANT_DOCS_REINDEX_ON_START=1),
  # dockerStart.ts awaits it before the server listens, and
  # runStartupAssistantDocsReindex rethrows on any status other than "success" —
  # so a document the ingest rejects aborts the boot as surely as a missing
  # module, and it is not the image's fault. The log line and the
  # assistant_startup_docs_reindex_<status> message are both written by
  # core/server/startupAssistantDocs.ts.
  if grep -q "\[startup\] Assistant docs reindex failed" "${BOOT_LOG_FILE}"; then
    if grep -q "assistant_startup_docs_reindex_partial" "${BOOT_LOG_FILE}"; then
      echo "::error::ASSISTANT DOCS INGEST REJECTED A DOCUMENT — the reindex finished 'partial', which the boot path treats as failure: at least one file in the image's docs tree failed validation (missing or invalid frontmatter, an oversized chunk, too many chunks). The image is fine; a document under docs/ is not. Matching log lines:"
    else
      echo "::error::ASSISTANT DOCS REINDEX FAILED AT BOOT — the container never reached the point of listening, because dockerStart.ts awaits the reindex before starting the server. Matching log lines:"
    fi
    grep -n "\[startup\] Assistant docs reindex failed" "${BOOT_LOG_FILE}" | head -n 5 || true
    return
  fi
  if grep -qi "EADDRINUSE" "${BOOT_LOG_FILE}"; then
    echo "::error::The container could not bind port ${APP_PORT}; something else on the runner already holds it."
    return
  fi
  echo "::error::The image did not serve, and its log matches no known boot-failure signature. The full container log is printed above and uploaded as a workflow artifact."
}

cleanup() {
  capture_logs
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  if [ -n "${API_BODY_FILE:-}" ]; then
    rm -f "${API_BODY_FILE}"
  fi
  return 0
}

[ -n "${IMAGE_REF}" ] || fail "IMAGE_REF is required; the image boot gate will not pretend to verify an unnamed image."
[ -n "${DATABASE_URL}" ] || fail "DATABASE_URL is required; the boot path refuses to start without one and the gate would prove nothing."

mkdir -p "$(dirname "${BOOT_LOG_FILE}")"
trap cleanup EXIT

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "Booting ${IMAGE_REF} as ${CONTAINER_NAME} on port ${APP_PORT}"
# --network host: the postgres service container publishes 5432 on the runner,
# so the app container reaches it at 127.0.0.1 and the probe reaches the app the
# same way. No secret, no shared database, nothing to clean up off-runner.
#
# The startup switches are set to their ENABLED values on purpose rather than
# left to defaults: migrations running from an empty database is part of what
# this gate proves, and pinning it here keeps that true if the defaults change.
#
# VITE_DEV_SERVER_URL is deliberately NOT set — the admin handler redirects to a
# dev server when it is present, which would make the probe pass without the
# image serving anything.
if ! docker run \
  --detach \
  --name "${CONTAINER_NAME}" \
  --network host \
  --env "DATABASE_URL=${DATABASE_URL}" \
  --env "PORT=${APP_PORT}" \
  --env "DB_POOL_MAX=5" \
  --env "CODERSO_RUN_MIGRATIONS_ON_START=1" \
  --env "CODERSO_ASSISTANT_DOCS_REINDEX_ON_START=1" \
  --env "BACKUP_SCHEDULER_ENABLED=0" \
  "${IMAGE_REF}" >/dev/null; then
  fail "docker could not start a container from ${IMAGE_REF}."
fi

PROBE_URL="http://127.0.0.1:${APP_PORT}/admin/"
API_URL="http://127.0.0.1:${APP_PORT}/admin/api/auth/install/status"

deadline=$(( $(date +%s) + BOOT_TIMEOUT_SECONDS ))
status="000"

while :; do
  running="$(docker inspect -f '{{.State.Running}}' "${CONTAINER_NAME}" 2>/dev/null || echo false)"
  if [ "${running}" != "true" ]; then
    exit_code="$(docker inspect -f '{{.State.ExitCode}}' "${CONTAINER_NAME}" 2>/dev/null || echo unknown)"
    capture_logs
    dump_logs
    diagnose
    fail "Container ${CONTAINER_NAME} exited with code ${exit_code} before it served ${PROBE_URL}. The image does not boot."
  fi

  # curl prints "000" of its own accord when it never got a response, but it
  # also exits non-zero, so the fallback replaces the value instead of appending.
  if ! status="$(curl --silent --output /dev/null --max-time 5 --write-out '%{http_code}' "${PROBE_URL}" 2>/dev/null)"; then
    status="000"
  fi
  if [ "${status}" = "200" ]; then
    break
  fi

  if [ "$(date +%s)" -ge "${deadline}" ]; then
    capture_logs
    dump_logs
    diagnose
    fail "Timed out after ${BOOT_TIMEOUT_SECONDS}s waiting for ${PROBE_URL} to answer 200; last status was ${status}."
  fi

  sleep "${POLL_INTERVAL_SECONDS}"
done

echo "${PROBE_URL} -> 200 (admin bundle served out of the image)"

API_BODY_FILE="$(mktemp)"
if ! api_status="$(curl --silent --output "${API_BODY_FILE}" --max-time 15 --write-out '%{http_code}' "${API_URL}" 2>/dev/null)"; then
  api_status="000"
fi
if [ "${api_status}" != "200" ]; then
  capture_logs
  dump_logs
  log_section "response body"
  head -c 2000 "${API_BODY_FILE}" || true
  echo
  diagnose
  fail "${API_URL} answered HTTP ${api_status}; the container is up but its routed API is not serving."
fi
if ! grep -q '"available"' "${API_BODY_FILE}"; then
  capture_logs
  dump_logs
  log_section "response body"
  head -c 2000 "${API_BODY_FILE}" || true
  echo
  fail "${API_URL} answered 200 without the expected install-status payload; the response did not complete a database round trip."
fi
echo "${API_URL} -> 200 (router + database round trip)"

capture_logs
if ! grep -q "\[startup\] Database migrations completed" "${BOOT_LOG_FILE}"; then
  dump_logs
  fail "The container served, but its log has no '[startup] Database migrations completed' line. Startup migrations did not run, so this run did not prove the migration set applies to an empty database."
fi
echo "Startup migrations applied to an empty database"

log_section "container log (tail)"
tail -n 40 "${BOOT_LOG_FILE}" || true
log_section "end container log (tail)"

echo "Image boot verified: ${IMAGE_REF}"
exit 0
