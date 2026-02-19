## P0. 项目脚手架与云环境

- [x] 0.1 创建微信小程序项目，启用云开发
- [x] 0.2 搭建目录结构（pages/、components/、utils/、static/）
- [x] 0.3 配置 app.json，注册全部 17 个页面和 tabBar
- [x] 0.4 配置 app.wxss 全局样式
- [x] 0.5 初始化云数据库集合（11 个集合，无 privacy_settings）及索引
- [x] 0.6 设置云数据库安全规则
- [x] 0.7 创建公共工具模块: `utils/constants.js`（含 SHARED_FIELDS、PRIVATE_OVERLAY_FIELDS 常量）、`utils/api.js`
- [x] 0.8 在云环境中设置 ENCRYPTION_KEY 环境变量
- [x] 0.9 创建 `utils/crypto.js`（AES-256-CBC 加解密，供云函数使用）

## P1. 用户认证与家庭管理

- [x] 1.1 实现 `cloudfunctions/user/login`（微信登录、openid 加密、用户 upsert）
- [x] 1.2 实现 `cloudfunctions/user/updateProfile`（昵称、头像更新）
- [x] 1.3 实现 `utils/auth.js`（客户端登录状态管理）
- [x] 1.4 实现 `pages/index/index`（首页: 家庭列表或空状态）
- [x] 1.5 实现 `cloudfunctions/family/create`（创建家庭 + Owner 的 Person + family_member 记录）
- [x] 1.6 实现 `pages/family/create/index`（创建家庭表单 + 本人基本信息卡片，仅共享字段）
- [x] 1.7 实现 `cloudfunctions/family/generateInviteCode`（6 位邀请码，7 天过期）
- [x] 1.8 实现 `pages/family/invite/index`（展示邀请码 / 二维码）
- [x] 1.9 实现 `cloudfunctions/member/applyJoin`（验证邀请码、检查 Person 绑定、创建申请）
- [x] 1.10 实现 `pages/family/join/index`（输入邀请码、选择 Person、提交）
- [x] 1.11 实现 `cloudfunctions/member/reviewJoin`（通过/拒绝、创建 family_member、绑定 Person）
- [x] 1.12 实现 `pages/family/approvals/index`（加入申请审批列表页）
- [x] 1.13 实现 `components/approval-card/`（审批卡片组件）
- [x] 1.14 实现 `cloudfunctions/member/leave`（退出家庭、解绑 Person）
- [x] 1.15 实现 `cloudfunctions/member/changeRole`（Owner 修改角色 member/restricted）
- [x] 1.16 实现 `cloudfunctions/member/list`（家庭成员列表）
- [x] 1.17 实现 `cloudfunctions/family/getDetail`（家庭信息 + 统计数据）
- [x] 1.18 实现 `cloudfunctions/family/delete`（仅 Owner，级联删除所有数据，含 person_notes，无 privacy_settings）
- [x] 1.19 实现 `pages/family/settings/index`（家庭设置、成员管理）

## P2. 成员增删改查与关系管理

- [x] 2.1 实现 `cloudfunctions/person/create`（创建成员仅写共享字段，建立关系、自动反向边、辈分计算）
- [x] 2.2 实现 `cloudfunctions/person/update`（仅更新共享字段 + 编辑历史快照）
- [x] 2.3 实现 `cloudfunctions/person/delete`（仅 Owner，级联删除含所有用户的 person_notes）
- [x] 2.4 实现 `cloudfunctions/person/getDetail`（读取共享层 + 当前用户的 person_notes 合并返回）
- [x] 2.5 实现 `cloudfunctions/person/list`（家庭全部成员列表 + 批量查询当前用户的 custom_title）
- [x] 2.6 实现 `cloudfunctions/relationship/create`（正向边 + 反向边）
- [x] 2.7 实现 `cloudfunctions/relationship/delete`（删除双向边）
- [x] 2.8 实现 `pages/person/create/index`（交互模式: "他/她是 X 的 Y"，仅采集共享字段）
- [x] 2.9 实现 `components/relation-picker/`（关系类型选择器网格）
- [x] 2.10 实现 `pages/person/detail/index`（分 "基本信息" 和 "我的备注" 两区域展示）
- [x] 2.11 实现 `components/person-card/`（人物卡片组件，标签优先使用 custom_title）
- [x] 2.12 实现 `pages/person/edit/index`（编辑共享字段表单）
- [x] 2.13 实现 `pages/person/privacy/index`（重新定位为 "我的备注" 编辑页: phone, wechat_id, birth_date, city, occupation, custom_title, remark）

## P3. 亲属称谓系统

- [x] 3.1 创建 `utils/titleMap.js`（FORMAL_TITLE_MAP 约 150+ 条目覆盖五代、RELATION_TYPES、REVERSE_RELATION）
- [x] 3.2 实现 `cloudfunctions/relationship/computeTitle` 中的 BFS 最短路径算法（最大深度 5）
- [x] 3.3 实现 `cloudfunctions/note/upsert`（创建/更新私人覆盖层: custom_title, remark, phone, wechat_id, birth_date, city, occupation；phone 和 wechat_id 做 AES 加密）
- [x] 3.4 实现 `cloudfunctions/note/get`（获取当前用户对某人的完整私人覆盖数据，phone 和 wechat_id 解密返回）
- [x] 3.5 集成称谓展示: 成员详情页显示正式称谓 + 自定义昵称
- [x] 3.6 集成称谓展示: 图谱节点标签优先级为 自定义昵称 > 正式称谓 > 姓名

## P4. 家庭图谱可视化

- [x] 4.1 实现 `utils/forceGraph.js`（ForceGraph 类: 初始化位置、模拟、斥力、引力、辈分/配偶约束）
- [x] 4.2 实现 `components/family-graph/` Canvas 渲染（节点、边、标签、命中检测）
- [x] 4.3 实现 `cloudfunctions/relationship/getGraph`（返回图谱节点 + 边 + 称谓数据，称谓支持五代深度）
- [x] 4.4 添加触摸交互: 点击节点 → 跳转到成员详情
- [x] 4.5 添加触摸交互: 拖拽平移视口
- [x] 4.6 添加触摸交互: 双指缩放视口
- [x] 4.7 实现高 DPI Canvas 渲染（像素比缩放）
- [x] 4.8 实现头像图片加载和 Canvas 圆形裁剪
- [x] 4.9 将图谱组件集成到 `pages/family/home/index`
- [x] 4.10 性能优化: 限制迭代次数、边界约束、Map 索引边查找

## P5. 照片管理

- [x] 5.1 实现 `utils/imageCompressor.js`（压缩至 1080p，生成 300px 缩略图）
- [x] 5.2 实现 `cloudfunctions/photo/upload`（配额检查、创建记录、返回上传路径）
- [x] 5.3 实现客户端上传流程（压缩 → 云上传 → 更新照片记录 file_id）
- [x] 5.4 实现 `cloudfunctions/photo/delete`（删除文件、标记，扣减存储用量）
- [x] 5.5 实现 `cloudfunctions/photo/list`（按人物或家庭列出照片）
- [x] 5.6 实现 `cloudfunctions/photo/addTag`（创建带位置的 photo_tag）
- [x] 5.7 实现 `cloudfunctions/photo/removeTag`（删除 photo_tag）
- [x] 5.8 实现 `pages/photo/album/index`（按人物的照片网格视图）
- [x] 5.9 实现 `pages/photo/viewer/index`（全屏照片查看器，COS 签名 URL）
- [x] 5.10 实现 `pages/photo/tag/index`（在照片上标记人物及位置）
- [x] 5.11 实现 `components/photo-tagger/`（交互式照片标记组件）

## P6. 分享与 Owner 功能

- [x] 6.1 实现 `cloudfunctions/family/generateShareLink`（6 位分享码，7 天过期）
- [x] 6.2 实现 `cloudfunctions/family/getByShareCode`（验证分享码，返回共享字段 + 图谱）
- [x] 6.3 实现 `pages/share/view/index`（访客只读视图: 图谱 + 共享字段 + 加入引导）
- [x] 6.4 实现 `cloudfunctions/history/list`（仅 Owner，按日期倒序，仅共享字段变更）
- [x] 6.5 实现 `cloudfunctions/history/rollback`（仅 Owner，恢复 snapshot_before，仅共享字段）
- [x] 6.6 实现 `pages/history/index/index`（编辑历史列表 + 回滚界面）
- [x] 6.7 实现 `cloudfunctions/admin/setStorageUnlimited`（开发者工具）
- [x] 6.8 实现订阅消息模板和授权流程
- [x] 6.9 将通知集成到加入申请和审批流程中
- [x] 6.10 实现 `cloudfunctions/admin/cleanup`（每日定时清理任务）
- [x] 6.11 配置定时触发器（每日 03:00 运行清理）

## P7. 用户资料与打磨

- [x] 7.1 实现 `pages/user/profile/index`（用户资料、家庭列表、设置）
- [x] 7.2 完成 `pages/family/home/index` 完整集成（图谱 + 成员列表 + 添加成员 + 邀请）
- [x] 7.3 为所有页面添加空状态和加载状态
- [x] 7.4 为所有云函数调用添加错误处理和用户友好的错误提示
- [x] 7.5 制作静态资源: default-male.png、default-female.png、logo.png、tab bar 图标
- [x] 7.6 全流程测试: 创建家庭 → 添加成员 → 记录备注 → 邀请 → 加入 → 图谱 → 照片
- [x] 7.7 性能测试: 50+ 节点图谱渲染 + 五代称谓计算
- [x] 7.8 UI 打磨: 统一间距、配色、字体排版
- [x] 7.9 微信小程序审核准备与提交
