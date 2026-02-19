# Project Context

## Purpose
亲谱 (FamilyGraph) — A WeChat Mini Program for recording and visualizing family relationships. Users can create family groups, add family members (Persons), define relationships between them, and view an interactive force-directed graph of the family tree. The app supports up to five generations of Chinese kinship titles, photo albums with tagging, a shared/private overlay data model, and guest read-only sharing.

## Tech Stack
- **前端**: WeChat Mini Program (WXML, WXSS, JavaScript ES6+)
- **后端**: WeChat Cloud Development (CloudBase)
  - Cloud Functions (Node.js)
  - Cloud Database (document-oriented, MongoDB-like, 11 collections)
  - Cloud Storage (COS for images)
- **图形渲染**: Canvas 2D — 自定义力导向图布局（~300行），不使用 D3.js/ECharts
- **加密**: AES-256-CBC（person_notes 中的 phone/wechat_id、openid）
- **V1 不使用 TypeScript**

## Project Structure

```
FamilyGraph/
├── miniprogram/                      # 小程序前端
│   ├── app.js                        # 应用入口
│   ├── app.json                      # 全局配置（17 页面 + tabBar）
│   ├── app.wxss                      # 全局样式
│   ├── pages/                        # 17 个页面（每页 4 文件）
│   │   ├── index/                    # 首页（家庭列表 / 空状态）
│   │   ├── family/
│   │   │   ├── create/               # 创建家庭
│   │   │   ├── home/                 # 家庭主页（图谱 + 成员列表）
│   │   │   ├── invite/               # 邀请码 / 二维码
│   │   │   ├── join/                 # 输入邀请码加入
│   │   │   ├── approvals/            # 加入申请审批
│   │   │   └── settings/             # 家庭设置 / 成员管理
│   │   ├── person/
│   │   │   ├── create/               # 添加成员（"他/她是 X 的 Y"，仅共享字段）
│   │   │   ├── detail/               # 成员详情（"基本信息" + "我的备注" 两区域）
│   │   │   ├── edit/                 # 编辑共享字段
│   │   │   └── privacy/              # 我的备注编辑（phone, wechat_id, city 等私人覆盖字段）
│   │   ├── photo/
│   │   │   ├── album/                # 相册网格
│   │   │   ├── viewer/               # 全屏查看
│   │   │   └── tag/                  # 照片标记人物
│   │   ├── user/
│   │   │   └── profile/              # 用户资料 / 家庭列表 / 设置
│   │   ├── share/
│   │   │   └── view/                 # 访客只读视图
│   │   └── history/
│   │       └── index/                # 编辑历史 + 回滚
│   ├── components/                   # 5 个可复用组件
│   │   ├── approval-card/            # 加入申请卡片
│   │   ├── relation-picker/          # 关系类型选择器
│   │   ├── person-card/              # 人物卡片
│   │   ├── photo-tagger/             # 交互式照片标记
│   │   └── family-graph/             # Canvas 图谱渲染
│   ├── utils/                        # 5 个工具模块
│   │   ├── constants.js              # 常量与配置（含 SHARED_FIELDS, PRIVATE_OVERLAY_FIELDS）
│   │   ├── api.js                    # 云函数调用封装
│   │   ├── auth.js                   # 客户端登录状态管理
│   │   ├── forceGraph.js             # 力导向布局算法（~300 行）
│   │   └── imageCompressor.js        # 客户端图片压缩
│   └── static/                       # 静态资源
│       ├── default-male.png
│       ├── default-female.png
│       ├── logo.png
│       └── icons/                    # Tab bar 图标、空状态图标
├── cloudfunctions/                   # 9 个云函数域，每域单入口 action 路由，各自内含 utils/
│   ├── user/                        # login, updateProfile
│   │   ├── index.js
│   │   └── utils/                   # crypto.js, helpers.js
│   ├── family/                      # create, delete, getDetail, generateInviteCode, generateShareLink, getByShareCode
│   │   ├── index.js
│   │   └── utils/                   # helpers.js, constants.js
│   ├── member/                      # applyJoin, reviewJoin, validateInvite, listJoinRequests, leave, changeRole, list
│   │   ├── index.js
│   │   └── utils/                   # helpers.js
│   ├── person/                      # create, update, delete, getDetail, list
│   │   ├── index.js
│   │   └── utils/                   # crypto.js, helpers.js, constants.js
│   ├── relationship/                # create, delete, computeTitle, getGraph
│   │   ├── index.js
│   │   └── utils/                   # helpers.js, constants.js, titleMap.js
│   ├── photo/                       # upload, delete, list, detail, addTag, removeTag
│   │   ├── index.js
│   │   └── utils/                   # helpers.js, constants.js
│   ├── note/                        # upsert, get
│   │   ├── index.js
│   │   └── utils/                   # crypto.js, helpers.js
│   ├── history/                     # list, rollback
│   │   ├── index.js
│   │   └── utils/                   # helpers.js, constants.js
│   └── admin/                       # setStorageUnlimited, cleanup
│       ├── index.js
│       └── utils/                   # helpers.js, constants.js
├── project.config.json               # 微信开发者工具配置
├── project.private.config.json       # 环境特定配置
└── openspec/                         # 项目规格文档
    ├── project.md                    # 本文件
    ├── AGENTS.md                     # OpenSpec 工作流文档
    ├── changes/                      # 变更提案
    └── specs/                        # 已部署的规格
```

## Project Conventions

### Code Style
- JavaScript (ES6+), no TypeScript in V1
- Cloud functions organized by domain: `cloudfunctions/{domain}/index.js` with action routing via `event.action`
- Mini program pages follow standard 4-file structure: `.wxml`, `.wxss`, `.js`, `.json`
- Utility modules in `miniprogram/utils/`
- Reusable UI in `miniprogram/components/`

### Naming Conventions
- **目录**: kebab-case（如 `family-graph/`, `approval-card/`）
- **JS 变量/函数**: camelCase（如 `familyId`, `computeTitle`）
- **JS 常量**: UPPER_SNAKE_CASE（如 `RELATION_TYPES`, `FORMAL_TITLE_MAP`, `SHARED_FIELDS`, `PRIVATE_OVERLAY_FIELDS`）
- **数据库集合**: snake_case（如 `family_members`, `edit_history`）
- **数据库字段**: snake_case（如 `family_id`, `created_at`）
- **云函数目录**: 领域名小写（如 `user`, `family`, `member`），单入口 `index.js` 内通过 `action` 路由

### API Conventions
- 云函数统一返回格式: `{ errno: number, errmsg: string, data: object }`
- `errno = 0` 表示成功
- 错误码按领域分段（如 1xxx 用户相关，2xxx 家庭相关）
- 所有写操作必须通过云函数，客户端不直接写数据库

### Architecture Patterns
- All writes go through cloud functions (no direct client DB writes)
- Cloud functions handle authorization checks internally
- Person data split into shared layer (persons) and private overlay (person_notes per user)
- Private overlay fields only visible to the recording user; no cross-user visibility
- Sensitive data (phone, wechat_id in person_notes, openid) stored AES-encrypted
- Bidirectional relationship edges created atomically
- Edit history with snapshots for rollback (shared fields only; private overlay changes not tracked)

### Testing Strategy
- Manual testing via WeChat DevTools for V1
- Cloud function unit tests where feasible
- Full flow testing: create family → add members → record notes → invite → join → graph → photos
- Performance testing: graph rendering with 50+ nodes + five-generation kinship computation

### Git Workflow
- `main` branch for stable releases
- Feature branches for development
- Commit messages in Chinese or English

## Data Model

### 11 Collections

| 集合 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 微信用户账号 | openid(加密), nickname, avatar_url, family_ids[] |
| `families` | 家庭组 | name, owner_user_id, invite_code, storage_limit_bytes |
| `family_members` | 用户-家庭关联 | user_id, family_id, person_id, role(owner/member/restricted) |
| `persons` | 家庭成员共享字段 | name, gender, birth_year, is_deceased, avatar, bound_user_id, generation |
| `relationships` | 有向关系边 | from_person_id, to_person_id, relation_type, family_id |
| `person_notes` | 每用户私人覆盖层 | user_id, person_id, phone(加密), wechat_id(加密), birth_date, city, occupation, custom_title, remark |
| `photos` | 照片元数据 | person_id, uploader_id, file_id, file_size_bytes |
| `photo_tags` | 照片位置标记 | photo_id, person_id, x, y (百分比 0-1) |
| `edit_history` | 审计日志（仅共享字段） | person_id, editor_id, action, field_changes, snapshot_before |
| `join_requests` | 加入申请 | applicant_user_id, family_id, status, expire_at |
| `share_links` | 访客分享链接 | code, family_id, is_active, expire_at, view_count |

## Domain Context
- Chinese kinship system with five-generation depth (high-great-grandparent to great-great-grandchild)
- Relationship types: FATHER, MOTHER, SON, DAUGHTER, HUSBAND, WIFE, OLDER_BROTHER, YOUNGER_BROTHER, OLDER_SISTER, YOUNGER_SISTER
- Formal titles derived via BFS shortest-path (max depth 5) on relationship graph + lookup table (~150+ entries)
- Person = family member record (may or may not be bound to a User)
- User = WeChat authenticated account (1 User binds to at most 1 Person per family)
- Four roles: Owner, Member, Restricted, Guest (read-only link)
- Person data split into shared layer (objective attributes visible to all) and private overlay (per-user notes visible only to recorder)

### Key Algorithms
- **亲属称谓计算**: BFS 最短路径（最大深度 5）+ FORMAL_TITLE_MAP 查找表，覆盖五代约 150+ 种称谓
- **力导向图布局**: 自定义实现（~300 行），包含斥力、引力、辈分层约束、配偶对齐
- **图片压缩**: 客户端 Canvas 缩放至 1080p + 80% JPEG 质量

## Important Constraints
- WeChat Mini Program package size limits
- Cloud database 20-record batch limit for queries
- No D3.js/ECharts (too large); custom Canvas force-directed layout
- Storage limit: 500MB per family (configurable by developer)
- Photo limit: 20 photos per person
- V1 does not support video uploads
- Invite codes expire after 7 days; join requests expire after 48 hours
- Edit history retained for 90 days or 500 records max (shared fields only)
- Already-bound Persons cannot be re-bound by another User
- New users joining must select an existing (unbound) Person; cannot join as "not in family"
- Canvas force-directed simulation capped at 100 iterations to avoid performance issues
- COS signed URLs 2-hour expiry for image access
- Subscribe messages (not template messages, which WeChat has deprecated)
- Single-region cloud deployment (acceptable for V1 scale)
- Private overlay fields (phone, wechat_id, city, etc.) are per-user and not shared between users

## External Dependencies
- WeChat Open Platform (login, openid, subscribe messages)
- WeChat Cloud Development environment (database, storage, cloud functions)
- COS temporary signed URLs for image access (2-hour expiry)
- Hardcoded `ENCRYPTION_KEY` in `cloudfunctions/*/utils/crypto.js` (AES 密钥，已内置)
- Timed trigger: daily 03:00 cleanup task (expired invite codes, join requests, edit history)
