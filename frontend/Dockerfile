# Multi-stage Dockerfile for the SynapsVault Vite frontend
# (https://github.com/SynapsVault/frontend). The build context is a checkout of
# that repository; this file lives in the deploy repo.

ARG NODE_VERSION=22
# The frontend repo has no lockfile and conflicting peer dependencies, which
# crash npm's resolver; --legacy-peer-deps works around it until fixed upstream.
#
# TODO(#102): drop --legacy-peer-deps once the frontend repo ships a lockfile
# and resolves its peer conflicts. Tracked upstream at
# https://github.com/SynapsVault/frontend/issues (lockfile + peer deps).
# crash npm's resolver; --legacy-peer-deps works around it until fixed upstream
# (tracked in https://github.com/SynapsVault/frontend/issues).
ARG NPM_FLAGS=--legacy-peer-deps
# Once the upstream lockfile and peer dependencies are resolved, drop the
# --legacy-peer-deps flag (override with --build-arg NPM_FLAGS=--legacy-peer-deps if needed).
ARG NPM_FLAGS=""

# Stage 1: Build the Vite application
FROM node:${NODE_VERSION}-alpine AS build
ARG NPM_FLAGS

WORKDIR /app

# Build-time configuration. Vite inlines VITE_* variables into the bundle, so
# they must be set here, not at container runtime. The default `/api` matches
# the Kubernetes ingress, which strips the prefix before forwarding to the
# backend.
ARG VITE_API_URL=/api
ARG VITE_NETWORK=testnet
ARG VITE_SENTRY_DSN=""
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_NETWORK=${VITE_NETWORK} \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN}

# Install dependencies (leverage layer caching)
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci ${NPM_FLAGS} || npm ci --legacy-peer-deps; \
    else npm install --no-audit --no-fund ${NPM_FLAGS} || npm install --no-audit --no-fund --legacy-peer-deps; fi

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve static assets via nginx
FROM nginx:1.31-alpine AS runtime

# Replace the default server with the app's config (SPA fallback, caching,
# security headers) from the frontend repository.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Runtime configuration. VITE_* values are baked in at build time, so staging
# and production would otherwise need separate images. Instead we generate
# /config.js at container start from env vars; the frontend reads
# window.__APP_CONFIG__ (see SynapsVault/frontend). Defaults mirror the
# build-time values above so an unconfigured container still works.
ENV APP_API_URL=/api \
    APP_NETWORK=testnet \
    APP_SENTRY_DSN=""

RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -eu' \
    'cat > /usr/share/nginx/html/config.js <<EOF' \
    'window.__APP_CONFIG__ = {' \
    '  apiUrl: "${APP_API_URL}",' \
    '  network: "${APP_NETWORK}",' \
    '  sentryDsn: "${APP_SENTRY_DSN}"' \
    '};' \
    'EOF' \
    'exec "$@"' \
    > /docker-entrypoint.d/40-generate-config.sh \
    && chmod +x /docker-entrypoint.d/40-generate-config.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
