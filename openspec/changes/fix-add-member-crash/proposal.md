# Change: 修复添加成员按钮导致卡死

## Why
点击家庭主页的 "+" 按钮后应用卡死。根因：`onAddMember()` 导航到 `person/create` 页面时只传了 `family_id`，缺少必需的 `reference_person_id` 参数。`person/create` 的 `onLoad` 检测到参数缺失后调用 `api.showError()` + `wx.navigateBack()`，导致页面闪烁后卡死（导航栈异常）。

附带修复两个控制台告警：
1. `wx.getSystemInfoSync` 已废弃（`family-graph/index.js:80`）
2. 组件 WXSS 中使用了标签选择器 `canvas`（`family-graph/index.wxss:2`）

## What Changes
- **核心修复**: 重写 `onAddMember()` 逻辑——先弹出成员选择列表让用户选择"X 是谁的什么关系"，再带上 `reference_person_id` 导航到创建页面；如果家庭还没有任何成员，走"添加第一位成员"的特殊流程（不需要 reference）
- **修复 person/create**: 当 `reference_person_id` 缺失时支持"添加第一位成员"模式（无需选择关系参照人）
- **修复废弃 API**: 将 `wx.getSystemInfoSync()` 替换为 `wx.getWindowInfo()`
- **修复 WXSS 告警**: 将标签选择器 `canvas` 改为类选择器

## Impact
- Affected specs: family-home (新增)
- Affected code:
  - `miniprogram/pages/family/home/index.js` — 重写 onAddMember
  - `miniprogram/pages/family/home/index.wxml` — 添加成员选择 action-sheet
  - `miniprogram/pages/family/home/index.wxss` — action-sheet 样式
  - `miniprogram/pages/person/create/index.js` — 支持无 reference 的首位成员模式
  - `miniprogram/pages/person/create/index.wxml` — 条件隐藏关系参照人区域
  - `miniprogram/components/family-graph/index.js` — 替换废弃 API
  - `miniprogram/components/family-graph/index.wxss` — 修复选择器
