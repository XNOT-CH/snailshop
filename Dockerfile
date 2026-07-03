# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ARG AUTH_URL
ARG NEXT_PUBLIC_SITE_URL
ARG ALLOWED_ORIGIN
ARG NEXT_PUBLIC_CUBEJS_API_URL
ARG NEXT_PUBLIC_CUBEJS_API_TOKEN
# Public sitekey only — the client bundle inlines NEXT_PUBLIC_* at build time,
# so runtime env_file alone leaves the Turnstile widget without a sitekey.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV AUTH_URL=$AUTH_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV ALLOWED_ORIGIN=$ALLOWED_ORIGIN
ENV NEXT_PUBLIC_CUBEJS_API_URL=$NEXT_PUBLIC_CUBEJS_API_URL
ENV NEXT_PUBLIC_CUBEJS_API_TOKEN=$NEXT_PUBLIC_CUBEJS_API_TOKEN
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
# DATABASE_URL is passed as a BuildKit secret (never an ARG/ENV) so it stays out
# of the image layers and the build cache — it is exported only for the lifetime
# of this build command. It IS required: `next build` prerenders DB-backed pages
# and will fail without a reachable database (see BUILD_DATABASE_URL in .env).
RUN --mount=type=secret,id=database_url \
    DATABASE_URL="$(cat /run/secrets/database_url 2>/dev/null || true)" npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/storage /app/public/uploads \
    && chown nextjs:nodejs /app \
    && chown -R nextjs:nodejs /app/storage /app/public /app/.next

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
