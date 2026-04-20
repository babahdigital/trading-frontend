#!/bin/bash
# Install Docker + Docker Compose on target VPS (Ubuntu 22.04).
# Idempotent: exits cleanly if already installed.
set -euo pipefail

# Skip if already installed
if command -v docker >/dev/null 2>&1; then
  echo "Docker already installed: $(docker --version)"
  exit 0
fi

echo "Installing Docker..."

# Update package index
apt-get update -qq

# Install dependencies
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release

# Add Docker GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose
apt-get update -qq
apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Start + enable
systemctl start docker
systemctl enable docker

# Verify
docker --version
docker compose version

echo "✓ Docker installed successfully"
