# 亲谱 (FamilyGraph)

一款帮助中国家庭记录、可视化和分享家庭关系的微信小程序。

## 功能概览

- **家庭管理** — 创建家庭组，通过邀请码邀请成员加入，支持角色权限控制（Owner / Member / Restricted）
- **成员管理** — 记录家庭成员信息，数据分为共享层（所有人可见）和私人备注层（仅记录者可见）
- **关系图谱** — 自定义 Canvas 力导向布局，交互式展示家庭成员间的关系网络
- **亲属称谓** — 基于 BFS 最短路径算法，自动计算五代以内的中国传统亲属称谓（约 150+ 种）
- **照片相册** — 按人物管理照片，支持照片标记和客户端 1080p 压缩
- **编辑历史** — 共享字段变更审计日志，Owner 可回滚到历史状态
- **分享功能** — 生成访客只读链接，展示家庭图谱和共享信息

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 微信小程序（WXML / WXSS / JavaScript ES6+） |
| 后端 | 微信云开发 CloudBase（云函数 Node.js） |
| 数据库 | 云数据库（文档型，11 个集合） |
| 存储 | 云存储 COS（照片、头像、缩略图） |
| 图形渲染 | Canvas 2D 自定义力导向布局（~300 行，无第三方依赖） |
| 加密 | AES-256-CBC（手机号、微信号、openid） |

## 项目结构

```
FamilyGraph/
├── miniprogram/                     # 小程序前端
│   ├── app.js / app.json / app.wxss # 应用入口与全局配置
│   ├── pages/                       # 17 个页面
│   │   ├── index/                   #   首页（家庭列表）
│   │   ├── family/                  #   家庭相关（创建/主页/邀请/加入/审批/设置）
│   │   ├── person/                  #   成员相关（创建/详情/编辑/备注）
│   │   ├── photo/                   #   照片相关（相册/查看/标记）
│   │   ├── user/profile/            #   用户资料
│   │   ├── share/view/              #   访客只读视图
│   │   └── history/index/           #   编辑历史与回滚
│   ├── components/                  # 5 个组件
│   │   ├── family-graph/            #   Canvas 图谱渲染
│   │   ├── person-card/             #   人物卡片
│   │   ├── relation-picker/         #   关系类型选择器
│   │   ├── approval-card/           #   审批卡片
│   │   └── photo-tagger/            #   照片标记
│   ├── utils/                       # 工具模块
│   │   ├── api.js                   #   云函数调用封装
│   │   ├── auth.js                  #   登录状态管理
│   │   ├── constants.js             #   常量定义
│   │   ├── forceGraph.js            #   力导向布局算法
│   │   ├── imageCompressor.js       #   图片压缩
│   │   └── titleMap.js              #   亲属称谓映射（客户端副本）
│   └── static/                      # 静态资源（图标、默认头像）
├── cloudfunctions/                  # 云函数（9 个域 + 共享工具）
│   ├── user/                        #   用户认证
│   ├── family/                      #   家庭管理
│   ├── member/                      #   成员管理
│   ├── person/                      #   人物增删改查
│   ├── relationship/                #   关系与称谓
│   ├── photo/                       #   照片管理
│   ├── note/                        #   私人备注
│   ├── history/                     #   编辑历史
│   ├── admin/                       #   管理与定时任务
│   └── utils/                       #   共享工具（加密/常量/辅助/称谓表）
├── project.config.json              # 微信开发者工具配置
└── openspec/                        # 项目规格文档
```

## 数据模型

### 数据分层

```
┌──────────────────────────────────────────┐
│ Person 卡片                               │
├──────────────┬───────────────────────────┤
│ 共享层        │ 私人备注层                 │
│ (persons)    │ (person_notes, 每用户一份) │
├──────────────┼───────────────────────────┤
│ 姓名          │ 手机号 (AES 加密)          │
│ 性别          │ 微信号 (AES 加密)          │
│ 出生年份      │ 完整出生日期                │
│ 是否已故      │ 城市/地址                   │
│ 头像          │ 职业                       │
│ 辈分          │ 自定义称呼                  │
│              │ 备注                        │
├──────────────┼───────────────────────────┤
│ 全体成员可见   │ 仅记录者自己可见             │
└──────────────┴───────────────────────────┘
```

### 数据库集合（11 个）

| 集合 | 说明 |
|------|------|
| `users` | 微信用户账号（openid 加密存储） |
| `families` | 家庭组（邀请码、存储配额） |
| `family_members` | 用户-家庭关联（角色: owner/member/restricted） |
| `persons` | 成员共享字段 |
| `relationships` | 有向关系边（10 种类型） |
| `person_notes` | 每用户私人备注（敏感字段 AES 加密） |
| `photos` | 照片元数据 |
| `photo_tags` | 照片位置标记 |
| `edit_history` | 编辑审计日志（仅共享字段） |
| `join_requests` | 家庭加入申请 |
| `share_links` | 访客分享链接 |

## 云函数 API

所有云函数采用统一路由模式，客户端通过 `domain/action` 调用：

```javascript
// 客户端调用示例
const result = await api.callFunction('person/getDetail', {
  person_id: 'xxx',
  family_id: 'xxx'
})
```

### API 列表

| 域 | Action | 说明 | 权限 |
|----|--------|------|------|
| **user** | `login` | 微信登录 | 所有用户 |
| | `updateProfile` | 更新昵称/头像 | 已登录 |
| **family** | `create` | 创建家庭 | 已登录 |
| | `delete` | 删除家庭（级联） | Owner |
| | `getDetail` | 获取家庭详情 | 成员 |
| | `generateInviteCode` | 生成邀请码 | Owner/Member |
| | `generateShareLink` | 生成分享链接 | 成员 |
| | `getByShareCode` | 通过分享码查看 | 公开 |
| **member** | `applyJoin` | 申请加入家庭 | 已登录 |
| | `reviewJoin` | 审批加入申请 | Owner/Member |
| | `validateInvite` | 验证邀请码 | 已登录 |
| | `listJoinRequests` | 查看申请列表 | Owner/Member |
| | `leave` | 退出家庭 | Member/Restricted |
| | `changeRole` | 修改成员角色 | Owner |
| | `list` | 成员列表 | 成员 |
| **person** | `create` | 创建成员 | Owner/Member |
| | `update` | 更新共享字段 | Owner/Member（Restricted 仅限自己） |
| | `delete` | 删除成员 | Owner |
| | `getDetail` | 获取详情（共享 + 私人合并） | 成员 |
| | `list` | 成员列表 | 成员 |
| **relationship** | `create` | 创建关系（双向） | Owner/Member |
| | `delete` | 删除关系（双向） | Owner/Member |
| | `computeTitle` | 计算亲属称谓 | 成员 |
| | `getGraph` | 获取图谱数据 | 成员 |
| **note** | `upsert` | 创建/更新私人备注 | 成员 |
| | `get` | 获取私人备注 | 成员 |
| **photo** | `upload` | 上传照片 | Owner/Member（Restricted 仅限自己） |
| | `delete` | 删除照片 | 上传者/Owner |
| | `list` | 照片列表 | 成员 |
| | `detail` | 照片详情 | 成员 |
| | `addTag` | 添加标记 | 成员 |
| | `removeTag` | 移除标记 | 标记者/Owner |
| **history** | `list` | 编辑历史 | Owner |
| | `rollback` | 回滚操作 | Owner |
| **admin** | `cleanup` | 定时清理 | 定时触发器 |
| | `setStorageUnlimited` | 解锁存储限制 | 开发者 |

## 部署指南

详见 [DEPLOY.md](./DEPLOY.md)。

## 业务限制

| 项目 | 限制值 |
|------|--------|
| 每家庭存储配额 | 500 MB（可由开发者解锁） |
| 每人照片上限 | 20 张 |
| 邀请码有效期 | 7 天 |
| 分享链接有效期 | 7 天 |
| 加入申请有效期 | 48 小时 |
| 编辑历史保留 | 90 天 或 500 条 |
| 亲属称谓深度 | 5 代（高祖辈 ↔ 玄孙辈） |
| 图谱布局迭代 | 最多 100 次 |
| 图片压缩 | 最长边 1080px，JPEG 80% |

## License

私有项目，仅供学习使用。
