#!/usr/bin/env bash
#
# Final release-tag writer for coderso-core. The caller passes the staged
# candidate by immutable digest after the boot and identity gates succeed.
# Stable version tags are immutable, while :latest may advance only when the
# candidate is still the highest stable Git tag on origin.
#
# REQUIRED ENVIRONMENT
#   CANDIDATE_REF  verified ghcr.io/...:candidate-<id>@sha256:<64 hex> source;
#                  empty only during explicit operator recovery
#   VERSION_REF    final stable SemVer tag in the candidate repository
#   LATEST_REF     <candidate repository>:latest
#   GHCR_USERNAME  actor used to obtain a repository-scoped pull bearer
#   GHCR_TOKEN     workflow token used to obtain that bearer
#   RECOVERY_VERSION_DIGEST
#                  optional original verified version digest; enables the
#                  operator-only recovery path and forbids CANDIDATE_REF

set -Eeuo pipefail
export LC_ALL=C

CANDIDATE_REF="${CANDIDATE_REF:-}"
VERSION_REF="${VERSION_REF:-}"
LATEST_REF="${LATEST_REF:-}"
GHCR_USERNAME="${GHCR_USERNAME:-}"
GHCR_TOKEN="${GHCR_TOKEN:-}"
RECOVERY_VERSION_DIGEST="${RECOVERY_VERSION_DIGEST:-}"

fail() {
  echo "::error::$*" >&2
  exit 1
}

require_single_ref() {
  local name="$1"
  local ref="$2"

  [ -n "${ref}" ] || fail "${name} is required."
  [[ ! "${ref}" =~ [[:space:]] ]] || fail "${name} must be one image reference without whitespace."
}

require_curl_config_value() {
  local name="$1"
  local value="$2"

  [ -n "${value}" ] || fail "${name} is required."
  case "${value}" in
    *$'\n'* | *$'\r'* | *'"'* | *\\*) fail "${name} contains characters unsafe for curl configuration." ;;
  esac
}

require_single_ref "VERSION_REF" "${VERSION_REF}"
require_single_ref "LATEST_REF" "${LATEST_REF}"
require_curl_config_value "GHCR_USERNAME" "${GHCR_USERNAME}"
require_curl_config_value "GHCR_TOKEN" "${GHCR_TOKEN}"
[[ "${GHCR_USERNAME}" != *:* ]] || fail "GHCR_USERNAME must not contain a colon."

recovery_mode=false
candidate_named_ref=""
if [ -n "${RECOVERY_VERSION_DIGEST}" ]; then
  recovery_mode=true
  [ -z "${CANDIDATE_REF}" ] || fail "CANDIDATE_REF must be empty during explicit version-digest recovery."
  [[ "${RECOVERY_VERSION_DIGEST}" =~ ^sha256:[0-9a-f]{64}$ ]] || fail "RECOVERY_VERSION_DIGEST must be one immutable sha256 digest."
  [[ "${VERSION_REF}" != *@* ]] || fail "VERSION_REF must be a tag during recovery."
  version_last_component="${VERSION_REF##*/}"
  [[ "${version_last_component}" == *:* ]] || fail "VERSION_REF must include a tag during recovery."
  candidate_repository="${VERSION_REF%:*}"
  candidate_digest="${RECOVERY_VERSION_DIGEST}"
  promotion_source="${VERSION_REF}@${RECOVERY_VERSION_DIGEST}"
else
  require_single_ref "CANDIDATE_REF" "${CANDIDATE_REF}"
  [[ "${CANDIDATE_REF}" =~ ^[^@]+@sha256:[0-9a-f]{64}$ ]] || fail "CANDIDATE_REF must be pinned to an immutable sha256 digest."
  candidate_named_ref="${CANDIDATE_REF%@*}"
  candidate_digest="${CANDIDATE_REF##*@}"
  candidate_last_component="${candidate_named_ref##*/}"
  [[ "${candidate_last_component}" == *:* ]] || fail "CANDIDATE_REF must include the run-scoped candidate tag."
  candidate_tag="${candidate_named_ref##*:}"
  [[ "${candidate_tag}" == candidate-* ]] || fail "CANDIDATE_REF must use a candidate-* staging tag."
  candidate_repository="${candidate_named_ref%:*}"
  promotion_source="${CANDIDATE_REF}"
fi
[[ "${candidate_repository}" =~ ^ghcr\.io/[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)+$ ]] || fail "Release refs must use one canonical lowercase ghcr.io repository."
ghcr_repository_path="${candidate_repository#ghcr.io/}"

for final_ref in "${VERSION_REF}" "${LATEST_REF}"; do
  [[ "${final_ref}" != *@* ]] || fail "Final release references must be tags, not digest references: ${final_ref}."
  final_last_component="${final_ref##*/}"
  [[ "${final_last_component}" == *:* ]] || fail "Final release references must include a tag: ${final_ref}."
  [ "${final_ref%:*}" = "${candidate_repository}" ] || fail "Final release reference ${final_ref} is outside candidate repository ${candidate_repository}."
done

[ "${VERSION_REF}" != "${LATEST_REF}" ] || fail "VERSION_REF and LATEST_REF must be distinct tags."
[ "${LATEST_REF}" = "${candidate_repository}:latest" ] || fail "LATEST_REF must be ${candidate_repository}:latest."
if [ "${recovery_mode}" = false ]; then
  [ "${VERSION_REF}" != "${candidate_named_ref}" ] || fail "VERSION_REF must not reuse the staging tag."
fi
version_tag="${VERSION_REF##*:}"
stable_version_pattern='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
[[ "${version_tag}" =~ ${stable_version_pattern} ]] || fail "VERSION_REF must use an exact stable SemVer tag without a prefix, prerelease, build metadata, or leading zero."

for required_command in git curl jq docker; do
  command -v "${required_command}" >/dev/null 2>&1 || fail "${required_command} is required to promote the verified candidate."
done

version_compare_result=0
compare_versions() {
  local left="$1"
  local right="$2"
  local index left_segment right_segment
  local -a left_segments right_segments

  IFS=. read -r -a left_segments <<<"${left}"
  IFS=. read -r -a right_segments <<<"${right}"
  version_compare_result=0
  for index in 0 1 2; do
    left_segment="${left_segments[${index}]}"
    right_segment="${right_segments[${index}]}"
    if [ "${#left_segment}" -lt "${#right_segment}" ]; then
      version_compare_result=-1
      return
    fi
    if [ "${#left_segment}" -gt "${#right_segment}" ]; then
      version_compare_result=1
      return
    fi
    if [[ "${left_segment}" < "${right_segment}" ]]; then
      version_compare_result=-1
      return
    fi
    if [[ "${left_segment}" > "${right_segment}" ]]; then
      version_compare_result=1
      return
    fi
  done
}

release_position=""
highest_remote_version=""
refresh_remote_release_state() {
  local remote_output object_id remote_ref remainder remote_version seen_versions="|"
  local candidate_count=0

  # Suppress remote diagnostics because an origin URL can contain credentials.
  # A failure still aborts; stale or partial tag state is never used.
  if ! remote_output="$(git ls-remote --tags --refs origin 2>/dev/null)"; then
    fail "Unable to enumerate stable release tags from origin."
  fi

  highest_remote_version=""
  while IFS=$'\t' read -r object_id remote_ref remainder; do
    [ -n "${object_id}${remote_ref}${remainder}" ] || continue
    [[ "${object_id}" =~ ^([0-9a-f]{40}|[0-9a-f]{64})$ ]] || fail "Origin returned malformed tag enumeration data."
    [[ "${remote_ref}" == refs/tags/* ]] || fail "Origin returned malformed tag enumeration data."
    [ -z "${remainder}" ] || fail "Origin returned malformed tag enumeration data."
    remote_version="${remote_ref#refs/tags/}"
    [[ "${remote_version}" =~ ${stable_version_pattern} ]] || continue
    [[ "${seen_versions}" != *"|${remote_version}|"* ]] || fail "Origin returned a duplicate stable release tag."
    seen_versions+="${remote_version}|"

    if [ "${remote_version}" = "${version_tag}" ]; then
      candidate_count=1
    fi
    if [ -z "${highest_remote_version}" ]; then
      highest_remote_version="${remote_version}"
    else
      compare_versions "${remote_version}" "${highest_remote_version}"
      if [ "${version_compare_result}" -gt 0 ]; then
        highest_remote_version="${remote_version}"
      fi
    fi
  done <<<"${remote_output}"

  [ "${candidate_count}" -eq 1 ] || fail "VERSION_REF does not have an exact stable tag on origin."
  [ -n "${highest_remote_version}" ] || fail "Origin has no stable release tag."
  compare_versions "${version_tag}" "${highest_remote_version}"
  case "${version_compare_result}" in
    -1) release_position="historical" ;;
    0) release_position="current" ;;
    *) fail "VERSION_REF is newer than the highest stable tag on origin." ;;
  esac
}

umask 077
promotion_tmp="$(mktemp -d "${TMPDIR:-/tmp}/coderso-release-promotion.XXXXXX")" || fail "Unable to create private promotion state."
cleanup() {
  rm -rf -- "${promotion_tmp}"
}
trap cleanup EXIT
token_response_file="${promotion_tmp}/token-response.json"
bearer_file="${promotion_tmp}/registry-bearer"
headers_file="${promotion_tmp}/registry-headers"
response_file="${promotion_tmp}/registry-response"
touch "${token_response_file}" "${bearer_file}" "${headers_file}" "${response_file}"
chmod 600 "${token_response_file}" "${bearer_file}" "${headers_file}" "${response_file}"

refresh_remote_release_state

token_url="https://ghcr.io/token?service=ghcr.io&scope=repository:${ghcr_repository_path}:pull"
if ! {
  printf '%s\n' 'silent' 'show-error' 'fail-with-body' 'connect-timeout = 10' 'max-time = 30'
  printf 'user = "%s:%s"\n' "${GHCR_USERNAME}" "${GHCR_TOKEN}"
  printf '%s\n' 'basic' "url = \"${token_url}\""
} | curl --config - --output "${token_response_file}"; then
  fail "Unable to obtain a repository-scoped GHCR pull bearer."
fi
if ! jq -er '(.token // .access_token) | select(type == "string" and test("^[A-Za-z0-9._~+/=-]+$"))' "${token_response_file}" >"${bearer_file}"; then
  fail "GHCR returned a malformed pull bearer response."
fi
IFS= read -r registry_bearer <"${bearer_file}"
require_curl_config_value "GHCR pull bearer" "${registry_bearer}"

registry_status=""
registry_digest=""
registry_head() {
  local tag="$1"
  local url="https://ghcr.io/v2/${ghcr_repository_path}/manifests/${tag}"
  local line lower_line value digest_count=0

  : >"${headers_file}"
  : >"${response_file}"
  if ! registry_status="$({
    printf '%s\n' 'silent' 'show-error' 'head' 'connect-timeout = 10' 'max-time = 30'
    printf 'header = "Authorization: Bearer %s"\n' "${registry_bearer}"
    printf '%s\n' 'header = "Accept: application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json"'
    printf 'url = "%s"\n' "${url}"
  } | curl --config - --dump-header "${headers_file}" --output "${response_file}" --write-out '%{http_code}')"; then
    fail "GHCR manifest HEAD failed for a stable release tag."
  fi

  case "${registry_status}" in
    404)
      registry_digest=""
      return
      ;;
    200) ;;
    *) fail "GHCR manifest HEAD returned unexpected HTTP status ${registry_status}." ;;
  esac

  registry_digest=""
  while IFS= read -r line; do
    line="${line%$'\r'}"
    lower_line="${line,,}"
    if [[ "${lower_line}" == docker-content-digest:* ]]; then
      value="${line#*:}"
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%"${value##*[![:space:]]}"}"
      [[ "${value}" =~ ^sha256:[0-9a-f]{64}$ ]] || fail "GHCR returned a malformed Docker-Content-Digest header."
      registry_digest="${value}"
      digest_count=$((digest_count + 1))
    fi
  done <"${headers_file}"
  [ "${digest_count}" -eq 1 ] || fail "GHCR did not return exactly one Docker-Content-Digest header."
}

verify_written_tag() {
  local tag="$1"
  local expected_digest="$2"
  registry_head "${tag}"
  [ "${registry_status}" = "200" ] || fail "GHCR did not expose the promoted ${tag} tag."
  [ "${registry_digest}" = "${expected_digest}" ] || fail "GHCR ${tag} does not resolve to the intended immutable digest."
}

registry_head "${version_tag}"
if [ "${recovery_mode}" = true ]; then
  [ "${registry_status}" = "200" ] || fail "Recovery requires the immutable version tag to exist in GHCR."
  [ "${registry_digest}" = "${RECOVERY_VERSION_DIGEST}" ] || fail "Recovery digest does not match the authenticated immutable version tag."
  [ "${release_position}" = "current" ] || fail "Recovery version is not origin's highest stable tag; refusing to move :latest."
  refresh_remote_release_state
  [ "${release_position}" = "current" ] || fail "Recovery version is no longer origin's highest stable tag."
  docker buildx imagetools create --tag "${LATEST_REF}" "${promotion_source}"
  verify_written_tag "latest" "${RECOVERY_VERSION_DIGEST}"
  echo "Recovered :latest from explicit immutable version digest ${RECOVERY_VERSION_DIGEST}."
  exit 0
fi

if [ "${registry_status}" = "200" ]; then
  [ "${registry_digest}" = "${candidate_digest}" ] || fail "Immutable version tag ${version_tag} already resolves to a different digest; a rebuilt rerun cannot replace it. Use explicit operator recovery with the original verified version digest."
  echo "Immutable version tag ${version_tag} already matches the verified candidate."
else
  # Recheck the absent tag before the write, then make the serialized remote
  # tag enumeration the last external observation before Docker mutates GHCR.
  registry_head "${version_tag}"
  if [ "${registry_status}" = "200" ]; then
    [ "${registry_digest}" = "${candidate_digest}" ] || fail "Immutable version tag ${version_tag} appeared with a different digest."
  else
    refresh_remote_release_state
    docker buildx imagetools create --tag "${VERSION_REF}" "${promotion_source}"
    verify_written_tag "${version_tag}" "${candidate_digest}"
  fi
fi

if [ "${release_position}" = "historical" ]; then
  echo "Version ${version_tag} is older than origin's highest stable tag ${highest_remote_version}; leaving :latest untouched."
  exit 0
fi

# A newer stable tag may have appeared during the version-tag write. This fresh
# enumeration is deliberately the last external observation before :latest.
refresh_remote_release_state
[ "${release_position}" = "current" ] || fail "VERSION_REF is no longer the highest stable tag on origin."
docker buildx imagetools create --tag "${LATEST_REF}" "${promotion_source}"
verify_written_tag "latest" "${candidate_digest}"

echo "Release tags safely reference verified digest ${candidate_digest}."
exit 0
