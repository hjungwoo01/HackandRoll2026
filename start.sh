#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="${RAILWAY_SERVICE_NAME:-${SERVICE_NAME:-}}"

if [[ -n "${SERVICE_NAME}" ]]; then
  if [[ "${SERVICE_NAME}" == *"analytics"* ]]; then
    APP_DIR="${ROOT_DIR}/analytics"
  elif [[ "${SERVICE_NAME}" == *"lightweight"* ]]; then
    APP_DIR="${ROOT_DIR}/lightweight-validation"
  else
    APP_DIR="${ROOT_DIR}"
  fi
else
  if [[ -f "${ROOT_DIR}/app.py" ]]; then
    APP_DIR="${ROOT_DIR}"
  elif [[ -f "${ROOT_DIR}/analytics/app.py" ]]; then
    APP_DIR="${ROOT_DIR}/analytics"
  elif [[ -f "${ROOT_DIR}/lightweight-validation/app.py" ]]; then
    APP_DIR="${ROOT_DIR}/lightweight-validation"
  else
    echo "Could not find app.py in expected locations." >&2
    exit 1
  fi
fi

cd "${APP_DIR}"
if [[ -f "requirements.txt" ]]; then
  python -m pip install --no-cache-dir -r requirements.txt
elif [[ -f "pyproject.toml" ]]; then
  python -m pip install --no-cache-dir .
fi

exec uvicorn app:app --host 0.0.0.0 --port "${PORT:-8000}"

