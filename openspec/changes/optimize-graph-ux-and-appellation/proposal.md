# Change: 优化图谱交互、移除已故字段、备注改为条目式、支持自定义称呼表

## Why

当前图谱功能存在以下可用性和体验问题：
1. **称呼标签可能异常** — 用户反馈：创建"我的父亲"后，图谱中父亲节点下方显示"儿子"而非"父亲"，需排查 BFS 称谓计算或 edge 方向逻辑。
2. **图谱点击区域过小** — 只有点击节点下方的文字标签才能进入编辑，点击头像（圆形节点本身）无响应，不符合用户直觉。
3. **已故字段不合适** — 在族谱场景中 `is_deceased` 字段显得突兀，用户如有需要可通过备注自行记录。
4. **备注为单一文本框** — 当前备注为一整段 textarea，不利于逐条添加信息。改为条目式（类似便签列表），用户可想到一条加一条。
5. **称呼表不可定制** — 各地区亲属称谓差异大（如外公/阿公），当前系统只有固定的 `FORMAL_TITLE_MAP`。需允许用户编辑称呼表并可分享给家庭其他成员使用。

## What Changes

### 1. 修复图谱称呼标签（Bug 排查）
- 排查 `relationship/getGraph` 中 BFS 称谓计算的 edge 遍历和 `REVERSE_RELATION` 反转逻辑
- 排查 `person/create` 中正向/反向边的存储语义是否与 BFS 假设一致
- 修复确认后的 bug，确保所有直系亲属称谓正确显示

### 2. 图谱节点点击区域扩大
- 将点击判定区域从仅文字标签改为整个节点（圆形头像 + 标签区域）
- 点击节点后直接跳转到成员详情/编辑页

### 3. 移除已故字段
- **BREAKING**: 从创建/编辑/详情/分享页面移除 `is_deceased` 开关和标签
- 从 `SHARED_FIELDS`、`GUEST_VISIBLE_FIELDS` 中移除 `is_deceased`
- 云函数 `person/create` 和 `person/update` 不再处理该字段
- 已有数据库中的 `is_deceased` 字段保留但不再读取显示

### 4. 备注改为条目式
- 将 `person_notes.remark`（单一文本）改为 `person_notes.remarks`（字符串数组）
- 前端改为条目列表 UI，支持逐条添加、删除
- 每条备注限制 200 字，最多 20 条
- 兼容旧数据：如果存在旧 `remark` 字符串，首次加载时迁移为单条数组

### 5. 自定义称呼表
- 新增 `custom_title_maps` 集合，存储用户自定义的称谓覆盖
- 用户可在设置中编辑关系路径对应的称谓（如 `MOTHER>FATHER|male` → "阿公"）
- 自定义称谓在展示时优先于系统默认的 `FORMAL_TITLE_MAP`
- 用户可将自己的称呼表分享给家庭内其他成员使用（非强制）
- 其他成员可选择"使用某人的称呼表"或保持系统默认

## Impact

- Affected specs: `family-graph-visualization`, `person-management`, `kinship-titles`
- Affected code:
  - `miniprogram/components/family-graph/index.js` — 点击判定、标签渲染
  - `miniprogram/pages/person/create/index.wxml` — 移除已故开关
  - `miniprogram/pages/person/edit/index.wxml` — 移除已故开关
  - `miniprogram/pages/person/detail/index.wxml` — 移除已故标签和信息行
  - `miniprogram/pages/person/privacy/index.wxml` + `.js` — 备注 UI 重构
  - `miniprogram/pages/share/view/index.wxml` — 移除已故标签
  - `miniprogram/utils/constants.js` — 字段定义调整
  - `cloudfunctions/relationship/index.js` — BFS 修复 + 自定义称呼表查询
  - `cloudfunctions/relationship/utils/constants.js` — 字段定义调整
  - `cloudfunctions/person/index.js` — 移除 is_deceased 处理
  - `cloudfunctions/note/index.js` — 备注字段结构变更
  - 新增: 自定义称呼表相关页面和云函数
