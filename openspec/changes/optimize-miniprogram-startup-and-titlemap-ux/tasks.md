## 1. 启用按需注入
- [x] 1.1 在 `miniprogram/app.json` 添加 `"lazyCodeLoading": "requiredComponents"`
- [x] 1.2 验证所有页面 JSON 中 `usingComponents` 声明与 wxml 模板中实际使用的组件一致

## 2. 清理无用组件声明
- [x] 2.1 从 `miniprogram/pages/person/detail/index.json` 的 `usingComponents` 中移除 `person-card`

## 3. 重构称呼表路径键输入为选项式 UI
- [x] 3.1 在 `titlemap/index.js` 中添加 `RELATION_OPTIONS` 中英文映射常量和性别推断辅助函数
- [x] 3.2 添加多级关系选择器数据状态（`pathSteps` 数组、当前性别、称谓输入）
- [x] 3.3 实现 `onAddPathStep` / `onRemovePathStep` / `onPathStepChange` / `onGenderChange` 事件处理
- [x] 3.4 实现 `buildPathKey()` 方法：将选项式数据转换为内部路径键格式
- [x] 3.5 实现 `parsePathKeyToDisplay()` 方法：将已有路径键反向映射为中文可读格式

## 4. 更新 titlemap 页面模板
- [x] 4.1 替换路径键文本输入为多级 picker 选择器 + 性别选择按钮 + 称谓输入框
- [x] 4.2 更新已有覆盖项列表：用中文可读格式替代原始路径键展示
- [x] 4.3 添加"+"按钮支持增加下一级关系（最多 5 级）

## 5. 更新样式
- [x] 5.1 在 `titlemap/index.wxss` 中添加路径选择器相关样式（步骤标签、picker、性别切换按钮等）

## 6. 验证
- [x] 6.1 测试按需注入开启后所有页面正常加载
- [x] 6.2 测试称呼表新建：通过选项式 UI 添加覆盖项，验证生成的路径键正确
- [x] 6.3 测试称呼表编辑：已有覆盖项正确反向解析为中文展示
- [x] 6.4 测试边界情况：5 级最深路径、单级路径、重复路径键覆盖
