set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/release-common.sh"
validate_root "${1:?Deployment root is required}"
candidate="$DEPLOY_ROOT/releases/${2:?Release identifier is required}"
image_ref=${3:?Image digest is required}
[[ "$image_ref" =~ ^docker\.io/[a-z0-9][a-z0-9_-]*/[a-z0-9][a-z0-9._-]*@sha256:[a-f0-9]{64}$ ]] || { echo "Invalid Docker Hub image digest" >&2; exit 1; }
[[ "${candidate##*/}" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || { echo "Invalid release identifier" >&2; exit 1; }
[[ -d "$candidate" && $(realpath -e "$candidate") == "$candidate" ]] || { echo "Invalid release directory" >&2; exit 1; }
exec 9>"$DEPLOY_ROOT/deploy.lock"
flock -w 180 9
previous=''
if [[ -L "$DEPLOY_ROOT/current" ]]; then
  previous=$(readlink -f "$DEPLOY_ROOT/current")
  validate_release "$previous"
fi
printf 'IMAGE_REF=%s\n' "$image_ref" > "$candidate/release.env"
validate_release "$candidate"
compose_release "$candidate" config --quiet
compose_release "$candidate" pull api
revision=$(docker image inspect "$image_ref" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}')
[[ "$revision" == "${2:0:40}" ]] || { echo "Image revision does not match the requested release" >&2; exit 1; }
restore_previous() {
  local result=$?
  trap - ERR
  echo "Candidate failed; attempting application rollback" >&2
  compose_release "$candidate" logs --tail 40 api >&2 || true
  if [[ -n "$previous" ]]; then
    if activate_release "$previous"; then
      echo "Previous release restored" >&2
    else
      echo "ROLLBACK FAILED: manual recovery is required" >&2
    fi
  else
    compose_release "$candidate" stop api || true
    echo "No previous release is available" >&2
  fi
  exit "$result"
}
trap restore_previous ERR
activate_release "$candidate"
if [[ -n "$previous" && "$previous" != "$candidate" ]]; then set_pointer previous "$previous"; fi
set_pointer current "$candidate"
trap - ERR
printf 'Deployed release %s\n' "${candidate##*/}"
