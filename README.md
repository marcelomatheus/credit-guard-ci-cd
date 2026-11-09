# Mock Credit Analysis API

Node.js 22, Express 5 and strict TypeScript API for synthetic credit analysis. The delivery pipeline is the central feature: GitHub Actions validates the application, publishes an immutable image to Docker Hub, joins a Tailscale network and deploys the image to a VPS behind Cloudflare Tunnel and Traefik.

All customers, users, Open Finance responses and credit histories are fictitious code fixtures. There is no database, real Open Finance integration, credit bureau integration or lending operation.

## Quick start

Requirements: Node.js 22.23.4 and npm. The exact runtime is recorded in `.nvmrc` and the Dockerfile.

```bash
nvm install
nvm use
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:3000/docs` for Swagger UI and `http://localhost:3000/openapi.json` for the contract.

Run the production build locally with an explicitly loaded environment:

```bash
npm run build
node --env-file=.env dist/bootstrap/server.js
```

Or use Docker:

```bash
cp .env.example .env
docker compose up --build --wait
docker compose exec api node scripts/smoke.mjs
```

## Demo authentication

| Email | Password | Role |
| --- | --- | --- |
| `analyst@example.test` | `AnalystDemo!2026` | `ANALYST` |
| `viewer@example.test` | `ViewerDemo!2026` | `VIEWER` |

Passwords are stored as scrypt hashes in `src/infrastructure/mocks/fixtures.ts`. These are intentionally published demo credentials. Login also requires the private `x-demo-access-key` header. Use `local-demo-access-key` with the development example, and generate a separate private value in production.

```bash
curl --request POST http://localhost:3000/api/v1/auth/login \
  --header 'Content-Type: application/json' \
  --header 'x-demo-access-key: local-demo-access-key' \
  --data '{"email":"analyst@example.test","password":"AnalystDemo!2026"}'
```

Use the returned `accessToken` as a bearer token. Tokens expire after 900 seconds by default. There are no refresh tokens or persisted sessions. The current user is resolved from the fixture repository on every authenticated request. The viewer can consult customers and policies; only analysts create simulations. Simulation history is scoped to its creator, so the viewer initially has no simulation history.

```bash
curl --request POST http://localhost:3000/api/v1/credit-applications \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header 'Content-Type: application/json' \
  --header 'Idempotency-Key: demo-simulation-001' \
  --data '{"customerId":"customer-stable","amountCents":100000,"installments":12}'
```

`100000` means BRL 1,000.00. The caller supplies the customer, amount and installment count; income, debt, score and restrictions come from the mock gateways. Caller-supplied scores and unknown payload fields are rejected.

## Mock scenarios

The dataset has a fixed `asOf` timestamp of November 1, 2026. It is never represented as a live financial query.

| Customer ID | Dataset characteristics | Result for 100000 cents over 12 months |
| --- | --- | --- |
| `customer-stable` | Score 850, income 800000 cents, debt 50000 cents | `APPROVED` |
| `customer-review` | Score 620, income 450000 cents, debt 40000 cents | `MANUAL_REVIEW` |
| `customer-restricted` | Score 410 and an active restriction | `REJECTED` |
| `customer-overcommitted` | Existing obligations exceed 30% of income | `REJECTED` |
| `customer-no-consent` | Open Finance consent is unavailable | HTTP 422 |

`MANUAL_REVIEW` is a simulation outcome. There is no reviewer workflow in this version.

## Policy

`credit-policy-v1` applies the following rules in order:

1. Reject active restrictions, scores below 500 and insufficient payment capacity.
2. Require review for scores from 500 through 699 or at least three late payments in the last 12 months, provided no rejection rule applies.
3. Approve remaining applications.

Available payment capacity is `max(floor(incomeCents × 0.30) − monthlyDebtCents, 0)`. Existing debt means contractual monthly payments, rather than every household expense.

| Minimum score | Fictional monthly interest rate |
| --- | --- |
| 800 | 1.5% |
| 700 | 2.0% |
| 500 | 3.0% |
| 0 | 4.0% |

Amounts range from 10000 to 10000000 cents; terms range from 1 to 60 months. The Price payment formula uses decimal arithmetic. Standard payments and the total are rounded half up to integer cents; the final payment reconciles the schedule with that rounded total. Capacity checks consider the larger of the standard and final payments. These are educational calculations without taxes, fees or a CET calculation.

## HTTP routes

| Method | Route | Access |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Private demo access key and mock credentials |
| GET | `/api/v1/auth/me` | Bearer token |
| GET | `/api/v1/customers` | Bearer token |
| GET | `/api/v1/customers/:id` | Bearer token |
| GET | `/api/v1/customers/:id/open-finance` | Bearer token |
| GET | `/api/v1/customers/:id/credit-history` | Bearer token |
| GET | `/api/v1/credit-policy` | Bearer token |
| POST | `/api/v1/credit-applications` | Analyst and `Idempotency-Key` |
| GET | `/api/v1/credit-applications` | Own simulations, paginated and filtered |
| GET | `/api/v1/credit-applications/:id` | Own simulation |
| GET | `/health/live` | Public process health |
| GET | `/health/ready` | Public readiness and storage mode |
| GET | `/version` | Public commit and runtime identification |
| GET | `/docs/` | Public Swagger UI |
| GET | `/openapi.json` | Public OpenAPI document |

List filters: `page`, `limit`, `customerId` and `status`. Errors use `{ "error": { "code", "message", "requestId" } }`, with validation details when relevant. Responses include an application-generated `x-request-id` and disable caching.

The API applies a 16 KB JSON limit, a general limit of 120 API requests per minute per client IP, and 10 login attempts per 15 minutes per IP. When deploying behind a proxy, configure `TRUST_PROXY` for the actual trusted proxy network and make sure the proxy sanitizes forwarded headers.

## Architecture and storage

| Location | Responsibility |
| --- | --- |
| `src/modules/credit-analysis/domain` | Credit aggregate contracts, policy and repository port |
| `src/modules/credit-analysis/application` | Simulation orchestration and idempotency |
| `src/modules/customers/domain` | Customer model and financial-data gateway ports |
| `src/modules/identity` | User model, authentication use case and security ports |
| `src/infrastructure/mocks` | Deterministic external-data and user adapters |
| `src/infrastructure/memory` | Bounded process-local simulation repository |
| `src/infrastructure/security` | Scrypt verification and signed JWTs |
| `src/interfaces/http` | Express routes, validation, authorization and OpenAPI |
| `src/bootstrap` | Dependency composition, server and graceful shutdown |

Domain modules do not import Express, environment configuration or infrastructure adapters. ESLint enforces inward dependency direction for domain and application modules. All source, scripts and configuration files use English and contain no explanatory code comments.

Simulations and their idempotency keys share a configurable TTL, defaulting to 24 hours. The store holds at most 1000 unexpired simulations by default. When full, new simulations return 503 while existing idempotent requests remain replayable. Expired entries are pruned on access. Concurrent identical requests are atomically deduplicated within the process.

**Every restart, deploy or rollback clears simulations and idempotency records.** Mock customers and users remain available because they are part of the image. The application intentionally runs one replica; idempotency is not shared across processes or replicas.

## Verification

```bash
npm run check
npm audit --audit-level=moderate
npm run verify:workflows
bash scripts/install-actionlint.sh /tmp/credit-actionlint
/tmp/credit-actionlint/actionlint
shellcheck -s bash -x -P scripts scripts/*.sh
```

The suite covers monetary boundaries and reconciliation, score thresholds, rejection precedence, authentication, role authorization, user isolation, mocked consent, concurrent idempotency, expiry, bounded capacity, malformed input, architecture lint boundaries and deployment recovery. Dependency checks reject locked deprecation markers and mismatched runtime typings. CI audits development and production dependencies at moderate severity or higher. Deployment tests simulate the Docker CLI; CI separately builds and smoke-tests a real container.

```bash
docker build --build-arg GIT_SHA="$(git rev-parse HEAD)" --tag credit-api:test .
bash scripts/test-image.sh credit-api:test "$(git rev-parse HEAD)"
```

The container check asserts Node 22, build revision, readiness, login, customers, approval, manual review, rejection, idempotency and retrieval. Runtime credentials are generated only for the test container and are never built into the image.

## Delivery pipeline

| Workflow | Trigger | Behavior |
| --- | --- | --- |
| `ci.yml` | Pull request or manual run | Calls reusable quality gates |
| `quality.yml` | Reusable workflow | Lint, types, tests, coverage, build, dependency audit, actionlint, ShellCheck, Compose validation and real-container smoke test |
| `deploy.yml` | Push to `main` or manual run on `main` | Quality gates, Docker Hub publication, digest smoke test, image scan and VPS deployment |
| `rollback.yml` | Manual run on `main` | Restores a retained release through Tailscale |

External actions and base/runtime images are pinned by SHA or digest. Dependabot proposes dependency, Dockerfile and action updates within the [supported dependency baseline](docs/dependencies.md). Node and its typings remain on major 22, and the TypeScript version follows the installed linter's supported peer range. Docker images include the Git revision, version, SBOM and build provenance. Images are published for `linux/amd64`; use an ARM runner and adjust both build and smoke checks before targeting an ARM VPS.

Images are tagged with Semantic Versioning and the short Git commit hash. The version comes from `package.json`; bump it manually following `MAJOR.MINOR.PATCH`. Each build publishes the immutable tags `<version>-<short-sha>` and `sha-<full-sha>-<run-id>-<attempt>`. After the digest smoke test and the vulnerability scan pass, the moving tags `<version>` and `latest` are promoted to the same digest, so a rejected candidate never becomes `latest`. Docker tags do not allow the SemVer `+` build metadata separator, so `-` joins the version and the short hash. The `/version` route reports the same version. The deployment reference is the registry digest. A published image must pass the digest smoke test and the HIGH/CRITICAL fixable-vulnerability scan before the VPS deploy job can start. A rejected candidate may remain in Docker Hub but is never promoted to the VPS.

GitHub-hosted runners check out source for CI and image builds. The VPS receives a small checksummed release bundle by SSH and pulls the application from Docker Hub. It never clones the source or runs an application build. The workflow preserves SSH host verification and can use either Tailscale SSH authorization or a dedicated OpenSSH key over Tailscale.

The repository starts in CI-only mode. Set the repository variable `DEPLOY_ENABLED=true` after completing [the deployment setup](docs/deployment.md). Until then, publication and deployment jobs are explicitly skipped and the workflow summary explains the missing activation.

## Operations

See [deployment setup and credential mapping](docs/deployment.md), [rollback and troubleshooting](docs/operations.md), and the optional [Traefik and Cloudflare Tunnel example](infra/README.md).

The design follows the Tailscale access, external Docker network and Traefik label pattern in [SP Energia](https://github.com/marcelomatheus/sp-energiasolar-app). It moves build/distribution into GitHub Actions and Docker Hub, adds health validation and application rollback, and removes source checkout from the VPS.
