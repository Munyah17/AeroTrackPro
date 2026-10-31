# AeroTrack ingest — raw TCP listeners + decoders + command dispatcher.
# Build context: REPO ROOT (workspace deps live outside this folder):
#   docker build -f apps/ingest/Dockerfile -t aerotrack-ingest .
FROM node:20-slim
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# Manifests first for dependency-layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/protocols/package.json packages/protocols/
COPY apps/ingest/package.json apps/ingest/
RUN pnpm install --frozen-lockfile --filter @aerotrack/ingest...

COPY packages/protocols packages/protocols
COPY apps/ingest apps/ingest
WORKDIR /app/apps/ingest

# @aerotrack/protocols ships TS source (exports: ./src/index.ts) so the service
# runs under tsx — same loader as `pnpm dev`, no separate build step needed.
#
# Listener ports (Traccar conventions): h02 5013 · gt06 5023 · gps103 5001 ·
# eelink 5064 · queclink 5004 · meitrack 5020 · topflytech 5049 · vt200 5045 ·
# teltonika 5027 · jt808 5015
EXPOSE 5001 5004 5013 5015 5020 5023 5027 5045 5049 5064
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
