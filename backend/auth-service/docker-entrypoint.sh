#!/bin/sh
# Fetch the real ECS Fargate task IP from the metadata endpoint
# This IP is what other containers use to communicate with us
# Without this, Eureka registers 169.254.172.2 which is unreachable by other tasks

ECS_IP=""

# Try ECS metadata v4 (preferred)
if [ -n "$ECS_CONTAINER_METADATA_URI_V4" ]; then
  ECS_IP=$(curl -s --max-time 3 "$ECS_CONTAINER_METADATA_URI_V4" 2>/dev/null \
    | grep -o '"IPv4Addresses":\["[^"]*"' \
    | grep -o '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}' \
    | head -1)
fi

# Try ECS metadata v3 fallback
if [ -z "$ECS_IP" ] && [ -n "$ECS_CONTAINER_METADATA_URI" ]; then
  ECS_IP=$(curl -s --max-time 3 "$ECS_CONTAINER_METADATA_URI" 2>/dev/null \
    | grep -o '"IPv4Addresses":\["[^"]*"' \
    | grep -o '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}' \
    | head -1)
fi

# Fallback: use hostname -i (works in most Docker/ECS setups)
if [ -z "$ECS_IP" ]; then
  ECS_IP=$(hostname -i 2>/dev/null | awk '{print $1}')
fi

echo "==> ECS_TASK_IP resolved to: $ECS_IP"
export ECS_TASK_IP="$ECS_IP"

exec java -jar /app/app.jar
