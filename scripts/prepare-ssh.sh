set -euo pipefail
: "${VPS_HOST:?VPS_HOST is required}"
: "${VPS_USER:?VPS_USER is required}"
: "${VPS_PROJECT_PATH:?VPS_PROJECT_PATH is required}"
: "${VPS_SSH_KNOWN_HOSTS:?Pinned SSH host keys are required}"
[[ "$VPS_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+$ ]] || { echo "Invalid VPS host" >&2; exit 1; }
[[ "$VPS_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo "Invalid VPS user" >&2; exit 1; }
[[ "$VPS_PROJECT_PATH" =~ ^/[a-zA-Z0-9/_-]+$ && "$VPS_PROJECT_PATH" != / ]] || { echo "Invalid VPS project path" >&2; exit 1; }
umask 077
mkdir -p "$HOME/.ssh"
printf '%s\n' "$VPS_SSH_KNOWN_HOSTS" > "$HOME/.ssh/credit_known_hosts"
if [[ -n "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > "$HOME/.ssh/credit_deploy_key"
fi
{
  printf 'Host credit-vps\n  HostName %s\n  User %s\n' "$VPS_HOST" "$VPS_USER"
  printf '  BatchMode yes\n  StrictHostKeyChecking yes\n  UserKnownHostsFile %s/.ssh/credit_known_hosts\n  ConnectTimeout 15\n  ServerAliveInterval 15\n  ServerAliveCountMax 4\n' "$HOME"
  if [[ -n "${VPS_SSH_PRIVATE_KEY:-}" ]]; then printf '  IdentityFile %s/.ssh/credit_deploy_key\n  IdentitiesOnly yes\n' "$HOME"; fi
} > "$HOME/.ssh/credit_config"
ssh -F "$HOME/.ssh/credit_config" credit-vps 'test -n "$USER" && command -v docker && command -v flock && docker compose version'
