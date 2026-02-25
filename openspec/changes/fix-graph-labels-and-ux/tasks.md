## 1. 修复节点标签为双行显示（名字 + 称谓）
- [x] 1.1 重构 `getNodeLabel()` 为 `getNodeLabels(node)` 返回 `{ name, title }` 结构
  - 自我节点: `{ name: node.name, title: '本人' }`
  - 他人节点: `{ name: node.name, title: custom_title || formal_title || '' }`（用户编辑的称谓优先于称谓表）
  - 无绑定用户: `{ name: node.name, title: '' }`
- [x] 1.2 修改 `render()` 中 label 绘制逻辑：第一行名字（粗体），第二行称谓（灰色，有则显示）
- [x] 1.3 名字超过 4 字符截断加"…"，称谓超过 5 字符截断加"…"

## 2. 自我节点视觉高亮
- [x] 2.1 在 `render()` 中，当节点 `bound_user_id === currentUserId` 时，用金色描边环替代白色描边

## 3. 修复配偶布局对齐
- [x] 3.1 在 `buildGraph()` 中扫描 edges 找到 HUSBAND/WIFE 类型，构建配偶映射
- [x] 3.2 构建 ForceGraph nodes 时传入 `isSpouse: true` 和 `spouseId` 字段

## 4. 调整节点尺寸和间距
- [x] 4.1 更新 `miniprogram/utils/constants.js` 中 GRAPH 常量：NODE_RADIUS 30, FONT_SIZE 13, LABEL_FONT_SIZE 11, SUB_LABEL_FONT_SIZE 10, GENERATION_Y_SPACING 140, SPOUSE_X_SPACING 70
- [x] 4.2 同步更新 `miniprogram/utils/forceGraph.js` 中对应的局部常量

## 5. 扩大点击热区
- [x] 5.1 将 `forceGraph.js` 中 `getNodeAt()` 的 `LABEL_HIT_EXTRA` 从 20 增大到 40，确保双行标签区域可点击
- [x] 5.2 验证点击节点头像、第一行名字、第二行称谓均能触发跳转到人物详情页

## 6. 验证
- [x] 6.1 验证自我节点显示"姓名 + 本人"且有金色描边
- [x] 6.2 验证父亲节点显示"父亲姓名 + 爸爸/父亲"等称谓
- [x] 6.3 验证用户编辑的自定义称谓（person_notes.custom_title）优先于系统称谓表
- [x] 6.4 验证配偶对在同一行相邻排列
- [x] 6.5 验证长名字正确截断
- [x] 6.6 验证未绑定用户时所有节点只显示名字
- [x] 6.7 验证点击节点标签区域可跳转到人物详情页
