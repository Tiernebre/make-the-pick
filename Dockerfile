FROM denoland/deno:2.7.11 AS base
WORKDIR /app

# Cache dependencies by copying config files first
COPY deno.json deno.lock ./
COPY server/deno.json ./server/
COPY client/deno.json ./client/
COPY packages/shared/deno.json ./packages/shared/
RUN deno install

# Build stage: build the client
FROM base AS build
COPY . .
RUN cd client && deno task build

# Production stage
FROM base AS production
COPY . .
COPY --from=build /app/client/dist ./client/dist

ENV DENO_ENV=production
EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "cd server && deno run --allow-net --allow-env --allow-read db/migrate.ts && deno run --allow-net --allow-env --allow-read main.ts"]
