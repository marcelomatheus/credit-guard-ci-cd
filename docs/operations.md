# Operations and recovery

## Release lifecycle

Every release has a directory named `<full-git-sha>-<run-id>-<run-attempt>` beneath the deployment root's `releases` directory. It contains `compose.yaml`, `release.env`, `deploy.sh`, `rollback.sh` and `release-common.sh`. `release.env` records the immutable Docker Hub digest and never contains runtime secrets.

`shared/runtime.env` stores runtime configuration with mode 600. `current` points to the last successfully activated release. `previous` points to the release displaced by the last successful change. Pointer changes use atomic rename. A host-level `flock` serializes deploy and rollback operations; GitHub also serializes the production workflows without cancelling an in-progress rollout.

The application uses one Compose project, `pipeline-credit-api`. Updating it may briefly interrupt requests. There is no blue-green routing or zero-downtime guarantee.

The current API port is 3016. The healthcheck and smoke runner use the container's runtime port; activation scripts derive the smoke URL inside the target container so recovering an older release on port 3000 remains possible with the updated tooling. When switching across the port change, use the updated rollback tooling: older retained scripts may still hardcode port 3000. The Traefik service label is part of each retained Compose manifest and is restored with that release.

## Automatic rollback

Pull and image-revision checks occur before activation. If container readiness or the internal authenticated smoke test fails, the script starts the previous release, verifies readiness and runs its smoke test. The candidate workflow still fails, even when recovery succeeds.

If no previous release exists, the unhealthy candidate is stopped. If recovery fails, the workflow reports `ROLLBACK FAILED` and requires inspection. It never deletes images, volumes or unrelated containers.

The public route check happens after internal application verification. A public-only failure fails the workflow and points to Cloudflare/Traefik diagnostics; it does not automatically roll back a healthy application because a routing outage may affect every release.

Every container replacement loses the process-local simulation history and idempotency keys. Existing JWTs remain valid until expiry when the signing secret and mock user remain unchanged. Rotating `JWT_SECRET` invalidates previously issued tokens.

## Manual rollback

Run **Roll back production** on `main`. Leave `release_id` blank to restore `previous`, or supply an exact retained release identifier. The workflow shares the production lock and Tailscale access model.

From the VPS, as the deployment user:

```bash
bash /opt/pipeline-ci-cd/current/rollback.sh /opt/pipeline-ci-cd
```

For a specific retained release:

```bash
bash /opt/pipeline-ci-cd/current/rollback.sh /opt/pipeline-ci-cd FULL_SHA-RUN_ID-ATTEMPT
```

The script pulls the recorded digest, activates it and runs its internal smoke test. If a requested rollback fails, it attempts to recover the current release. A successful rollback preserves the displaced release in `previous`, allowing a subsequent return.

An application rollback does not restore shared runtime settings, edge settings or secrets. Restore those separately if they caused the incident. No database migrations exist in this project.

## Inspection

```bash
readlink -f /opt/pipeline-ci-cd/current
readlink -f /opt/pipeline-ci-cd/previous
docker ps --filter label=com.docker.compose.project=pipeline-credit-api
docker logs --tail 100 CONTAINER_ID
curl --fail https://credit-api.your-domain.com/health/ready
curl --fail https://credit-api.your-domain.com/version
tailscale status
docker network inspect celo-network
```

Logs use JSON and application-generated request IDs. The authorization, cookie and demo-gate headers are redacted; request bodies are not logged. Do not print `runtime.env`, complete container environment inspection, or resolved Compose configuration into workflow logs.

## Troubleshooting

| Symptom | Inspection |
| --- | --- |
| Publish/deploy jobs skipped | Confirm repository variable `DEPLOY_ENABLED` is exactly `true` |
| Registry authentication fails | Check namespace, image name and push token; check a separate read token on the VPS for private images |
| Image scan blocks promotion | Update the pinned base image or vulnerable dependency and rebuild |
| Release validation rejects a tag | Match stable `vMAJOR.MINOR.PATCH` to both package files and tag a reviewed commit reachable from `main` |
| A main merge ran CI without CD | If the package version is already tagged at an older commit, bump the package and lockfile version in a PR |
| Automatic Git tag creation fails | Check the tag job's `contents: write` permission and rules allowing GitHub Actions to create `v*` tags, then rerun the failed job |
| Docker version already belongs to another commit | Bump the package and lockfile version in a new PR; existing version tags are not overwritten |
| Deployment ref is blocked | Allow `main` and recovery tags matching `v*` in the `production` environment's deployment rules |
| GitHub Release publication fails after deploy | Verify the release job's `contents: write` permission, then rerun the failed job; the deployed image digest is retained |
| Tailscale connects but SSH fails | Check tailnet grants, SSH authentication, noninteractive authorization and exact pinned host name |
| Host verification fails | Independently verify a legitimate host-key change before updating the stored pin |
| Missing runtime file | Provision `shared/runtime.env` as the deployment user with mode 600 |
| Container exits on startup | Check required runtime variables and generated production secrets |
| HTTP 401 on login | Supply the private `x-demo-access-key` and valid mock credentials |
| HTTP 403 when simulating | Authenticate as the analyst rather than the viewer |
| HTTP 422 for Open Finance | Use a consented mock customer; `customer-no-consent` intentionally fails |
| HTTP 503 creating simulations | Check the memory limit and TTL; retries of existing keys still work |
| Many users share rate limits | Configure the actual proxy subnet in `TRUST_PROXY`; verify forwarded-header sanitization |
| Internal checks pass, public route fails | Check the connector, hostname, origin service, original Host header and Traefik network/entrypoint |
| `exec format error` | The default artifact is amd64; align the build, test runner and VPS architecture |

Retain at least the current and previous release directories and their images. The pipeline does not run global `docker image prune`. Remove obsolete releases only after confirming the rollback window and excluding active pointers.
