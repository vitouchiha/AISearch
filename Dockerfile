# Stage 1: Build the Vite React App
FROM oven/bun:latest AS build
WORKDIR /app/configure
# Copy package files and install dependencies
COPY configure/package*.json ./
RUN bun install
# Copy the rest of the source code
COPY configure .
# Build the Vite app (default output is in the "dist" folder)
RUN bun run build

# Stage 2: Deno Server with Oak
FROM denoland/deno:alpine-2.2.5
RUN apk update && apk upgrade --no-cache && apk add curl

WORKDIR /app

# Copy all project files including your Oak server code
COPY server .
# Copy the built Vite app from the previous stage into the "configure/dist" folder
COPY --from=build /app/configure/dist ./configure/dist

LABEL org.opencontainers.image.source="https://github.com/mkcfdc/AISearch"
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read=.", "--unstable-cron", "./main.ts"]