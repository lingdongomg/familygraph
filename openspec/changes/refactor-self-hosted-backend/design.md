# Design: Go 自托管后端架构设计（v3）

## 0. 数据库选型深度分析：文档型 → SQLite 可行性

### 现有文档型操作模式全面审查

对全部 10 个云函数的数据库操作进行逐一分析后，确认所有操作均可映射到 SQL + JSON 列。

#### 需要特殊处理的模式

| 模式 | 使用位置 | SQL 映射 |
|------|---------|---------|
| `_.push(value)` | `users.family_ids` | **删除字段**，用 `family_members` JOIN 替代 |
| `_.pull(value)` | `users.family_ids` | **删除字段**，用 JOIN 替代 |
| `_.inc(n)` | `families.member_count` 等 | `SET x = x + ?` |
| `_.in([...])` | `relationships.relation_type` | `WHERE x IN (?, ?)` |
| `_.and() / _.or()` | `custom_title_maps` | `WHERE (...) AND/OR (...)` |
| `_.gt() / _.lt()` | 过期时间判断 | `WHERE field > ?` |
| `_.remove()` | 删除字段值 | `SET field = NULL` |
| 嵌套对象 | `edit_history.snapshot_*`, `field_changes` | JSON TEXT 列 |
| 动态 key-value | `custom_title_maps.overrides` | JSON TEXT 列 |
| 字符串数组 | `person_notes.remarks` | JSON TEXT 列 |

**关键发现**：`users.family_ids` 是项目中唯一的"数组字段 + 原子操作"模式，而它完全是冗余的——`family_members` 表已经维护了 user↔family 关系。迁移时删除该字段，用 JOIN 替代。

**最终结论**：SQLite 完全可行。项目的数据模型天然就是关系型的。

---

## 1. 整体架构

```
┌─────────────────┐     HTTPS      ┌──────────────────────────────────────┐
│  微信小程序端    │ ───────────►   │         云服务器 (2C2G/50G)          │
│  (wx.request)   │                │                                      │
│  (wx.uploadFile)│                │  ┌─────────┐    ┌──────────────┐     │
└─────────────────┘                │  │  Nginx   │───►│  Go API      │     │
                                   │  │ (HTTPS   │    │  (~15-35MB)  │     │
                                   │  │  终结+   │    │  Port 8080   │     │
                                   │  │  静态文件)│    └──────┬───────┘     │
                                   │  └─────────┘           │              │
                                   │       │                │              │
                                   │       ▼                ▼              │
                                   │  ┌─────────┐    ┌──────────────┐     │
                                   │  │ /uploads │    │   SQLite DB  │     │
                                   │  │ (静态文件)│    │  (单文件)    │     │
                                   │  └─────────┘    └──────────────┘     │
                                   └──────────────────────────────────────┘
```

与 Node.js 方案相比的内存收益：

| 组件 | Node.js 方案 | Go 方案 |
|------|-------------|---------|
| API 进程（空闲） | ~80-140 MB | ~15-35 MB |
| API 进程（负载） | ~150-250 MB | ~40-80 MB |
| Docker 镜像 | ~200-300 MB | ~5-15 MB |
| 启动时间 | 200-800 ms | <50 ms |

## 2. Docker Compose 部署架构

```yaml
# docker-compose.yml 概念设计
services:
  api:
    build: ./server
    ports:
      - "8080:8080"
    volumes:
      - db-data:/app/data        # SQLite 数据文件
      - uploads:/app/uploads     # 上传文件
    environment:
      - JWT_SECRET=xxx
      - WX_APPID=xxx
      - WX_SECRET=xxx
    restart: unless-stopped
    mem_limit: 256m              # Go 进程内存限制（比 Node.js 的 512m 低一倍）

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - uploads:/usr/share/nginx/uploads:ro
      - certbot-data:/var/www/certbot
    depends_on:
      - api
    restart: unless-stopped
    mem_limit: 128m

volumes:
  db-data:
  uploads:
  certbot-data:
```

**内存分配规划**（2G 总内存）：

| 组件 | Go 方案 | Node.js 方案（对比） |
|------|--------|-------------------|
| Linux 系统 | ~300MB | ~300MB |
| Nginx | ~50-100MB | ~50-100MB |
| API 进程 | ~50-80MB | ~150-250MB |
| SQLite | 与 API 共享 | 与 API 共享 |
| Docker 开销 | ~100MB | ~100MB |
| **预留缓冲** | **~1.3GB+** | **~700MB+** |

Go 方案留出约 **1.3GB 空闲内存**，可用作 Linux 文件系统缓存（加速 SQLite 和图片读取）或未来运行其他服务。

## 3. Go 项目结构设计

```
FamilyGraph/
├── miniprogram/                   # 小程序端（修改 API 调用层）
├── server/                        # Go 后端
│   ├── Dockerfile                 # 多阶段构建
│   ├── go.mod
│   ├── go.sum
│   ├── main.go                    # 入口：配置加载、DB 初始化、路由注册、启动 HTTP
│   ├── config/
│   │   └── config.go              # 环境变量配置
│   ├── middleware/
│   │   ├── auth.go                # JWT 鉴权中间件
│   │   ├── cors.go                # CORS 处理
│   │   └── logger.go              # 请求日志
│   ├── handler/                   # HTTP 处理器（对应云函数入口）
│   │   ├── user.go                # /api/v1/user/*
│   │   ├── family.go              # /api/v1/family/*
│   │   ├── person.go              # /api/v1/person/*
│   │   ├── relationship.go        # /api/v1/relationship/*
│   │   ├── photo.go               # /api/v1/photo/*
│   │   ├── member.go              # /api/v1/member/*
│   │   ├── history.go             # /api/v1/history/*
│   │   ├── note.go                # /api/v1/note/*
│   │   ├── titlemap.go            # /api/v1/titlemap/*
│   │   ├── admin.go               # /api/v1/admin/*
│   │   └── response.go            # 统一响应格式 { code, message, data }
│   ├── service/                   # 业务逻辑层（从云函数迁移核心逻辑）
│   │   ├── user.go
│   │   ├── family.go
│   │   ├── person.go
│   │   ├── relationship.go        # 含 BFS 称谓计算
│   │   ├── photo.go
│   │   ├── member.go
│   │   ├── history.go
│   │   ├── note.go
│   │   └── titlemap.go
│   ├── model/                     # 数据结构定义
│   │   ├── user.go
│   │   ├── family.go
│   │   ├── person.go
│   │   ├── relationship.go
│   │   ├── photo.go
│   │   └── ...
│   ├── store/                     # 数据库访问层
│   │   ├── db.go                  # SQLite 连接初始化 + schema 迁移
│   │   ├── user.go
│   │   ├── family.go
│   │   ├── person.go
│   │   ├── relationship.go
│   │   ├── photo.go
│   │   └── ...
│   ├── pkg/                       # 工具包
│   │   ├── crypto.go              # AES-256-CBC 加解密（复用现有逻辑）
│   │   ├── wxauth.go              # 微信 code2session 调用
│   │   └── titlemap.go            # 系统默认称谓表
│   └── data/                      # SQLite 数据库文件（持久化卷）
├── nginx/                         # Nginx 配置
│   ├── conf.d/
│   │   └── default.conf
│   └── ssl/
├── docker-compose.yml
├── .env.example
└── scripts/
    ├── backup.sh
    ├── restore.sh
    ├── init-ssl.sh
    └── migrate-from-cloud.go      # 数据迁移工具
```

### Go 依赖清单（go.mod）

```
module github.com/yourname/familygraph-server

go 1.22

require (
    modernc.org/sqlite              // SQLite 驱动（纯 Go，无 CGO）
    github.com/golang-jwt/jwt/v5    // JWT
    github.com/disintegration/imaging // 图片处理（纯 Go）
)
```

仅 3 个核心外部依赖。HTTP 路由、JSON 处理、文件上传均使用 Go 标准库。

### Dockerfile（多阶段构建）

```dockerfile
# 构建阶段
FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server .

# 运行阶段（scratch = 空镜像，最终仅包含二进制 + CA 证书）
FROM scratch
COPY --from=builder /build/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE 8080
ENTRYPOINT ["/server"]
```

最终镜像大小：~5-15MB（对比 Node.js 方案的 ~200-300MB）。

## 4. 数据库设计（SQLite + JSON 混合模型）

schema 设计与之前 v2 版本一致（SQL 是语言无关的），此处不再重复。参见 v2 版本的完整 SQL schema。

### Go 端 SQLite 使用模式

```go
// 初始化（main.go）
import "modernc.org/sqlite"

db, err := sql.Open("sqlite", "file:data/familygraph.db?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)")
db.SetMaxOpenConns(1)  // SQLite 单写者模型
```

### 云开发操作 → Go database/sql 映射

| 云开发操作 | Go 等价 |
|-----------|---------|
| `db.collection('x').add({ data })` | `db.Exec("INSERT INTO x (...) VALUES (?,...)", ...)` |
| `db.collection('x').doc(id).get()` | `db.QueryRow("SELECT * FROM x WHERE id = ?", id)` |
| `db.collection('x').where({...}).get()` | `db.Query("SELECT * FROM x WHERE ...", ...)` |
| `db.collection('x').doc(id).update({...})` | `db.Exec("UPDATE x SET ... WHERE id = ?", ...)` |
| `db.collection('x').doc(id).remove()` | `db.Exec("DELETE FROM x WHERE id = ?", id)` |
| `_.inc(n)` | `db.Exec("UPDATE x SET field = field + ? WHERE ...", n)` |
| 嵌套对象读写 | `json.Marshal()` / `json.Unmarshal()` + TEXT 列 |

## 5. 鉴权流程

### 当前（微信云开发）
```
小程序 → wx.cloud.callFunction → 云函数自动获取 OPENID
```

### 迁移后（Go 自有服务器）
```
1. 小程序启动 → wx.login() 获取临时 code
2. wx.request POST /api/v1/user/login { code }
3. Go 服务端 → HTTP 请求微信 jscode2session API → 获取 openid + session_key
4. Go 服务端 → 查找/创建用户 → 签发 JWT（payload: { userId, openidHash }）
5. Go 服务端 → 返回 { token, user }
6. 后续请求 → wx.request Header: { Authorization: Bearer <token> }
7. Go 中间件 → 验证 JWT → ctx.Value("openid") = openid
```

### Go JWT 中间件概念

```go
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        tokenStr := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
        claims, err := parseJWT(tokenStr)
        if err != nil {
            writeJSON(w, http.StatusUnauthorized, Response{Code: -1, Message: "未授权"})
            return
        }
        ctx := context.WithValue(r.Context(), "openid", claims.OpenID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## 6. 文件上传流程

### 迁移后（Go 服务器）
```
小程序 → wx.uploadFile → POST /api/v1/photo/upload (multipart)
Go → r.FormFile("file") → 存储到 /app/uploads/photos/{family_id}/{photo_id}.jpg
Go → imaging 库生成缩略图 → /app/uploads/photos/{family_id}/{photo_id}_thumb.jpg
Go → 返回 { photo_id, url: "https://domain/uploads/photos/..." }
Nginx → 直接服务 /uploads/ 路径下的静态文件
```

Go 的 multipart 文件上传处理是标准库内置的，不需要任何第三方库（对比 Node.js 需要 multer）。

## 7. API 路由设计

所有 API 统一前缀 `/api/v1/`，使用 Go 标准库 net/http（Go 1.22+）注册：

```go
mux := http.NewServeMux()

// 公开端点（无需鉴权）
mux.HandleFunc("POST /api/v1/user/login", h.UserLogin)
mux.HandleFunc("GET /api/v1/family/share/{code}", h.FamilyGetByShareCode)

// 受保护端点（需要 JWT）
protected := http.NewServeMux()
protected.HandleFunc("PUT /api/v1/user/profile", h.UserUpdateProfile)
protected.HandleFunc("POST /api/v1/family", h.FamilyCreate)
protected.HandleFunc("GET /api/v1/family/{id}", h.FamilyGetDetail)
protected.HandleFunc("DELETE /api/v1/family/{id}", h.FamilyDelete)
// ... 其余 30+ 路由

mux.Handle("/api/v1/", AuthMiddleware(protected))
```

完整路由表（与 v2 版本一致，HTTP 方法和路径不变）：

| 模块 | HTTP 方法 | 路由 | Go Handler |
|------|-----------|------|------------|
| user | POST | /api/v1/user/login | UserLogin |
| user | PUT | /api/v1/user/profile | UserUpdateProfile |
| family | POST | /api/v1/family | FamilyCreate |
| family | GET | /api/v1/family/{id} | FamilyGetDetail |
| family | DELETE | /api/v1/family/{id} | FamilyDelete |
| family | POST | /api/v1/family/{id}/invite-code | FamilyGenInviteCode |
| family | POST | /api/v1/family/{id}/share-link | FamilyGenShareLink |
| family | GET | /api/v1/family/share/{code} | FamilyGetByShareCode |
| person | POST | /api/v1/person | PersonCreate |
| person | PUT | /api/v1/person/{id} | PersonUpdate |
| person | DELETE | /api/v1/person/{id} | PersonDelete |
| person | GET | /api/v1/person/{id} | PersonGetDetail |
| person | GET | /api/v1/person | PersonList |
| relationship | POST | /api/v1/relationship | RelationshipCreate |
| relationship | DELETE | /api/v1/relationship/{id} | RelationshipDelete |
| relationship | GET | /api/v1/relationship/title | RelationshipComputeTitle |
| relationship | GET | /api/v1/relationship/graph | RelationshipGetGraph |
| photo | POST | /api/v1/photo/upload | PhotoUpload |
| photo | DELETE | /api/v1/photo/{id} | PhotoDelete |
| photo | GET | /api/v1/photo | PhotoList |
| photo | GET | /api/v1/photo/{id} | PhotoDetail |
| photo | POST | /api/v1/photo/{id}/tag | PhotoAddTag |
| photo | DELETE | /api/v1/photo/tag/{tagId} | PhotoRemoveTag |
| member | POST | /api/v1/member/join | MemberApplyJoin |
| member | POST | /api/v1/member/review | MemberReviewJoin |
| member | GET | /api/v1/member/validate-invite | MemberValidateInvite |
| member | GET | /api/v1/member/requests | MemberListRequests |
| member | POST | /api/v1/member/leave | MemberLeave |
| member | PUT | /api/v1/member/{id}/role | MemberChangeRole |
| member | GET | /api/v1/member | MemberList |
| member | GET | /api/v1/member/self | MemberGetSelf |
| member | PUT | /api/v1/member/{id}/title-map | MemberUpdateTitleMap |
| history | GET | /api/v1/history | HistoryList |
| history | POST | /api/v1/history/{id}/rollback | HistoryRollback |
| note | PUT | /api/v1/note | NoteUpsert |
| note | GET | /api/v1/note | NoteGet |
| titlemap | POST | /api/v1/titlemap | TitlemapCreate |
| titlemap | PUT | /api/v1/titlemap/{id} | TitlemapUpdate |
| titlemap | DELETE | /api/v1/titlemap/{id} | TitlemapDelete |
| titlemap | GET | /api/v1/titlemap/{id} | TitlemapGet |
| titlemap | GET | /api/v1/titlemap | TitlemapList |

## 8. 小程序端适配层

与之前方案一致：核心改动在 `miniprogram/utils/api.js`，将 `wx.cloud.callFunction` 替换为 `wx.request`，保持 `callFunction(name, data)` 接口签名不变以最小化页面层改动。

## 9. 性能优化策略（适配 2C2G）

| 策略 | 说明 |
|------|------|
| Go 静态编译 | 无运行时开销，启动 <50ms |
| SQLite WAL 模式 | 并发读不阻塞写 |
| modernc.org/sqlite | 纯 Go，并发读性能优于 mattn/go-sqlite3 |
| Nginx 静态文件 | 图片不经过 Go 进程 |
| Nginx gzip | 压缩 JSON 响应 |
| Go goroutine | 天然并发，每个请求一个 goroutine，无回调地狱 |
| imaging 纯 Go | 避免 CGO，简化构建，缩略图生成性能可接受 |
| Docker scratch | 镜像 5-15MB，拉取/部署极快 |
| GOMEMLIMIT | Go 1.19+ 可设置软内存上限，防止 GC 惰性导致 OOM |

## 10. 数据迁移方案

提供一个 Go 工具 `scripts/migrate-from-cloud.go`：

1. 读取从微信云开发 CLI 导出的 JSON 文件（每个 collection 一个 JSON）
2. 解析 JSON，映射字段名，插入 SQLite
3. JSON 字段（snapshot、overrides、remarks）直接转存为 JSON TEXT
4. 下载云存储中的照片文件到本地 `/uploads/` 目录
5. 更新照片记录中的 URL

## 11. 备份策略

```bash
# 每日自动备份（crontab）
sqlite3 /app/data/familygraph.db ".backup '/backups/db-$(date +%Y%m%d).db'"
rsync -av /app/uploads/ /backups/uploads/
find /backups/ -mtime +7 -delete
```
