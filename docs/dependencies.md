# Dependency maintenance

## Supported baseline

The application deliberately targets Node.js 22. The runtime version is synchronized between `.nvmrc` and the Dockerfile; Node type definitions stay on major 22. GitHub Actions have their own embedded runtime, independent of the application's Node target.

| Dependency | Selected version | Reason |
| --- | --- | --- |
| Application Node.js | 22.23.4 | Required runtime; exact container digest and `.nvmrc` |
| `@types/node` | 22.20.5 | Latest published Node 22 typings at review time |
| TypeScript | 6.0.3, patch updates permitted | Supported by the current TypeScript ESLint peer range |
| `typescript-eslint` | 8.72.1 | Current release supports TypeScript `>=4.8.4 <6.1.0` |
| `minimatch` | 11.0.5 | Security override for the vulnerable transitive 10.x dependency |
| `actions/checkout` | 7.0.1 | Current release, pinned by commit SHA |
| `actions/setup-node` | 7.1.0 | Current release, pinned by commit SHA |

The Node 26 proposals in Dependabot #1 and #4 would change the required application target or expose unsupported APIs through newer typings. TypeScript 7 in #4 is outside the current linter's peer range. Dependabot therefore keeps Node and its typings on major 22 and defers TypeScript versions starting at 6.1.0. Revisit the TypeScript constraint when the installed linter officially expands its supported range; do not bypass peer checks with `--force` or `--legacy-peer-deps`.

The changes proposed by Dependabot #2 and #3 are incorporated into the dependency-maintenance PR. Existing bot PRs are left available for review until the consolidated changes are merged.

## Transitive security override

`GHSA-g3hv-75wg-m249` affects minimatch versions `>=7.0.0 <11.0.1`. The initial lockfile resolved minimatch 10.2.6 through ESLint, its configuration matcher and TypeScript ESLint. This produced ten moderate audit entries from one underlying advisory in the development toolchain.

The explicit npm override selects 11.0.5 for those consumers. It supports Node 22 and removes the advisory without downgrading ESLint to an unsupported line. Tests check both permitted and forbidden architecture imports to verify that the matcher update preserves ESLint's file-pattern behavior. Remove the override once all parent packages naturally resolve a patched version.

The production-only audit did not inspect these development packages. CI now audits the complete dependency tree and fails on moderate or higher findings.

## Production image contents

The final image retains Node.js 22, compiled application files, production dependencies and the smoke script. It removes the globally bundled npm package and its npm/npx launchers. Installation and compilation still use npm in separate build stages.

This addresses the ten fixable HIGH findings in the bundled npm dependency tree reported by the image scan: brace-expansion, ip-address, pacote, picomatch and sigstore. A project-level npm audit does not cover that global toolchain. The final service starts directly with `node`, so it does not need npm at runtime.

`scripts/test-image.sh` verifies that npm/npx and the global npm package are absent. `scripts/scan-image.sh` applies the same HIGH/CRITICAL fixable-vulnerability gate to the CI image and to the published digest. The removal does not suppress any scanner findings or change the security threshold.

## Installation and CI controls

`.npmrc` enables strict engine and peer checks for local and container installs. The Docker dependency stages copy the same configuration used in CI. The lockfile remains committed for reproducible `npm ci` installs.

`npm run check:dependencies` rejects deprecation markers recorded in the lockfile and verifies that Docker, `.nvmrc` and Node typings agree on the runtime target. Dependency metadata can change after a lockfile is written, so review installation warnings and refreshed registry metadata during upgrades as well.

```bash
npm ci
npm run check
npm audit --audit-level=moderate
npm ls --all
npm run verify:workflows
```

Dependency updates remain enabled. GitHub Actions updates are grouped into one weekly PR; npm development updates are grouped separately. Node 22 patch/minor updates and security updates continue to be considered.

## Sources

- [TypeScript ESLint supported dependency versions](https://typescript-eslint.io/users/dependency-versions/)
- [Minimatch advisory GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
- [Checkout 7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [Setup Node 7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)
