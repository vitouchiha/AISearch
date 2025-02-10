FROM denoland/deno:alpine

WORKDIR /app

COPY . .

EXPOSE 8000
LABEL org.opencontainers.image.source="https://github.com/mkcfdc/AISearch" 
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read=.", "main.ts"]
