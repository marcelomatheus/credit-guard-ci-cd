set -euo pipefail
image=${1:?Image reference is required}
revision=${2:?Expected revision is required}
name="pipeline-credit-test-${RANDOM}-$$"
cleanup() {
  local result=$?
  if [[ "$result" -ne 0 ]]; then docker logs "$name" >&2 || true; fi
  docker rm -f "$name" > /dev/null 2>&1 || true
  exit "$result"
}
trap cleanup EXIT
JWT_SECRET=$(openssl rand -hex 32)
DEMO_ACCESS_KEY=$(openssl rand -hex 32)
export JWT_SECRET DEMO_ACCESS_KEY
docker run -d --name "$name" --read-only --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:size=16m,mode=1777 -e JWT_SECRET -e DEMO_ACCESS_KEY -e "EXPECTED_SHA=$revision" "$image" > /dev/null
healthy=false
for _attempt in {1..45}; do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$name")
  if [[ "$status" == healthy ]]; then healthy=true; break; fi
  if [[ "$status" == unhealthy ]]; then break; fi
  sleep 2
done
[[ "$healthy" == true ]] || { echo "Image readiness check failed" >&2; exit 1; }
docker exec "$name" sh -c '! command -v npm && ! command -v npx && test ! -d /usr/local/lib/node_modules/npm'
docker exec "$name" node scripts/smoke.mjs
