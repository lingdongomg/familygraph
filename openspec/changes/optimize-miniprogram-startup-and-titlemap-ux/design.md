## Context
小程序代码体检工具发现启动性能问题和无用组件声明；同时用户反馈称呼表编辑时需要输入英文路径键（如 `MOTHER>FATHER|male`），既不直观也容易出错。

## Goals / Non-Goals
- Goals:
  - 启用按需注入减少启动耗时和运行时内存
  - 清理无用组件声明，确保按需注入发挥最大效果
  - 让非技术用户能够轻松配置自定义称谓，无需了解内部路径格式
- Non-Goals:
  - 不重构 `person-card` 组件本身（它虽然只被 detail 页声明但未使用，仅移除声明；组件文件保留以备后续使用）
  - 不改变后端 `titlemap` 云函数的 overrides 存储格式（仍使用 `RELATION>RELATION|gender` 键）

## Decisions

### 1. 按需注入配置
- Decision: 在 `app.json` 顶层添加 `"lazyCodeLoading": "requiredComponents"`
- Rationale: 微信基础库 2.11.1+ 原生支持，无代码侵入，项目未使用插件包所以无兼容问题

### 2. 无用组件声明清理
- Decision: 从 `pages/person/detail/index.json` 的 `usingComponents` 中移除 `person-card`
- Rationale: 该组件在 wxml 模板中未被引用；启用按需注入后无用声明会导致不必要的代码加载

### 3. 称呼表路径键选项化设计
- Decision: 将单个路径键文本输入替换为多级 picker 选择器 + 性别选择 + 称谓文本输入
- UI 交互流程：
  1. 用户点击"添加覆盖项"
  2. 显示关系步骤选择区：第一级 picker 选择关系（妈妈/爸爸/儿子/女儿/丈夫/妻子/哥哥/弟弟/姐姐/妹妹）
  3. 可点击"+"继续添加下一级关系（最多支持 5 级，与 BFS 深度一致）
  4. 性别自动从最后一级关系推断，但也可手动切换
  5. 输入自定义称谓文本
  6. 点击"添加"按钮，系统自动将中文选项映射为内部路径键（如 妈妈→爸爸 映射为 `MOTHER>FATHER|male`）
- Alternatives considered:
  - 树形选择器（一次性展开所有可能路径）→ 条目过多（150+），体验差
  - 全部使用中文键存储 → 需要改后端和迁移已有数据，代价过大
- 中英文映射常量表放在前端 `titlemap/index.js` 中，格式：
  ```javascript
  const RELATION_OPTIONS = [
    { label: '爸爸', value: 'FATHER' },
    { label: '妈妈', value: 'MOTHER' },
    { label: '儿子', value: 'SON' },
    { label: '女儿', value: 'DAUGHTER' },
    { label: '丈夫', value: 'HUSBAND' },
    { label: '妻子', value: 'WIFE' },
    { label: '哥哥', value: 'OLDER_BROTHER' },
    { label: '弟弟', value: 'YOUNGER_BROTHER' },
    { label: '姐姐', value: 'OLDER_SISTER' },
    { label: '妹妹', value: 'YOUNGER_SISTER' }
  ]
  ```
- 性别推断逻辑：FATHER/SON/HUSBAND/OLDER_BROTHER/YOUNGER_BROTHER → male；MOTHER/DAUGHTER/WIFE/OLDER_SISTER/YOUNGER_SISTER → female

### 4. 已有覆盖项的展示
- Decision: 已保存的路径键在展示时反向映射为中文可读格式（如 `MOTHER>FATHER|male` 显示为"妈妈 → 爸爸 (男)"）
- Rationale: 保持编辑和查看体验一致

## Risks / Trade-offs
- 启用 `lazyCodeLoading` 后需确认所有页面组件声明正确，未声明的组件不会被加载 → 已审计所有页面 JSON，声明与使用一致（除已计划移除的 person-card）
- 多级 picker 增加了 titlemap 页面的代码量 → 但 UX 改善显著，非技术用户不再需要了解内部格式
- 最多 5 级关系选择器可能在少数极端情况下仍不够 → 保留一个"高级模式"切换可直接输入路径键作为 fallback

## Open Questions
- 无
