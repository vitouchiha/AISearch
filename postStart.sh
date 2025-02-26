#!/bin/sh
set -e

###
###   THIS SCRIPT STARTS NGROK ON BOOT OF DEV CONTAINER.
###
###

if [ -f .env ]; then
  echo "Sourcing .env file..."
  set -a
  . ./.env
  set +a
fi

# Check required env variables.
if [ -z "$PORT" ]; then
  echo "PORT is not defined. Exiting."
  exit 1
fi

if [ -z "$NGROK_TOKEN" ]; then
  echo "NGROK_TOKEN is not defined. Exiting."
  exit 1
fi

# Start ngrok in the background. Pass the access token if needed.
echo "Starting ngrok on port ${PORT}..."
ngrok http --authtoken "$NGROK_TOKEN" "$PORT" > ./logs/ngrok.log 2>&1 &

# Optionally, wait a few seconds for ngrok to initialize, then query its API to print the public URL.
sleep 10
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "ngrok tunnel established at: $NGROK_URL"

if [ -f ./.ngrok.env ]; then
  rm -f ./.ngrok.env
fi
if [ -f ./nohup.out ]; then
  rm -f ./nohup.out
fi

echo "$NGROK_URL" > ./.ngrok.env
