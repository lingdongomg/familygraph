## ADDED Requirements

### Requirement: No ES6+ Spread Syntax in Mini Program Frontend
小程序前端 JS 文件 MUST NOT 使用 ES6 展开语法（`[...array]`、`{...obj}`），因为微信小程序运行时不原生支持且 babel polyfill 不可用。MUST 使用 `array.slice()`、`Array.prototype.concat()` 或 `Object.assign()` 等 ES5 兼容替代方案。

#### Scenario: titlemap 页面无 Babel 报错
- **WHEN** 用户访问称呼表管理页面
- **THEN** 页面正常加载，无 `@babel/runtime/helpers/arrayWithoutHoles.js is not defined` 错误

### Requirement: Clear Relationship Semantics in Member Creation
创建成员页面的关系选择 UI MUST 清晰表达关系语义，避免用户混淆方向。

选中关系类型后 MUST 显示确认性预览文案，明确"新成员是 {参照人} 的 {关系}"。

#### Scenario: 用户选择父亲关系时看到确认文案
- **WHEN** 参照人为"张三"，用户选择关系类型"父亲"
- **THEN** 显示确认文案"即：新成员是张三的父亲"

### Requirement: Enhanced Self Node Visual Identity
图谱中当前用户绑定的节点 MUST 具有明显区别于其他节点的视觉标识，包括金色描边（4px）和外发光效果，使用户一眼即可定位自己在图谱中的位置。

#### Scenario: 自我节点有外发光效果
- **WHEN** 图谱渲染包含当前用户绑定的人物
- **THEN** 该节点显示金色描边（4px）和半透明金色外发光圆环
