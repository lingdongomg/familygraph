#!/bin/bash
# FamilyGraph 数据备份脚本
# 用法: ./backup.sh [备份目录]
# 建议通过 crontab 每日执行: 0 3 * * * /path/to/backup.sh

set -e

BACKUP_DIR="${1:-/backups}"
DATA_DIR="${DATA_DIR:-/app/data}"
UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# SQLite 在线安全备份
if [ -f "$DATA_DIR/familygraph.db" ]; then
    sqlite3 "$DATA_DIR/familygraph.db" ".backup '$BACKUP_DIR/db-$DATE.db'"
    echo "  Database backed up: db-$DATE.db"
fi

# 上传文件增量同步
if [ -d "$UPLOAD_DIR" ]; then
    rsync -a --delete "$UPLOAD_DIR/" "$BACKUP_DIR/uploads/"
    echo "  Uploads synced"
fi

# 清理旧备份
find "$BACKUP_DIR" -name "db-*.db" -mtime +$RETENTION_DAYS -delete
echo "  Old backups cleaned (>${RETENTION_DAYS} days)"

echo "[$(date)] Backup completed"
