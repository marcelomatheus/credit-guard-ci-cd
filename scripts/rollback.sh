set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/release-common.sh"
validate_root "${1:?Deployment root is required}"
exec 9>"$DEPLOY_ROOT/deploy.lock"
flock -w 180 9
if [[ -n "${2:-}" ]]; then
  target="$DEPLOY_ROOT/releases/$2"
else
  [[ -L "$DEPLOY_ROOT/previous" ]] || { echo "No previous release is available" >&2; exit 1; }
  target=$(readlink -f "$DEPLOY_ROOT/previous")
fi
validate_release "$target"
current=''
if [[ -L "$DEPLOY_ROOT/current" ]]; then current=$(readlink -f "$DEPLOY_ROOT/current"); validate_release "$current"; fi
compose_release "$target" config --quiet
compose_release "$target" pull api
recover_current() {
  local result=$?
  trap - ERR
  if [[ -n "$current" ]]; then
    if activate_release "$current"; then echo "Current release recovered" >&2; else echo "RECOVERY FAILED: manual intervention is required" >&2; fi
  fi
  exit "$result"
}
trap recover_current ERR
activate_release "$target"
if [[ -n "$current" && "$current" != "$target" ]]; then set_pointer previous "$current"; fi
set_pointer current "$target"
trap - ERR
printf 'Rolled back to release %s\n' "${target##*/}"
