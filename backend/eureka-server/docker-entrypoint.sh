#!/bin/sh
# Fetch real ECS Fargate task IP so Eureka registers the correct routable IP

ECS_IP=""

if [ -n "$ECS_CONTAINER_METADATA_URI_V4" ]; then
  ECS_IP=$(curl -s --max-time 3 "$ECS_CONTAINER_METADATA_URI_V4" 2>/dev/null \
    | grep -o '"IPv4Addresses":\["[^"]*"' \
    | grep -o '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}' \
    | head -1)
fi

if [ -z "$ECS_IP" ] && [ -n "$ECS_CONTAINER_METADATA_URI" ]; then
  ECS_IP=$(curl -s --max-time 3 "$ECS_CONTAINER_METADATA_URI" 2>/dev/null \
    | grep -o '"IPv4Addresses":\["[^"]*"' \
    | grep -o '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}' \
    | head -1)
fi

if [ -z "$ECS_IP" ]; then
  ECS_IP=$(hostname -i 2>/dev/null | awk '{print $1}')
fi

echo "==> ECS_TASK_IP resolved to: $ECS_IP"
export ECS_TASK_IP="$ECS_IP"

exec java -jar /app/app.jar