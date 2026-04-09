FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ARG DATABASE_URL
ARG AUTH_URL
ARG NEXT_PUBLIC_SITE_URL
ARG ALLOWED_ORIGIN
ARG NEXT_PUBLIC_CUBEJS_API_URL
ARG NEXT_PUBLIC_CUBEJS_API_TOKEN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_URL=$AUTH_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV ALLOWED_ORIGIN=$ALLOWED_ORIGIN
ENV NEXT_PUBLIC_CUBEJS_API_URL=$NEXT_PUBLIC_CUBEJS_API_URL
ENV NEXT_PUBLIC_CUBEJS_API_TOKEN=$NEXT_PUBLIC_CUBEJS_API_TOKEN
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p /app/storage /app/public/uploads && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
