## 1. 修复添加成员按钮（核心）
- [x] 1.1 在 `family/home/index.js` 的 `onAddMember()` 中：
  - 如果 `members.length === 0`，直接导航到 `person/create?family_id=xxx`（首位成员模式，无需 reference）
  - 如果 `members.length > 0`，弹出 `wx.showActionSheet` 让用户选择参照成员，然后导航到 `person/create?family_id=xxx&reference_person_id=yyy`
- [x] 1.2 在 `family/home/index.wxml` 中无需改动（按钮已绑定 `onAddMember`，逻辑在 JS 中处理）

## 2. 支持首位成员模式
- [x] 2.1 修改 `person/create/index.js` 的 `onLoad`：当 `reference_person_id` 缺失时不再报错返回，而是进入"首位成员"模式（隐藏关系选择区域，仅填写基本信息）
- [x] 2.2 修改 `person/create/index.wxml`：当 `isFirstMember` 为 true 时隐藏关系区域，显示"添加第一位家庭成员"提示
- [x] 2.3 修改 `person/create/index.js` 的提交逻辑：首位成员模式下不传 reference_person_id 和 relation_type
- [x] 2.4 修改 `cloudfunctions/person/index.js` 的 `create` 函数：支持无 reference_person_id 的首位成员创建（generation 默认为 0，不创建关系边）

## 3. 修复控制台告警
- [x] 3.1 将 `components/family-graph/index.js:80` 的 `wx.getSystemInfoSync().pixelRatio` 替换为 `wx.getWindowInfo().pixelRatio`
- [x] 3.2 将 `components/family-graph/index.wxss` 中的 `canvas { ... }` 改为 `.graph-canvas { ... }`
- [x] 3.3 在 `components/family-graph/index.wxml` 中给 canvas 元素添加 `class="graph-canvas"`

## 4. 验证
- [ ] 4.1 新建家庭 → 点击 "+" → 应进入添加首位成员页面（无关系选择），填写后成功创建
- [ ] 4.2 家庭已有成员 → 点击 "+" → 弹出成员选择列表 → 选择后进入创建页面（有关系选择）
- [ ] 4.3 控制台无 getSystemInfoSync 废弃告警
- [ ] 4.4 控制台无 WXSS 选择器告警
