FROM node:26.13.0-bookworm-slim@sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68 AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM base AS runtime
ARG GIT_SHA=development
ARG APP_VERSION=1.0.0
LABEL org.opencontainers.image.title="Mock Credit Analysis API"
LABEL org.opencontainers.image.source="https://github.com/marcelomatheus/pipeline-ci-cd"
LABEL org.opencontainers.image.revision="${GIT_SHA}"
LABEL org.opencontainers.image.version="${APP_VERSION}"
ENV NODE_ENV=production
ENV PORT=3000
ENV GIT_SHA=${GIT_SHA}
ENV APP_VERSION=${APP_VERSION}
COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node scripts/smoke.mjs ./scripts/smoke.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD ["node", "--input-type=module", "-e", "const r = await fetch('http://127.0.0.1:3000/health/ready', { signal: AbortSignal.timeout(2000) }); if (!r.ok) process.exit(1)"]
CMD ["node", "dist/bootstrap/server.js"]
