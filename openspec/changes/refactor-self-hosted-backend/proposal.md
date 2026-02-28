# Change: 重构后端为 Go 自托管服务器部署

## Why

当前项目基于微信云开发（CloudBase），必须购买月租套餐才能正常运行，成本过高。需要将后端迁移至个人轻量级云服务器（2核2G/50G磁盘），使用 Go 重写后端以获得更低的内存占用和更简单的部署方式。

## What Changes

- **BREAKING**: 移除所有 `wx-server-sdk` 依赖，后端用 Go 重写为 HTTP API 服务（替代 Node.js 云函数）
- **BREAKING**: 数据库从微信云开发数据库迁移至 SQLite（modernc.org/sqlite，纯 Go 驱动）
- **BREAKING**: 文件存储从微信云存储迁移至服务器本地磁盘 + Nginx 静态服务
- **BREAKING**: 用户鉴权从 `cloud.getWXContext().OPENID` 隐式获取迁移为微信登录 code2session + JWT token 显式鉴权
- 小程序端 `wx.cloud.callFunction` 全部替换为 `wx.request` HTTP 调用
- 小程序端 `wx.cloud.uploadFile` 替换为 `wx.uploadFile` 到自有服务器
- 小程序端 `wx.cloud.getTempFileURL` 替换为直接 HTTPS URL 访问
- 使用 Docker 部署（单个 Go 静态二进制 + Nginx 反代 + SQLite + 文件卷）

## Impact

- Affected specs: self-hosted-api, self-hosted-storage, self-hosted-auth, miniprogram-http-adapter
- Affected code:
  - `cloudfunctions/` — 全部 10 个云函数的业务逻辑用 Go 重写
  - `miniprogram/utils/api.js` — 核心调用层重写
  - `miniprogram/app.js` — 移除 `wx.cloud.init`，改为配置服务器地址
  - `miniprogram/pages/photo/album/index.js` — 文件上传逻辑
  - `miniprogram/pages/user/profile/index.js` — 头像上传逻辑
  - `miniprogram/pages/person/edit/index.js` — 头像上传逻辑
  - `miniprogram/components/family-graph/index.js` — `getTempFileURL` 替换

## 已确认的决策

| # | 决策 | 结论 | 理由 |
|---|------|------|------|
| 1 | 后端语言 | **Go** | 内存占用 ~15-35MB（Node.js ~80-140MB）；静态编译单文件部署；无运行时依赖；适合资源受限的 2G 服务器 |
| 2 | 数据库 | SQLite（modernc.org/sqlite）+ JSON 列混合模式 | 纯 Go 驱动无需 CGO；内存占用极小；文档型操作全部可映射为 SQL + JSON 列（详见 design.md §0） |
| 3 | HTTP 路由 | Go 标准库 net/http（Go 1.22+ 内置路径参数）或 chi | 零依赖 / 极轻量；30 个路由不需要重框架 |
| 4 | JWT | golang-jwt/jwt/v5 | Go 生态标准 JWT 库 |
| 5 | 图片处理 | disintegration/imaging（纯 Go） | 避免 CGO 依赖；缩略图和压缩功能满足需求 |
| 6 | 文件存储 | 本地磁盘 + Nginx 直接服务静态文件 | 无需引入 MinIO/S3，50G 磁盘足够家庭相册使用 |
| 7 | 鉴权方式 | 微信 code2session + JWT | 标准方案；小程序端 wx.login 获取 code，服务端换取 session_key + openid，签发 JWT |
| 8 | 部署方式 | Docker Compose | 一键启动、环境隔离、方便迁移和备份 |
| 9 | 反向代理 | Nginx | 提供 HTTPS 终结、静态文件高效服务、gzip 压缩 |
| 10 | 删除冗余字段 | 移除 `users.family_ids` 数组 | 该字段与 `family_members` 表重复，改用 JOIN 查询替代 |
| 11 | 非结构化数据处理 | JSON TEXT 列 | `edit_history.snapshot_*`、`custom_title_maps.overrides`、`person_notes.remarks` 等只做整体读写的动态结构存为 JSON 列 |
| 12 | Docker 镜像 | 多阶段构建 → scratch 基础镜像 | 纯 Go（无 CGO），最终镜像仅 ~5-15MB |

## 微信小程序自有服务器限制

根据微信官方文档，使用自有服务器作为小程序后端需满足以下条件：

1. **域名要求**：必须使用已备案的域名（不能使用 IP 地址或 localhost）
2. **ICP 备案**：域名必须完成 ICP 备案
3. **HTTPS 强制**：所有网络请求必须走 HTTPS，不支持 HTTP
4. **TLS 版本**：必须支持 TLS 1.2 及以上
5. **证书要求**：必须使用受信任 CA 签发的证书（不支持自签名证书），证书链必须完整
6. **域名配置**：需在微信公众平台 → 开发管理 → 开发设置中配置合法域名
   - request 合法域名（API 请求）
   - uploadFile 合法域名（文件上传）
   - downloadFile 合法域名（文件下载）
7. **并发限制**：wx.request/wx.uploadFile/wx.downloadFile 最大并发 10 个

### 成本预估

| 项目 | 预估成本 |
|------|----------|
| 轻量级云服务器（2C2G/50G） | ~50-100 元/月 |
| 域名 | ~50-80 元/年 |
| ICP 备案 | 免费（需时间） |
| SSL 证书 | 免费（Let's Encrypt） |
| **总计** | **约 55-110 元/月**（对比微信云开发月租套餐节省明显） |
