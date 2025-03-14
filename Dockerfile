FROM denoland/deno:alpine-2.2.3
RUN apk update && apk upgrade --no-cache && apk add curl

WORKDIR /app

# TODO: MAKE CONFIGURE PAGE REACT COMPONENTS
# Fuck sake.

COPY . .

LABEL org.opencontainers.image.source="https://github.com/mkcfdc/AISearch"
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read=.", "--unstable-cron", "main.ts"]