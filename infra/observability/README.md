# Observability stack

Prometheus scrapes the API's `/metrics` route every 15 seconds over the shared Docker network, and Grafana displays the provisioned **Credit API** dashboard. The stack is independent from the application rollout: deploys and rollbacks never touch it, and it publishes no host ports in production.

| Service | Role | Exposure |
| --- | --- | --- |
| `prometheus` | Scrapes `pipeline-credit-api-api-1:3016/metrics` and keeps 7 days of samples | Internal only |
| `grafana` | Prometheus data source and dashboard provisioned from files | Traefik router on `GRAFANA_DOMAIN` |

Grafana reaches Prometheus through the internal `observability` network using the unique alias `pipeline-credit-prometheus`, so it never collides with other services on the shared proxy network.

## Dashboard

| Panel | Query |
| --- | --- |
| API status | `up{job="credit-api"}` |
| Uptime | `process_uptime_seconds` |
| Memory (RSS) and memory over time | `process_resident_memory_bytes`, `process_heap_used_bytes`, against the 256 MB container limit |
| Simulations by decision | `sum by (status) (credit_simulations_total)` |
| Requests per second by route | `sum by (method, route) (rate(http_requests_total[1m]))` |
| Responses per second by status class | `rate(http_requests_total[1m])` grouped into `2xx`, `4xx` and `5xx` |
| Server errors (5xx) per second | `sum(rate(http_requests_total{status=~"5.."}[5m]))` |

Application counters live in memory, so they restart from zero after every deploy or rollback. Prometheus handles the reset in `rate` calculations.

## Run on the VPS

The application stack and the edge stack must already use the same external network. Create a private environment file from `.env.example`, choose a long random admin password, and keep the file mode 600:

```bash
install -m 600 infra/observability/.env.example /private/path/observability.env
docker compose --env-file /private/path/observability.env -f infra/observability/compose.yaml up -d
```

In Cloudflare, add a public hostname for `GRAFANA_DOMAIN` with service `http://traefik:80`, as done for the API. Grafana disables sign-up, organization creation and anonymous access. Share the dashboard URL openly, but share credentials only through a private channel, or create a separate Viewer user for each person.

## Run locally

Requirements: Docker with Compose. The local override builds the API from the repository, joins it to the network under the production container name and publishes every service on `127.0.0.1` only.

```bash
docker network create celo-network
cp .env.example .env
cp infra/observability/.env.example infra/observability/.env
```

In `infra/observability/.env`, set `GRAFANA_ROOT_URL=http://localhost:3001`, `GRAFANA_COOKIE_SECURE=false` and a local admin password. Then start the stack from the repository root:

```bash
docker compose --env-file infra/observability/.env -f infra/observability/compose.yaml -f infra/observability/compose.local.yaml up --build -d
```

| URL | Content |
| --- | --- |
| `http://localhost:3016` | API web interface; create simulations to feed the dashboard |
| `http://localhost:3016/metrics` | Raw Prometheus metrics |
| `http://localhost:9090/targets` | Prometheus scrape targets; `credit-api` must be `UP` |
| `http://localhost:3001` | Grafana; the Credit API dashboard opens as the home page |

The dashboard is read-only in the interface. After editing its JSON, restart the `grafana` service to reload it, since bind-mounted file changes are not always detected on Docker Desktop.

Stop the stack with the same files and `down`. Add `--volumes` to erase stored samples and Grafana state.

## Security notes

The API's `/metrics` route is still reachable through the public API hostname. Prometheus does not need that route to be public, so the API router can exclude it with ``Host(`...`) && !PathPrefix(`/metrics`)``.

Both images are pinned by digest and run with a read-only root filesystem, no Linux capabilities and `no-new-privileges`. Grafana does not download plugins at startup. Review and update the pins when upgrading.
