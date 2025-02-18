FROM denoland/deno:alpine-2.1.10
RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY . .

EXPOSE 8000
LABEL org.opencontainers.image.source="https://github.com/mkcfdc/AISearch"
CMD ["deno", "--allow-net", "--allow-env", "--allow-read=.", "run", "main.ts"]