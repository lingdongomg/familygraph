# FamilyGraph 自托管部署文档

本文档说明如何将 FamilyGraph 部署到自有服务器（替代微信云开发）。

## 环境要求

- 轻量级云服务器（推荐 2C2G/50G 磁盘）
- 已备案域名 + ICP 备案
- Docker & Docker Compose
- 服务器已开放 80/443 端口

## 1. 服务器准备

### 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 安装 Docker Compose（如未内置）
apt install docker-compose-plugin
# 或
yum install docker-compose-plugin
```

### 域名 & DNS

1. 注册域名（如 `family.example.com`）
2. 完成 ICP 备案（各云厂商提供免费备案服务）
3. DNS 解析：将域名 A 记录指向服务器公网 IP

## 2. 部署代码

```bash
# 克隆或上传代码到服务器
git clone <your-repo-url> /opt/familygraph
cd /opt/familygraph
```

## 3. 配置环境变量

```bash
cp .env.example .env
vi .env
```

填入实际值：

```env
PORT=8080
DATA_DIR=/app/data
UPLOAD_DIR=/app/uploads
BASE_URL=https://family.example.com
JWT_SECRET=<生成随机字符串: openssl rand -hex 32>
WX_APPID=<微信小程序 AppID>
WX_SECRET=<微信小程序 AppSecret>
CRYPTO_KEY=22f9c2560129fd419d98d32acb6fc3180189f57b322f16d311755302d51bea6d
```

> `CRYPTO_KEY` 须与云函数版本保持一致，以支持加密数据迁移。

## 4. 获取 SSL 证书

```bash
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh family.example.com admin@example.com
```

此脚本会：
1. 生成临时自签名证书（让 Nginx 可以启动）
2. 使用 certbot 通过 HTTP 验证获取 Let's Encrypt 证书
3. 重载 Nginx 使用正式证书

### 自动续期

添加 crontab 任务：

```bash
crontab -e
# 每月 1 号凌晨自动续期
0 0 1 * * cd /opt/familygraph && ./scripts/init-ssl.sh family.example.com
```

## 5. 启动服务

```bash
docker compose up -d
```

验证服务状态：

```bash
docker compose ps
docker compose logs api
docker compose logs nginx
```

API 健康检查：

```bash
curl -k https://family.example.com/api/v1/family/share/test
# 应返回 JSON 错误响应（表示服务正常运行）
```

## 6. 微信公众平台配置

登录 [微信公众平台](https://mp.weixin.qq.com/) → 开发管理 → 开发设置：

### 服务器域名配置

| 域名类型 | 域名 |
|---------|------|
| request 合法域名 | `https://family.example.com` |
| uploadFile 合法域名 | `https://family.example.com` |
| downloadFile 合法域名 | `https://family.example.com` |

### 小程序端配置

修改 `miniprogram/utils/config.js`：

```javascript
module.exports = {
  BASE_URL: 'https://family.example.com'
}
```

## 7. 数据迁移（从云开发迁移）

### 导出云开发数据

1. 登录微信云开发控制台
2. 进入数据库管理
3. 逐个集合导出 JSON：`users`、`families`、`family_members`、`persons`、`relationships`、`photos`、`photo_tags`、`edit_history`、`person_notes`、`join_requests`、`share_links`、`custom_title_maps`
4. 将 JSON 文件放入同一目录

### 运行迁移工具

```bash
# 在服务器上执行（需要 Go 环境）
cd /opt/familygraph/server
go run ../scripts/migrate-from-cloud.go \
  -data /path/to/exported-json/ \
  -db /app/data/familygraph.db
```

### 迁移照片文件

云存储中的照片需要手动下载：

1. 使用微信云开发 CLI 或控制台下载照片文件
2. 将照片按 `uploads/photos/{family_id}/` 目录结构存放
3. 更新数据库中照片记录的 `file_url` 和 `thumb_url` 为新的 HTTPS URL

## 8. 备份策略

### 自动每日备份

```bash
chmod +x scripts/backup.sh
crontab -e
# 每天凌晨 3 点备份
0 3 * * * /opt/familygraph/scripts/backup.sh /backups
```

### 手动恢复

```bash
chmod +x scripts/restore.sh
./scripts/restore.sh /backups/db-20240101_030000.db
```

## 9. 日常运维

### 查看日志

```bash
docker compose logs -f api    # API 日志
docker compose logs -f nginx  # Nginx 日志
```

### 重启服务

```bash
docker compose restart api
docker compose restart nginx
```

### 更新部署

```bash
cd /opt/familygraph
git pull
docker compose build api
docker compose up -d
```

## 成本对比

| 项目 | 微信云开发 | 自托管 |
|------|----------|--------|
| 服务器 | 月租套餐 ~100+ 元/月 | 轻量服务器 ~50-100 元/月 |
| 域名 | 不需要 | ~50-80 元/年 |
| SSL | 不需要 | 免费（Let's Encrypt） |
| 存储 | 按量计费 | 本地磁盘（含在服务器中） |
| **总计** | **~100+ 元/月** | **~55-110 元/月** |

## 常见问题

### 小程序无法连接服务器

1. 确认域名已在微信公众平台配置白名单
2. 确认 SSL 证书有效且链完整
3. 确认服务器 80/443 端口已开放
4. 开发阶段可在微信开发者工具中勾选「不校验合法域名」

### SQLite 数据库锁

SQLite 使用 WAL 模式，支持并发读。如遇「database is locked」错误，检查：
1. `SetMaxOpenConns(1)` 是否已设置
2. `busy_timeout` 是否已设置为 5000ms

### 照片无法显示

1. 确认 Nginx 的 `/uploads/` location 配置正确
2. 确认 uploads volume 在 Nginx 和 API 容器间共享
3. 确认 `BASE_URL` 环境变量配置正确
