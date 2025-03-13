#!/bin/bash

PROJECT_ID="gen-lang-client-0020107488"
ENV_FILE="../.env"

# Check if file exists
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found!"
  exit 1
fi

# Read .env file and create secrets
while IFS='=' read -r key value; do
  # Ignore empty lines and comments
  if [[ -z "$key" || "$key" == \#* ]]; then
    continue
  fi

  # Trim whitespaces and remove optional quotes from values
  key=$(echo -n "$key" | xargs)
  value=$(echo -n "$value" | xargs | sed -E 's/^"(.*)"$/\1/')

  # Delete the secret if it exists (FORCE OVERWRITE)
  if gcloud secrets describe "$key" --project "$PROJECT_ID" &>/dev/null; then
    gcloud secrets delete "$key" --quiet --project "$PROJECT_ID"
    echo "🚨 Deleted existing secret: $key"
  fi

  # Create the secret again
  gcloud secrets create "$key" --replication-policy="automatic" --project "$PROJECT_ID"
  
  # Add the secret value
  echo -n "$value" | gcloud secrets versions add "$key" --data-file=- --project "$PROJECT_ID"

  echo "✅ Overwritten secret: $key"
done < "$ENV_FILE"

echo "🚀 All secrets updated successfully!"
