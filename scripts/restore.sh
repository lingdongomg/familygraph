#!/bin/bash
# FamilyGraph 数据恢复脚本
# 用法: ./restore.sh <备份文件路径>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-db-file>"
    echo "Example: $0 /backups/db-20240101_030000.db"
    exit 1
fi

BACKUP_FILE="$1"
DATA_DIR="${DATA_DIR:-/app/data}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will replace the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Stop the API service if running
echo "Stopping API service..."
docker compose stop api 2>/dev/null || true

# Replace database
cp "$BACKUP_FILE" "$DATA_DIR/familygraph.db"
echo "Database restored from: $BACKUP_FILE"

# Restart
echo "Starting API service..."
docker compose start api 2>/dev/null || true

echo "Restore completed."
