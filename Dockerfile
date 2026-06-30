FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    CVP_DATA_DIR=/data
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/worker.ts ./src/worker.ts
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/scripts ./scripts
COPY docker-entrypoint.sh /usr/local/bin/cvp-entrypoint
RUN chmod +x /usr/local/bin/cvp-entrypoint && mkdir -p /data/uploads /data/thumbs /data/manifests
EXPOSE 3000
ENTRYPOINT ["cvp-entrypoint"]
CMD ["node", "server.js"]
