FROM denoland/deno:alpine-2.1.9

WORKDIR /app

COPY config/deps.ts config/deps.ts
RUN ["deno", "cache", "config/deps.ts"]

COPY . .

EXPOSE 8000
LABEL org.opencontainers.image.source="https://github.com/mkcfdc/AISearch"
CMD ["deno", "--allow-net", "--allow-env", "--allow-read", "run", "main.ts"]