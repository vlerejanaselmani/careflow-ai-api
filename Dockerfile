FROM oven/bun:1.2.19-alpine AS base

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production

EXPOSE 8080

CMD ["bun", "run", "src/server.ts"]