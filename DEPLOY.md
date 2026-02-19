# 部署指南

本文档描述如何从零部署亲谱（FamilyGraph）微信小程序。

## 前置条件

| 项目 | 要求 |
|------|------|
| 微信开发者工具 | 最新稳定版（[下载地址](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)） |
| Node.js | >= 12.x（云函数运行时） |
| 微信小程序账号 | 已注册并完成认证（[注册地址](https://mp.weixin.qq.com/)） |
| 云开发 | 已开通（在微信开发者工具中开通） |

## 第一步：获取小程序 AppID

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入 **开发 → 开发管理 → 开发设置**
3. 记录 **AppID（小程序ID）**

## 第二步：导入项目

1. 打开微信开发者工具
2. 选择 **导入项目**
3. 项目目录选择本仓库根目录 `FamilyGraph/`
4. 填写你的 AppID
5. 后端服务选择 **微信云开发**
6. 点击 **确定**

导入后，开发者工具会自动识别 `project.config.json` 中的配置：
- `miniprogramRoot: "miniprogram/"` — 小程序前端代码
- `cloudfunctionRoot: "cloudfunctions/"` — 云函数代码

## 第三步：开通并初始化云开发环境

1. 在开发者工具顶部点击 **云开发** 按钮
2. 如果尚未开通，按提示开通云开发
3. 创建一个云开发环境（记录环境 ID，例如 `familygraph-1g2h3j`）
4. 在 `miniprogram/app.js` 中确认云环境初始化代码：

```javascript
wx.cloud.init({
  traceUser: true
  // 如需指定环境 ID，添加: env: '你的环境ID'
})
```

> 如果你有多个云开发环境，需要在 `wx.cloud.init` 中显式指定 `env` 参数。

## 第四步：创建数据库集合

在云开发控制台 → **数据库** 中，手动创建以下 **11 个集合**：

```
users
families
family_members
persons
relationships
person_notes
photos
photo_tags
edit_history
join_requests
share_links
```

操作步骤：
1. 点击 **添加集合**
2. 输入集合名称
3. 重复创建全部 11 个

### 配置数据库索引

为提升查询性能，建议为以下字段创建索引：

| 集合 | 索引字段 | 索引类型 |
|------|----------|----------|
| `users` | `openid_hash` | 唯一 |
| `families` | `invite_code` | 普通 |
| `family_members` | `family_id, user_id` | 组合 |
| `persons` | `family_id` | 普通 |
| `persons` | `bound_user_id` | 普通 |
| `relationships` | `family_id` | 普通 |
| `relationships` | `from_id, to_id` | 组合 |
| `person_notes` | `person_id, user_id` | 组合 |
| `photos` | `family_id, person_id` | 组合 |
| `photo_tags` | `photo_id` | 普通 |
| `edit_history` | `family_id, created_at` | 组合 |
| `join_requests` | `family_id` | 普通 |
| `share_links` | `code` | 唯一 |

操作步骤：
1. 在云开发控制台中选择集合
2. 点击 **索引管理**
3. 添加上述索引

### 配置数据库权限

将所有集合的权限规则设置为 **仅创建者可读写**（默认值即可）。

> 所有数据访问均通过云函数进行，客户端不直接读写数据库。云函数使用管理员权限访问数据库，不受前端权限规则限制。

## 第五步：~~设置环境变量~~（已内置，无需操作）

加密密钥已硬编码在云函数代码中（`cloudfunctions/*/utils/crypto.js`），无需在云开发控制台手动配置环境变量。

> **重要**：密钥一旦有数据写入后不可更改，否则已加密数据将无法解密。如需自定义密钥，修改各云函数 `utils/crypto.js` 中的 `HARDCODED_KEY` 常量（须保持所有副本一致）。

## 第六步：部署云函数

### 安装依赖

每个云函数目录都需要安装 npm 依赖。在每个云函数目录中执行：

```bash
cd cloudfunctions/user && npm install
cd ../family && npm install
cd ../member && npm install
cd ../person && npm install
cd ../relationship && npm install
cd ../photo && npm install
cd ../note && npm install
cd ../history && npm install
cd ../admin && npm install
```

或者使用一行命令批量安装：

```bash
for dir in user family member person relationship photo note history admin; do
  (cd cloudfunctions/$dir && npm install)
done
```

### 上传云函数

**方式 1：通过开发者工具（推荐）**

1. 在开发者工具左侧文件树中找到 `cloudfunctions/` 目录
2. 右键点击每个云函数目录（user、family、member 等）
3. 选择 **上传并部署：云端安装依赖**
4. 对全部 **9 个** 云函数重复此操作

需要上传的云函数：
- `user`
- `family`
- `member`
- `person`
- `relationship`
- `photo`
- `note`
- `history`
- `admin`

> 每个云函数目录下已包含自己的 `utils/` 子目录（crypto.js、helpers.js、constants.js、titleMap.js 按需分发）。部署时只需逐个上传 9 个云函数目录即可，无需额外操作。

**方式 2：通过命令行**

如果你安装了 `@cloudbase/cli`：

```bash
npm install -g @cloudbase/cli
tcb login
# 对每个云函数执行部署
for fn in user family member person relationship photo note history admin; do
  tcb fn deploy $fn --env 你的环境ID
done
```

### 验证部署

部署完成后，在云开发控制台 → **云函数** 中确认 9 个云函数均已显示。

## 第七步：配置定时触发器

`admin` 云函数的 `cleanup` action 需要每日定时执行，清理过期数据。

1. 在云开发控制台 → **云函数** → 选择 `admin`
2. 点击 **触发器** 标签
3. 添加定时触发器：

| 配置项 | 值 |
|--------|----|
| 触发器名称 | `dailyCleanup` |
| 触发方式 | 定时触发 |
| Cron 表达式 | `0 0 3 * * * *` |
| 附加参数 | `{"action": "cleanup"}` |

> 这将在每天凌晨 03:00 自动运行清理任务，处理：
> - 过期邀请码（7 天）→ 标记为失效
> - 过期加入申请（48 小时）→ 标记为过期
> - 过期分享链接（7 天）→ 标记为失效
> - 过旧编辑历史（90 天）→ 删除

## 第八步：配置订阅消息模板（可选）

如果需要推送通知（加入申请和审批结果），需配置订阅消息：

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入 **功能 → 订阅消息**
3. 选用或创建以下模板：

| 模板用途 | 建议关键词 |
|----------|------------|
| 加入申请通知 | 申请人、家庭名称、申请时间 |
| 审批结果通知 | 审批结果、家庭名称、处理时间 |

4. 记录模板 ID，在对应云函数中配置

> V1 版本中，订阅消息为可选功能。即使未配置，应用核心功能不受影响。

## 第九步：预览与测试

### 本地预览

1. 在开发者工具中点击 **编译**
2. 在模拟器中测试以下流程：
   - 打开小程序 → 自动登录
   - 创建家庭 → 填写家庭名和个人信息
   - 添加成员 → 选择关系类型
   - 查看图谱 → 验证力导向布局
   - 生成邀请码 → 复制分享

### 真机预览

1. 在开发者工具中点击 **预览**
2. 用手机微信扫描二维码
3. 在真机上测试触摸交互（拖拽、缩放图谱）

### 完整功能测试清单

- [ ] 创建家庭 → 验证 families、persons、family_members 集合有数据
- [ ] 添加成员 → 验证关系边（正向+反向）已创建
- [ ] 记录私人备注 → 验证 person_notes 中 phone/wechat_id 已加密
- [ ] 生成邀请码 → 使用另一账号加入
- [ ] 审批加入申请 → 验证 Person 绑定
- [ ] 查看图谱 → 验证布局和交互
- [ ] 上传照片 → 验证压缩和存储配额更新
- [ ] 生成分享链接 → 验证访客视图仅显示共享字段
- [ ] 编辑历史 → 验证回滚功能
- [ ] 等待定时任务 → 验证过期数据清理

## 第十步：提交审核

1. 在开发者工具中点击 **上传**
2. 填写版本号和备注
3. 登录微信公众平台 → **版本管理**
4. 选择上传的版本 → **提交审核**
5. 审核通过后 → **发布**

### 审核注意事项

- 确保小程序描述和截图与实际功能一致
- 确保隐私协议已配置（涉及用户昵称、头像、照片上传）
- 确保 AppID 已完成微信认证

## 故障排查

### 云函数调用失败

```
错误: cloud.callFunction 失败
```

1. 确认云函数已部署（云开发控制台 → 云函数列表）
2. 确认环境 ID 正确（`app.js` 中的 `wx.cloud.init`）
3. 查看云函数日志（云开发控制台 → 云函数 → 日志）

### 加密/解密失败

加密密钥已内置在代码中。如果遇到加密相关错误，确认所有云函数的 `utils/crypto.js` 中 `HARDCODED_KEY` 值一致，并重新部署。

### 数据库查询无结果

1. 确认 11 个集合已全部创建
2. 确认集合名称拼写正确（全小写，下划线分隔）
3. 检查数据库权限设置

### utils 模块引用失败

```
错误: Cannot find module './utils/xxx'
```

确认云函数目录下存在 `utils/` 子目录且包含所需文件。每个云函数已内置所需的 utils 模块副本，使用 `require('./utils/xxx')` 引用。如果缺失，从其他云函数目录复制对应文件即可。

## 环境配置一览

| 配置项 | 位置 | 说明 |
|--------|------|------|
| AppID | `project.config.json` → `appid` | 微信小程序 ID |
| 云环境 ID | `miniprogram/app.js` → `wx.cloud.init` | 云开发环境标识 |
| 加密密钥 | `cloudfunctions/*/utils/crypto.js` → `HARDCODED_KEY` | AES-256 加密密钥（已内置） |
| 定时触发器 | `admin` 云函数触发器配置 | Cron: `0 0 3 * * * *` |
| 订阅消息模板 | 微信公众平台 → 订阅消息 | 可选，用于推送通知 |
