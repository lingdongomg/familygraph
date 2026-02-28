# Tasks

## 阶段一：Go 后端项目搭建

- [x] 1. 初始化 server/ Go 项目结构
  - File: `server/go.mod`, `server/main.go`, `server/Dockerfile`
  - Change: 创建 Go module，安装三个核心依赖（modernc.org/sqlite、golang-jwt/jwt/v5、disintegration/imaging），编写 main.go 骨架（配置加载、HTTP 服务启动）
  - Behavior: `go run main.go` 可启动 HTTP 服务并监听 8080 端口；`docker build` 可产生 <20MB 的 scratch 镜像

- [x] 2. 实现 SQLite 数据库层与 schema 初始化
  - File: `server/store/db.go`
  - Change: 使用 modernc.org/sqlite 创建所有 12 张表，启用 WAL 模式、busy_timeout、foreign_keys；实现首次启动自动建表
  - Behavior: 首次启动自动创建 familygraph.db 和全部表结构；重启后数据保留

- [x] 3. 实现统一响应格式和错误处理
  - File: `server/handler/response.go`, `server/middleware/middleware.go`
  - Change: 定义 Response struct { Code int, Message string, Data interface{} }，实现 panic recovery 中间件和请求日志中间件
  - Behavior: 所有响应遵循 { code, message, data } 格式；panic 被捕获并返回 500 JSON

- [x] 4. 实现微信 code2session 登录与 JWT 鉴权
  - File: `server/pkg/wxauth.go`, `server/middleware/auth.go`, `server/handler/user.go`, `server/store/user.go`
  - Change: 实现 code2session HTTP 调用、JWT 签发/验证中间件、login 和 updateProfile handler；login 返回 family_ids（通过 JOIN 查询替代已删除的 users.family_ids 字段）
  - Behavior: POST /api/v1/user/login 接受 code 返回 JWT token + family_ids；受保护端点需要有效 token

## 阶段二：业务逻辑重写（云函数 → Go handler）

- [x] 5. 重写 family 模块
  - File: `server/handler/family.go`
  - Change: 用 Go 实现 create/delete/getDetail/generateInviteCode/generateShareLink/getByShareCode，包含级联删除（利用 ON DELETE CASCADE）
  - Behavior: 所有家庭管理 API 功能与云函数版本行为一致

- [x] 6. 重写 person 模块
  - File: `server/handler/person.go`
  - Change: 用 Go 实现 create/update/delete/getDetail/list + avatar upload，包含编辑历史记录（snapshot 存为 JSON）、7 条关系推断规则
  - Behavior: 人物 CRUD 功能与云函数版本行为一致

- [x] 7. 重写 relationship 模块（含 BFS 称谓计算）
  - File: `server/handler/relationship.go`, `server/pkg/titlemap.go`
  - Change: 用 Go 实现 create/delete/computeTitle/getGraph；BFS 最短路径算法和 FORMAL_TITLE_MAP 查表逻辑完整移植
  - Behavior: 关系图谱和称谓推断功能与云函数版本行为一致

- [x] 8. 重写 member 模块
  - File: `server/handler/member.go`
  - Change: 用 Go 实现 applyJoin/reviewJoin/validateInvite/listJoinRequests/leave/changeRole/list/getSelf/updateTitleMap
  - Behavior: 成员管理和权限控制与云函数版本行为一致

- [x] 9. 重写 photo 模块（含文件上传和图片处理）
  - File: `server/handler/photo.go`
  - Change: 用 Go 标准库处理 multipart 上传，实现照片 CRUD 和标记管理
  - Behavior: 照片上传/删除/列表/标记功能完整，图片通过 HTTPS URL 直接访问

- [x] 10. 重写 history/note/titlemap/admin 模块
  - File: `server/handler/history.go`, `server/handler/note.go`, `server/handler/titlemap.go`, `server/handler/admin.go`
  - Change: 用 Go 实现编辑历史（含 rollback）、私人备注（含 AES 加密字段）、自定义称谓映射（overrides 为 JSON）、管理工具
  - Behavior: 次要功能与云函数版本行为一致

## 阶段三：小程序端适配

- [x] 11. 重写 miniprogram/utils/api.js 适配层
  - File: `miniprogram/utils/api.js`, `miniprogram/utils/config.js`
  - Change: 将 wx.cloud.callFunction 替换为 wx.request，实现 name/action → HTTP 路由的映射表（ROUTE_MAP）；添加 JWT token 自动附加逻辑；新增 uploadFile() 方法
  - Behavior: 保持 callFunction(name, data) 接口签名不变，页面层代码零改动

- [x] 12. 改造登录流程
  - File: `miniprogram/app.js`, `miniprogram/utils/auth.js`
  - Change: 移除 wx.cloud.init()，改为 wx.login() → POST /api/v1/user/login → 存储 JWT token；auth.js 的 login() 使用 wx.login 获取 code
  - Behavior: 小程序启动时按需完成登录并获得 JWT token，后续请求自动携带

- [x] 13. 改造文件上传（照片/头像）
  - File: `miniprogram/pages/photo/album/index.js`, `miniprogram/pages/person/edit/index.js`, `miniprogram/pages/user/profile/index.js`
  - Change: 将 wx.cloud.uploadFile 替换为 api.uploadFile()，上传目标改为自有服务器 /api/v1/photo/upload、/api/v1/user/avatar、/api/v1/person/avatar
  - Behavior: 照片/头像上传功能正常，返回 HTTPS URL

- [x] 14. 移除 getTempFileURL 调用
  - File: `miniprogram/components/family-graph/index.js`
  - Change: 移除 wx.cloud.getTempFileURL 调用，图片 URL 改为直接使用数据库中存储的 HTTPS URL；loadAvatars() 直接用 node.avatar 作为 imgObj.src
  - Behavior: 图谱头像显示正常，无需临时 URL 转换

## 阶段四：部署与运维

- [x] 15. 编写 Docker Compose 和 Nginx 配置
  - File: `docker-compose.yml`, `nginx/conf.d/default.conf`, `server/Dockerfile`
  - Change: 编写 Go API（scratch 镜像）+ Nginx 双容器编排，Nginx 配置 HTTPS 终结、API 反代（到 8080）、静态文件服务
  - Behavior: `docker-compose up -d` 一键启动完整服务

- [x] 16. 编写 Let's Encrypt SSL 证书初始化脚本
  - File: `scripts/init-ssl.sh`
  - Change: 基于 certbot 自动获取和续期 SSL 证书
  - Behavior: 运行脚本自动获取证书并配置自动续期 cron

- [x] 17. 编写数据迁移工具
  - File: `scripts/migrate-from-cloud.go`
  - Change: Go 程序读取云开发导出的 JSON → 转换 → 导入 SQLite；支持所有 12 个集合的迁移
  - Behavior: 执行后所有历史数据完整迁移到自托管环境

- [x] 18. 编写备份/恢复脚本
  - File: `scripts/backup.sh`, `scripts/restore.sh`
  - Change: SQLite 在线备份 + 文件增量同步 + 自动清理旧备份
  - Behavior: crontab 定期执行，保留 7 天滚动备份

- [x] 19. 编写部署文档
  - File: `DEPLOY-SELF-HOSTED.md`
  - Change: 记录完整部署步骤：购买服务器、域名备案、DNS 配置、SSL 证书、Docker 安装、微信公众平台域名配置、启动服务、数据迁移
  - Behavior: 按文档操作可从零部署完整环境

## 阶段五：测试与验证

- [ ] 20. Go API 测试
  - File: `server/handler/*_test.go`, `server/service/*_test.go`
  - Change: 使用 Go 标准库 testing + httptest 为所有 API 端点编写集成测试
  - Behavior: `go test ./...` 验证所有端点正确响应

- [ ] 21. 端到端功能验证
  - Change: 在微信开发者工具中配置自有服务器域名，逐一验证：登录、创建家庭、添加人物、建立关系、查看图谱、上传照片、照片标记、分享链接等核心功能
  - Behavior: 所有功能与微信云开发版本表现一致

## 依赖关系

```
1 → 2 → 3 → 4 → 5-10（阶段二可并行）→ 11 → 12-14（可并行）→ 15-16 → 17-19（可并行）→ 20 → 21
```

## 可并行的工作

- 任务 5-10（业务逻辑重写）在完成任务 1-4 后可并行进行
- 任务 12-14（小程序端改造）在完成任务 11 后可并行进行
- 任务 15-16（部署配置）可以和阶段二/三并行开发
- 任务 17-19（运维脚本和文档）在后端完成后可并行进行
