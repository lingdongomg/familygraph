## 1. 修复图谱称呼标签 Bug

- [x] 1.1 在开发环境复现"创建父亲后显示儿子"问题，检查 `relationships` 集合中正向/反向边的 `relation_type` 值
- [x] 1.2 排查 `relationship/index.js` 中 `bfsComputeTitle` 的边反转逻辑（`REVERSE_RELATION` 使用的 gender 参数是否正确）
- [x] 1.3 排查 `person/create` 中反向边创建逻辑（line 117-119），确认 `reverseMap[refPerson.gender]` 是否应为新人物性别
- [x] 1.4 修复确认的 Bug 并验证直系亲属（父/母/子/女/夫/妻）和二代亲属（祖/孙/叔/侄）称谓正确

## 2. 图谱节点点击区域优化

- [x] 2.1 修改 `forceGraph.js` 的 `getNodeAt` 方法，扩大命中检测范围至包含标签区域（nodeRadius + labelHeight）
- [x] 2.2 验证点击头像圆形区域和标签文字区域均可触发 `nodetap` 事件

## 3. 移除已故字段

- [x] 3.1 从 `miniprogram/pages/person/create/index.wxml` 移除"已故" switch 控件及相关 JS 处理
- [x] 3.2 从 `miniprogram/pages/person/edit/index.wxml` 移除"已故" switch 控件及相关 JS 处理
- [x] 3.3 从 `miniprogram/pages/person/detail/index.wxml` 移除"已故"标签和信息行
- [x] 3.4 从 `miniprogram/pages/share/view/index.wxml` 移除"已故"标签
- [x] 3.5 从 `miniprogram/utils/constants.js` 的 `SHARED_FIELDS` 和 `GUEST_VISIBLE_FIELDS` 中移除 `is_deceased`
- [x] 3.6 从 `cloudfunctions/relationship/utils/constants.js` 和 `cloudfunctions/person/utils/constants.js` 中同步移除

## 4. 备注改为条目式

- [x] 4.1 修改 `cloudfunctions/note/index.js` 的 `get` 操作，兼容读取旧 `remark` 字符串并转为数组
- [x] 4.2 修改 `cloudfunctions/note/index.js` 的 `upsert` 操作，支持 `remarks` 数组字段写入
- [x] 4.3 修改 `miniprogram/pages/person/privacy/index.wxml`，将 textarea 替换为条目式列表 UI（含添加输入框 + 添加按钮 + 各条目删除按钮）
- [x] 4.4 修改 `miniprogram/pages/person/privacy/index.js`，实现条目增删逻辑
- [x] 4.5 修改 `miniprogram/pages/person/privacy/index.wxss`，添加条目列表样式
- [x] 4.6 修改 `miniprogram/pages/person/detail/index.wxml` 和 `.js`，适配显示备注条目列表

## 5. 自定义称呼表功能

- [x] 5.1 创建新云函数 `cloudfunctions/titlemap/index.js`，实现 create / update / delete / get / list 操作
- [x] 5.2 在 `cloudfunctions/relationship/index.js` 的 `handleGetGraph` 中增加查询用户选用的称呼表，应用覆盖到 formal_title
- [x] 5.3 新建页面 `miniprogram/pages/family/titlemap/index.*`，实现称呼表编辑 UI（列表展示当前覆盖项 + 搜索/添加路径 + 输入自定义称谓）
- [x] 5.4 在 `miniprogram/pages/family/settings/index.*` 中添加"称呼表设置"入口和"选用称呼表"功能
- [x] 5.5 实现称呼表分享/选用逻辑，修改 `family_members` 集合支持 `adopted_title_map_id`
- [x] 5.6 验证称呼覆盖优先级：custom_title > 自定义称呼表 > FORMAL_TITLE_MAP > name
