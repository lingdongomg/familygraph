## 1. 项目改名：亲记 → 亲谱
- [x] 1.1 替换 `project.config.json` 中的"亲记"为"亲谱"
- [x] 1.2 替换 `miniprogram/app.json` 导航栏标题
- [x] 1.3 替换 `miniprogram/pages/index/index.json` 导航栏标题
- [x] 1.4 替换 `miniprogram/pages/user/profile/index.wxml` 中的"关于亲记"
- [x] 1.5 替换 `miniprogram/pages/user/profile/index.js` 中的"关于亲记"相关文本
- [x] 1.6 替换 `README.md` 中的"亲记"
- [x] 1.7 替换 `DEPLOY.md` 中的"亲记"
- [x] 1.8 替换 `openspec/project.md` 中的"亲记"

## 2. 修复云函数共享模块加载（核心修复）
- [x] 2.1 在每个云函数目录下创建 `utils/` 子目录，复制其所需的共享模块文件：
  - `user/utils/` ← crypto.js, helpers.js
  - `family/utils/` ← helpers.js, constants.js
  - `member/utils/` ← helpers.js
  - `person/utils/` ← crypto.js, helpers.js, constants.js
  - `relationship/utils/` ← helpers.js, constants.js, titleMap.js
  - `photo/utils/` ← helpers.js, constants.js
  - `note/utils/` ← crypto.js, helpers.js
  - `history/utils/` ← helpers.js, constants.js
  - `admin/utils/` ← helpers.js, constants.js
- [x] 2.2 将所有 9 个云函数 index.js 中的 `require('../utils/xxx')` 改为 `require('./utils/xxx')`
- [x] 2.3 删除顶层 `cloudfunctions/utils/` 目录（内容已分发到各云函数，避免产生"应该修改哪里"的困惑）
- [x] 2.4 更新 `openspec/project.md` 中的项目结构描述，反映新的云函数目录结构

## 3. 修复云环境初始化
- [x] 3.1 在 `miniprogram/app.js` 的 `wx.cloud.init()` 中添加 `env: 'cloud1-6gk79e3g86e4662c'`

## 4. 更新部署文档
- [x] 4.1 修正 `DEPLOY.md` 中关于 utils 自动打包的错误说明
- [x] 4.2 更新 `DEPLOY.md` 中关于共享模块故障排查的说明

## 5. 验证
- [x] 5.1 全局搜索确认无遗漏的"亲记"（排除 openspec/changes/ 归档文件）
- [ ] 5.2 重新部署全部 9 个云函数（右键 → 上传并部署：云端安装依赖）
- [ ] 5.3 在微信开发者工具中验证登录功能正常（不再报 MODULE_NOT_FOUND 或 FUNCTION_NOT_FOUND）
