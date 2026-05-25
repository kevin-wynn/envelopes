#!/usr/bin/env bash
set -euo pipefail

IMAGE="lukevinskywynn/envelopes"
TAG="${1:-latest}"

echo "Setting up buildx for multi-arch ..."
docker buildx create --use --name multiarch || true
docker buildx inspect --bootstrap

echo "Building $IMAGE:$TAG for linux/amd64,linux/arm64 ..."
docker buildx build -t "$IMAGE:$TAG" --platform linux/amd64,linux/arm64 ./app --push

if [ "$TAG" != "latest" ]; then
  echo "Tagging and pushing $IMAGE:latest ..."
  docker buildx build -t "$IMAGE:latest" --platform linux/amd64,linux/arm64 ./app --push
fi

echo "Done — $IMAGE:$TAG published."
