#!/usr/bin/env bash
# shellcheck source=.env
DOTENV=".env"

source $DOTENV 2>/dev/null || {
  echo "ERROR: No $DOTENV file to source in local directory" >&2
  echo "Pull the development file and try again:" >&2
  echo "npx dotenv-vault@latest pull" >&2
  exit 1
}

gcloud run deploy "${GOOGLE_CLOUD_PROJECT}" \
  --source . \
  --set-env-vars DOTENV_KEY="$(npx dotenv-vault@latest keys production)" \
  --service-account="${SERVICE_ACCOUNT_EMAIL}" \
  --allow-unauthenticated
