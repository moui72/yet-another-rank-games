# Production image for the YARG web service (SvelteKit + adapter-node).
#
# Multi-stage build: install deps once, build the app, then copy only the
# built output + production node_modules into a slim runtime stage. One image
# is configured per environment via env vars at container start (no rebuild
# per environment) — see infrastructure.md "Configuration & secrets".

# ---- deps: install full (dev+prod) deps for the build step -----------------
# --ignore-scripts: the repo's `prepare` script runs husky (a git-hooks tool
# for local dev), which isn't installed/needed in a container build.
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- build: compile the SvelteKit app with adapter-node ---------------------
# SvelteKit's post-build "analyse" step imports server modules (incl. the DB
# config loader) to check for issues, so build-time needs *some* value for
# required server env vars even though nothing actually connects at build
# time. These are placeholders only — real values are injected at container
# start (see infrastructure.md "Configuration & secrets").
FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres" \
    SUPABASE_SECRET_KEY="build-placeholder" \
    PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
    PUBLIC_SUPABASE_PUBLISHABLE_KEY="build-placeholder"
RUN npm run build

# ---- prod-deps: install production-only deps for the runtime stage ---------
FROM node:24-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ---- runtime: slim image that just runs the built server -------------------
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./package.json

# Cloud Run sets $PORT and expects the container to listen on it;
# adapter-node's built server reads PORT from the environment (defaults 3000).
EXPOSE 3000

CMD ["node", "build"]
