#!/bin/bash
# Pull pre-built image from GHCR and restart (no local docker build).
#
# Set DEPLOY_ENV_FILE to a file containing:
#   GHCR_USER=your-github-username
#   GHCR_TOKEN=ghp_...   # classic PAT with read:packages
#
# Optional overrides:
#   CHECKOUT_IMAGE=ghcr.io/filixpay/filix-checkout:latest
#   CHECKOUT_CONTAINER=filix-checkout

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="${DEPLOY_ENV_FILE:-}"

IMAGE="${CHECKOUT_IMAGE:-ghcr.io/filixpay/filix-checkout:latest}"
CONTAINER_NAME="${CHECKOUT_CONTAINER:-filix-checkout}"

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
	echo "📄 Loading GHCR credentials from $ENV_FILE"
	# shellcheck disable=SC1090
	source "$ENV_FILE"
else
	echo "⚠️  Deploy env file not set or missing: ${ENV_FILE:-<unset>}"
fi

IMAGE="${CHECKOUT_IMAGE:-$IMAGE}"
CONTAINER_NAME="${CHECKOUT_CONTAINER:-$CONTAINER_NAME}"

if [[ -z "${GHCR_TOKEN:-}" || -z "${GHCR_USER:-}" ]]; then
	echo "Missing GHCR_USER or GHCR_TOKEN."
	echo "Create a deploy env file (DEPLOY_ENV_FILE=/path/to/env) with:"
	echo "  GHCR_USER=..."
	echo "  GHCR_TOKEN=..."
	exit 1
fi

echo "🔐 登录 GHCR..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

echo "📥 拉取镜像 $IMAGE ..."
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
	echo "ℹ️  镜像未变化，与当前运行实例相同（${short_id}），跳过重启。"
	exit 0
fi

echo "▶️  重启容器（无本地 build）..."
cd "$REPO_ROOT"
export SKIP_BUILD=1
export CANDIDATE_IMAGE="$IMAGE"

bash "$REPO_ROOT/deploy.sh"

echo "🧹 清理 dangling 镜像..."
docker image prune -f

echo "✅ 部署完成"
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
