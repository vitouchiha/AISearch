#!/bin/bash
set -a
source ../.env

if [[ -z "$DENO_DEPLOY_TOKEN" || -z "$PROJECT_ID" ]]; then
  echo "Please set DENO_DEPLOY_TOKEN and PROJECT_ID in your environment."
  exit 1
fi

while IFS= read -r line; do
  if [[ -z "$line" || "$line" =~ ^\s*# ]]; then
    continue
  fi

  key=$(echo "$line" | cut -d '=' -f1)
  value=$(echo "$line" | cut -d '=' -f2-)

  value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/')

  if [[ "$key" == "DENO_DEPLOY_TOKEN" || "$key" == "PROJECT_ID" ]]; then
    continue
  fi

  echo "Setting secret for $key"
  deployctl secrets set "$key" "$value" --project "$PROJECT_ID" --token "$DENO_DEPLOY_TOKEN"
done < .env
