# Use Deno image to get the deno binary
FROM denoland/deno:bin-2.2.3 AS deno

# Use your Node dev container as the final image
FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Copy the deno binary from the previous stage
COPY --from=deno /deno /usr/local/bin/deno

# Download, unzip, and install ngrok
RUN apt-get update && apt-get install -y unzip curl jq \
  && curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | tee /etc/apt/trusted.gpg.d/ngrok.asc > /dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | tee /etc/apt/sources.list.d/ngrok.list \
  && apt-get update \
  && apt-get install -y ngrok

# Copy the .devcontainer folder (or just the script) into the container
# COPY postStart.sh /workspace/postStart.sh
# RUN chmod +x /workspace/postStart.sh