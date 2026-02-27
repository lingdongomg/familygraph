## Context

照片标记流程：
1. 用户在 tag 页面点击照片 → `photo-tagger` 组件捕获 tap 事件，计算百分比坐标 (0-100)，触发 `tagplace`
2. tag 页面收到坐标，弹出人物选择器
3. 用户选择人物 → `addTag()` 将坐标除以 100 (→ 0-1) 后调用 `photo/addTag` 云函数
4. 云函数直接存入 DB：`{ x: 0-1, y: 0-1 }`
5. 查看器页面从 `photo/detail` 获取 tags，在 WXML 中用 `left:{{item.x}}%;top:{{item.y}}%;` 渲染

坐标流中有两处断裂：步骤 1 取不到坐标（`e.detail.x` 无效），步骤 5 单位错配（DB 的 0-1 直接当 CSS 百分比用）。

## Goals / Non-Goals

Goals:
- 标记点出现在用户实际点击的位置
- 保存的标记在重新查看时位置正确
- 保持 DB 中 0-1 的存储格式不变

Non-Goals:
- 不修改云函数
- 不修改 DB schema
- 不迁移已有的（错误的）标记数据

## Decisions

**坐标获取**：使用 `e.touches[0].clientX/clientY`。WeChat 的 `tap` 事件保证 `touches` 数组非空。`changedTouches` 也可用，但 `touches` 更直观。

**坐标单位统一策略**：
- 组件内部 (photo-tagger)：0-100 百分比（与 CSS `%` 直接对应）
- API / DB：0-1 小数
- 跨越点：存入时 `/100`，读取后 `*100`
- viewer 页面：在 WXML 中用 `item.x * 100` 转换

## Risks / Trade-offs

- 已有的错误标记数据（x=0, y=0）不会被修复，都会显示在左上角。这是可接受的，因为这些标记本身就是错的。
