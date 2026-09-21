#!/bin/bash
# Pull the public GHCR image and restart the container (no local docker build).
# Same model as filix-merchant: public package — no GHCR login required.
#
# Runtime config: .env.prod, .env.local, or /etc/filix-checkout/env
# Optional:
#   CHECKOUT_IMAGE=ghcr.io/filixpay/filix-checkout:latest
#   CHECKOUT_CONTAINER=filix-checkout
#   RUNTIME_ENV_FILE=/path/to/env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

resolve_runtime_env_file() {
	if [[ -n "${RUNTIME_ENV_FILE:-}" ]]; then
		printf '%s\n' "$RUNTIME_ENV_FILE"
		return 0
	fi
	if [[ -f "${REPO_ROOT}/.env.prod" ]]; then
		printf '%s\n' "${REPO_ROOT}/.env.prod"
		return 0
	fi
	if [[ -f "${REPO_ROOT}/.env.local" ]]; then
		printf '%s\n' "${REPO_ROOT}/.env.local"
		return 0
	fi
	if [[ -f /etc/filix-checkout/env ]]; then
		printf '%s\n' /etc/filix-checkout/env
		return 0
	fi
	printf '%s\n' ""
}

RUNTIME_ENV_FILE="$(resolve_runtime_env_file)"

IMAGE="${CHECKOUT_IMAGE:-ghcr.io/filixpay/filix-checkout:latest}"
CONTAINER_NAME="${CHECKOUT_CONTAINER:-filix-checkout}"
PORT_HOST="${PORT_HOST:-3001}"
PORT_CONTAINER="${PORT_CONTAINER:-3001}"

if [[ -z "$RUNTIME_ENV_FILE" || ! -f "$RUNTIME_ENV_FILE" ]]; then
	echo "Missing runtime env file (.env.prod, .env.local, or /etc/filix-checkout/env)."
	echo "Copy .env.example to .env.prod and fill in your values."
	exit 1
fi

echo "Pulling public image $IMAGE ..."
docker pull "$IMAGE"

pulled_image_id=$(docker image inspect -f '{{.Id}}' "$IMAGE")

running_image_id=""
container_running=false
if docker inspect "$CONTAINER_NAME" &>/dev/null; then
	running_image_id=$(docker inspect -f '{{.Image}}' "$CONTAINER_NAME")
	container_running=$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME")
fi

if [[ "$container_running" == "true" && -n "$running_image_id" && "$running_image_id" == "$pulled_image_id" ]]; then
	short_id="${pulled_image_id#sha256:}"
	short_id="${short_id:0:12}"
	echo "Image unchanged (${short_id}); skipping restart."
	exit 0
fi

echo "Restarting container with pulled image (env: $RUNTIME_ENV_FILE)..."
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

docker run -d \
	--name "${CONTAINER_NAME}" \
	--restart unless-stopped \
	-p "${PORT_HOST}:${PORT_CONTAINER}" \
	--env-file "${RUNTIME_ENV_FILE}" \
	-e NODE_ENV=production \
	-e PORT="${PORT_CONTAINER}" \
	-e HOSTNAME=0.0.0.0 \
	-e "NEXTAUTH_URL_INTERNAL=http://localhost:${PORT_CONTAINER}" \
	"${IMAGE}"

echo "Pruning dangling images..."
docker image prune -f

echo "Deploy complete."
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
