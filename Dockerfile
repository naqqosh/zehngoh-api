FROM node:22-alpine AS builder

RUN npm i -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate
RUN pnpm build
RUN pnpm prune --prod


FROM node:22-alpine

RUN adduser -D -u 1001 api

WORKDIR /app

RUN chown api:api /app

COPY --from=builder --chown=api:api /app/dist ./dist
COPY --from=builder --chown=api:api /app/node_modules ./node_modules

USER api

CMD ["node", "dist/main.js"]
