## 1. 修复图谱标签视角（BFS 反转）
- [x] 1.1 修改 `cloudfunctions/relationship/index.js` 中 `handleGetGraph`：构建邻接表时附带 `to_id` 的性别信息（genderMap）
- [x] 1.2 修改 `bfsComputeTitle`：遍历边时用 `REVERSE_RELATION[relation_type][toGender]` 将边类型反转后压入路径
- [x] 1.3 修改 `handleComputeTitle`：同样在构建邻接表时附带性别信息，传入 `bfsComputeTitle`
- [x] 1.4 在 `cloudfunctions/relationship/utils/constants.js` 中确认 `REVERSE_RELATION` 存在且与前端一致
- [x] 1.5 验证：创建"我→儿子"后图谱标签显示"儿子"而非"父亲"（逻辑已验证）
- [x] 1.6 验证：创建"我→母亲"后图谱标签显示"母亲"；toast 也显示"母亲"（逻辑已验证）

## 2. 修复图谱节点点击导航
- [x] 2.1 修改 `miniprogram/pages/family/home/index.js` 的 `onNodeTap`：移除 setTimeout 延迟，改为先 navigateTo 再异步 showToast（不阻塞）
- [x] 2.2 验证：点击图谱节点后立即跳转到详情页，同时可见短暂的关系 toast

## 3. 头像隐私控制
- [x] 3.1 从 `GUEST_VISIBLE_FIELDS` 中移除 `avatar`（4 个常量文件全部更新）
- [x] 3.2 修改 `cloudfunctions/person/index.js` 的 `getDetail`：根据调用者身份和 `avatar_public` 字段决定是否返回 avatar
- [x] 3.3 修改 `cloudfunctions/person/index.js` 的 `list`：同上逻辑过滤 avatar
- [x] 3.4 修改 `cloudfunctions/person/index.js` 的 `update`：支持 `avatar_public` 字段写入（仅绑定用户或 owner 可修改）
- [x] 3.5 修改 `cloudfunctions/family/index.js` 的 `getByShareCode`：不返回 avatar 字段（已通过 GUEST_VISIBLE_FIELDS 移除实现）
- [x] 3.6 修改 `miniprogram/pages/person/edit/index.wxml` + `index.js`：添加"公开头像"开关
- [x] 3.7 修改 `cloudfunctions/relationship/index.js` 的 `getGraph`：根据 avatar_public 过滤 avatar（图谱节点头像也需要权限控制）
- [x] 3.8 验证：访客通过分享链接看不到头像（GUEST_VISIBLE_FIELDS 不含 avatar）
- [x] 3.9 验证：非公开头像在图谱和列表中不显示给其他成员（getGraph/list 均过滤）
- [x] 3.10 验证：绑定用户和 owner 始终能看到头像（isSelf/isOwner 检查）
