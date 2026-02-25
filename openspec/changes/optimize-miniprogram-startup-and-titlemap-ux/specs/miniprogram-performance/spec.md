## ADDED Requirements

### Requirement: Lazy Code Loading
小程序 MUST 在 `app.json` 中配置 `"lazyCodeLoading": "requiredComponents"` 以启用组件按需注入，仅在访问页面时注入该页面所需的自定义组件和页面代码。

#### Scenario: 按需注入配置生效
- **WHEN** 小程序启动并加载首页
- **THEN** 仅首页声明的组件代码被注入执行，其他未访问页面的组件代码不被加载

### Requirement: Clean Component Declarations
所有页面 JSON 中 `usingComponents` 声明的组件 MUST 在对应 wxml 模板中实际使用。未使用的组件声明 MUST 被移除，以避免按需注入模式下加载不必要的代码。

#### Scenario: 移除 person-card 无用声明
- **WHEN** 审查 `pages/person/detail/index.json`
- **THEN** `usingComponents` 中不包含未在 `index.wxml` 中使用的 `person-card` 组件
