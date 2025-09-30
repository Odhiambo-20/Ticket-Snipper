#!/usr/bin/env bash

if [ -n "$GOOGLE_SERVICES_JSON" ]; then
  echo "$GOOGLE_SERVICES_JSON" | base64 -d > google-services.json
  echo "✓ google-services.json created from environment variable"
fi
