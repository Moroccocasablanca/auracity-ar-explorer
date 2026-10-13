# Production image: builds the app and serves it with Bun. Used by the hosting service (see render.yaml).
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
RUN NITRO_PRESET=bun bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV NODE_ENV=production PORT=10000
EXPOSE 10000
CMD ["bun", ".output/server/index.mjs"]
