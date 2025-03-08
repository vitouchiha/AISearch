FROM denoland/deno:alpine-2.2.3
RUN apk update && apk upgrade --no-cache && apk add curl

WORKDIR /app

COPY . .

EXPOSE 8000
LABEL org.opencontainers.image.source="https://github.com/mkcfdc/AISearch"
CMD ["deno", "--allow-net", "--allow-env", "--allow-read=.", "--unstable-cron", "run", "main.ts"]