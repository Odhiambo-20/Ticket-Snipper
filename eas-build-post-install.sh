#!/usr/bin/env bash

set -e

echo "Running post-install hook..."

if [ -z "$GOOGLE_SERVICES_JSON" ]; then
  echo "ERROR: GOOGLE_SERVICES_JSON environment variable is not set"
  exit 1
fi

echo "Creating google-services.json from environment variable..."
echo "$GOOGLE_SERVICES_JSON" | base64 -d > google-services.json

if [ -f google-services.json ]; then
  echo "✓ google-services.json created successfully"
  ls -lh google-services.json
else
  echo "ERROR: Failed to create google-services.json"
  exit 1
fi
