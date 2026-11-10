# Deployment setup

## Prerequisites

Use an amd64 Linux VPS with Bash, Docker Engine, Docker Compose v2 with `up --wait`, OpenSSH, `flock`, `realpath`, `sha256sum`, `tar` and Tailscale installed. CI uses an amd64 runner and builds `linux/amd64` images. The Docker Engine must be compatible with the installed Traefik Docker provider.

The shared Traefik entrypoint must accept HTTP from `cloudflared` and join the application's external network. The reference project calls this network `celo-network`. A separate hostname prevents collisions with existing services.

## Prepare the VPS once

Choose a dedicated deployment user, for example `deploy`. Provision its Docker access and own application directory. Docker access is privileged host administration; restrict this identity and the Tailscale policy accordingly.

Run the following as an administrator, replacing the user if necessary:

```bash
sudo install -d -m 750 -o deploy -g deploy /opt/pipeline-ci-cd
sudo install -d -m 700 -o deploy -g deploy /opt/pipeline-ci-cd/shared
sudo install -d -m 700 -o deploy -g deploy /opt/pipeline-ci-cd/releases
```

As the deployment user, create `/opt/pipeline-ci-cd/shared/runtime.env` using `.env.production.example` as the template. Keep that file mode 600. Generate two independent secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
chmod 600 /opt/pipeline-ci-cd/shared/runtime.env
```

Put the first secret in `JWT_SECRET` and the second in `DEMO_ACCESS_KEY`. Do not reuse the development example. Set:

| Runtime value | Example or meaning |
| --- | --- |
| `JWT_SECRET` | Generated JWT signing secret, at least 32 characters |
| `DEMO_ACCESS_KEY` | Separate generated private login gate, at least 32 characters |
| `DOMAIN_NAME` | `credit-api.your-domain.com` |
| `PROXY_NETWORK` | Existing external network, such as `celo-network` |
| `TRAEFIK_ENTRYPOINT` | Existing HTTP entrypoint, typically `web` |
| `TRUST_PROXY` | Actual trusted Docker proxy subnet or specific proxy IPs |
| `LOG_LEVEL` | `info` |
| `TOKEN_TTL_SECONDS` | `900` |
| `MEMORY_TTL_SECONDS` | `86400` |
| `MEMORY_MAX_APPLICATIONS` | `1000` |

Obtain the actual network subnet with `docker network inspect celo-network`. Avoid setting `TRUST_PROXY=true` or trusting arbitrary public address ranges. With `loopback` only, all traffic forwarded by Traefik may share one rate-limit identity until the real proxy network is configured.

The application listens on internal port 3016, is only attached to the proxy network and publishes no host ports. Its Traefik service label routes to port 3016. Compose sets `PORT=3016` even if an older runtime environment file still contains `PORT=3000`. Local development defaults and the local Compose binding also use 3016.

The public hostname and Cloudflare-to-Traefik origin do not change when the API port changes. Isolate unrelated services appropriately. Do not recreate an existing shared network to change its subnet.

If the Docker Hub repository is private, sign in once as the deployment user with a separate read-only token. Use `docker login --username YOUR_USERNAME --password-stdin` with a private input source. The Actions push token is not copied to the VPS. Keep retained release images locally for recovery.

## Tailscale and SSH

1. Ensure the VPS is connected to the intended tailnet.
2. Authorize the OAuth client to create ephemeral nodes carrying `tag:ci`.
3. Restrict `tag:ci` to the deployment VPS's SSH port with tailnet policy.
4. Choose either Tailscale SSH or ordinary OpenSSH over the tailnet.
5. Verify the host key through an independent trusted channel and provision it as `VPS_SSH_KNOWN_HOSTS`.

For Tailscale SSH, explicitly enable it on the VPS and add a noninteractive SSH `accept` policy from `tag:ci` to the deployment user on the target VPS. The CI job cannot satisfy an interactive SSH `check` requirement. `VPS_SSH_PRIVATE_KEY` can remain unset in this mode.

For ordinary OpenSSH, authorize a dedicated deployment public key and configure its private half as `VPS_SSH_PRIVATE_KEY`. The tailnet provides private connectivity; the key provides SSH authentication.

The pinned host entry must match the exact `VPS_HOST` value, such as the tailnet IP or MagicDNS hostname. Do not fetch and blindly trust a host key during the workflow. No publicly reachable SSH port is required.

## GitHub configuration

Create a Docker Hub repository and a write-scoped access token. Configure the following as repository variables under Settings → Secrets and variables → Actions. Repository scope matters because the publication job runs before the `production` environment job.

| Repository variable | Value |
| --- | --- |
| `DEPLOY_ENABLED` | `true` after provisioning is complete |
| `DOCKERHUB_USERNAME` | Your actual Docker Hub account or namespace |
| `DOCKERHUB_IMAGE` | Docker Hub repository name, for example `pipeline-ci-cd` |
| `VPS_HOST` | Tailnet IPv4 address or MagicDNS hostname |
| `VPS_USER` | Deployment user, for example `deploy` |
| `VPS_PROJECT_PATH` | Canonical directory, for example `/opt/pipeline-ci-cd` |
| `PUBLIC_BASE_URL` | HTTPS origin with no trailing slash, for example `https://credit-api.your-domain.com` |

| Secret | Scope and purpose |
| --- | --- |
| `DOCKERHUB_TOKEN` | Repository secret, image publication |
| `TS_OAUTH_CLIENT_ID` | Repository or `production` environment secret, Tailscale OAuth client |
| `TS_OAUTH_SECRET` | Repository or `production` environment secret, Tailscale OAuth secret |
| `VPS_SSH_KNOWN_HOSTS` | Repository or `production` environment secret, pinned host entries |
| `VPS_SSH_PRIVATE_KEY` | Optional repository or `production` environment secret for ordinary OpenSSH |

Create the `production` environment if you want environment rules or explicit reviewers. The workflow does not add reviewer requirements. Protect `main` with pull requests and required quality checks according to your GitHub plan and repository settings.

`JWT_SECRET`, `DEMO_ACCESS_KEY`, and the Cloudflare Tunnel token stay in the VPS runtime/edge configuration. The deploy workflow never needs their plaintext values. Its authenticated smoke test executes inside the running container, using that container's environment.

## Cloudflare route

In the remotely managed Cloudflare Tunnel, add the API hostname and route it to the internal Traefik HTTP service. For the bundled edge example this is `http://traefik:80`.

Preserve the original hostname so the Traefik `Host(...)` rule matches `DOMAIN_NAME`. Leave the origin HTTP Host Header override unset, or explicitly set it to the API hostname. TLS terminates at Cloudflare for this topology; the connector-to-Traefik hop stays on the local Docker network. The application workflow never changes or restarts the shared edge stack.

## Activate and verify

Set `DEPLOY_ENABLED=true` and run **CI and deploy** on `main`, or push a reviewed commit to `main`.

The job validates and publishes the candidate, tests the digest, scans it, joins Tailscale, verifies SSH, copies the release bundle, pulls the image, checks its revision, starts the service and exercises the running API. Finally it verifies public readiness and the expected commit through Cloudflare.

The workflow summary identifies the release and Docker Hub digest. The public `/version` response must report the same commit. The first deployment has no prior release available for rollback.

The gateway and production infrastructure cannot be validated end to end until the actual VPS, domain, tailnet policy and credentials are provisioned.
