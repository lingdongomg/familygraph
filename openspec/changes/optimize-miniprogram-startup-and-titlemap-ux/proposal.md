# Change: 优化小程序启动性能与称呼表编辑体验

## Why
小程序代码检测发现三类问题：(1) 未启用按需注入，导致启动时所有页面和组件的 JS 代码全量注入执行，影响启动耗时和内存占用；(2) `person-card` 组件在 `person/detail/index.json` 中声明但 wxml 中未实际使用，属于无用组件引用；(3) 自定义称呼表编辑时需要手动输入英文路径键（如 `MOTHER>FATHER|male`），操作门槛高且容易出错。

## What Changes
- **启用 `lazyCodeLoading`**: 在 `app.json` 中添加 `"lazyCodeLoading": "requiredComponents"` 开启组件按需注入
- **移除无用组件声明**: 从 `pages/person/detail/index.json` 中移除未使用的 `person-card` 组件引用
- **重构称呼表路径键输入**: 将手动输入英文路径键改为中文选项式交互——用户通过多级下拉选择关系步骤（如"妈妈"→"爸爸"），再选择性别，最后输入自定义称谓（如"阿公"），系统自动拼接为内部路径键

## Impact
- Affected specs: `miniprogram-performance`（新增）, `kinship-titles`（修改）
- Affected code:
  - `miniprogram/app.json` — 添加 lazyCodeLoading
  - `miniprogram/pages/person/detail/index.json` — 移除无用组件声明
  - `miniprogram/pages/family/titlemap/index.wxml` — 重构路径键输入为选项式 UI
  - `miniprogram/pages/family/titlemap/index.js` — 新增选项式路径构建逻辑
  - `miniprogram/pages/family/titlemap/index.wxss` — 新增选项式 UI 样式
