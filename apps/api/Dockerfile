# ==============================================================================
# TOPRunAssistant - Backend API Dockerfile (NestJS + Prisma + Node 20)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

# Copy package manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN npm ci

# Copy source files
COPY tsconfig.base.json ./
RUN cp tsconfig.base.json /tsconfig.base.json || true
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY apps/api ./apps/api
COPY scripts ./scripts

# Build libraries and API
RUN npm run build --workspace=@toprun/shared
RUN npm run db:generate
RUN npm run build --workspace=@toprun/database
RUN npm run build --workspace=@toprun/api

# ==============================================================================
# Production Runner
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl curl

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy generated Prisma Client, CLI and built artifacts from builder
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/scripts ./scripts

ENV PATH="/app/node_modules/.bin:${PATH}"

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate --accept-data-loss && node apps/api/dist/main.js"]
