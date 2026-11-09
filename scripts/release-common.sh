set -Eeuo pipefail

validate_root() {
  local requested=${1:?Deployment root is required}
  [[ "$requested" =~ ^/[A-Za-z0-9/_-]+$ && "$requested" != / ]] || { echo "Invalid deployment root" >&2; return 1; }
  DEPLOY_ROOT=$(realpath -e "$requested")
  [[ "$DEPLOY_ROOT" == "$requested" ]] || { echo "Deployment root must be canonical" >&2; return 1; }
  RUNTIME_FILE="$DEPLOY_ROOT/shared/runtime.env"
  [[ -f "$RUNTIME_FILE" ]] || { echo "Missing private runtime environment file" >&2; return 1; }
  [[ $(stat -c '%a' "$RUNTIME_FILE") == 600 ]] || { echo "Runtime environment file must have mode 600" >&2; return 1; }
}

validate_release() {
  local path=${1:?Release directory is required}
  [[ "$path" == "$DEPLOY_ROOT/releases/"* ]] || { echo "Release is outside the deployment root" >&2; return 1; }
  [[ "${path##*/}" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || { echo "Invalid release identifier" >&2; return 1; }
  [[ $(realpath -e "$path") == "$path" ]] || { echo "Release must be canonical" >&2; return 1; }
  [[ -f "$path/compose.yaml" && -f "$path/release.env" ]] || { echo "Incomplete release" >&2; return 1; }
}

compose_release() {
  local release=$1
  shift
  RUNTIME_ENV_FILE="$RUNTIME_FILE" docker compose --project-name pipeline-credit-api --env-file "$RUNTIME_FILE" --env-file "$release/release.env" -f "$release/compose.yaml" "$@"
}

activate_release() {
  local release=$1
  validate_release "$release" || return $?
  compose_release "$release" config --quiet || return $?
  compose_release "$release" up -d --no-build --pull never --wait --wait-timeout 90 api || return $?
  local revision=${release##*/}
  revision=${revision:0:40}
  compose_release "$release" exec -T -e BASE_URL=http://127.0.0.1:3000 -e "EXPECTED_SHA=$revision" api node scripts/smoke.mjs || return $?
}

set_pointer() {
  local name=$1
  local target=$2
  local temporary="$DEPLOY_ROOT/.$name-$$"
  ln -s "$target" "$temporary"
  mv -Tf "$temporary" "$DEPLOY_ROOT/$name"
}
