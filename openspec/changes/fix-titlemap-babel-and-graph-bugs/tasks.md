## 1. 修复称呼表 Babel 运行时错误
- [x] 1.1 将 `titlemap/index.js` 中所有 `[...this.data.pathSteps]` 替换为 `this.data.pathSteps.slice()`
- [x] 1.2 将 `[...this.data.editorOverrides]` 替换为 `this.data.editorOverrides.slice()`
- [x] 1.3 将 `{...m, }` 对象展开替换为 `Object.assign({}, m, { })`
- [x] 1.4 全局排查 miniprogram 目录下其他 JS 文件中的展开语法——发现并修复了 `privacy/index.js` 中 2 处

## 2. 改善创建成员关系选择 UI
- [x] 2.1 修改 `person/create/index.wxml` 中提示语，从"他/她是 {name} 的..."改为"新成员是 {name} 的..."
- [x] 2.2 在关系选择区域下方增加实时预览文案，选中关系后显示确认语句"即：新成员是{name}的{关系}"
- [x] 2.3 在 `person/create/index.js` 中增加 `selectedRelationLabel` 数据字段和映射逻辑
- [x] 2.4 在 `person/create/index.wxss` 中增加确认文案样式

## 3. 增强自我节点视觉标识
- [x] 3.1 在 `family-graph/index.js` 的 `render()` 中，为自我节点增加外发光效果（半透明金色大圆，rgba(212,160,23,0.2)，radius+6）
- [x] 3.2 将自我节点描边加粗至 4px

## 4. 验证
- [x] 4.1 验证称呼表页面不再报 Babel 运行时错误（miniprogram 目录下无 `[...` 展开语法残留）
- [x] 4.2 验证创建成员时关系语义提示清晰（显示确认文案）
- [x] 4.3 验证自我节点在图谱中有明显的视觉区分（外发光 + 4px 金色描边）
