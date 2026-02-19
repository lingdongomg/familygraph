# Change: 项目改名亲谱 + 修复云函数部署问题

## Why
1. 项目中文名从"亲记"改为"亲谱"，需要在所有用户可见的 UI 文本、配置文件和文档中同步替换。
2. 云函数运行时报 `Cannot find module '../utils/crypto'`（errCode: -504002），根因是共享 `cloudfunctions/utils/` 目录在部署时未被打包进各云函数目录。微信开发者工具的"上传并部署"**不会**自动打包上级目录中的兄弟文件夹。
3. `miniprogram/app.js` 中 `wx.cloud.init()` 缺少 `env` 参数（已确认环境 ID 为 `cloud1-6gk79e3g86e4662c`）。

## What Changes
- **改名**: 将所有出现的"亲记"替换为"亲谱"（涉及 8 个源文件）
- **修复云函数共享模块**: 将 `cloudfunctions/utils/` 下的 4 个共享模块（crypto.js, helpers.js, constants.js, titleMap.js）复制到每个需要的云函数目录内部，并将 `require('../utils/xxx')` 改为 `require('./utils/xxx')`，确保部署后模块可被正确加载
- **修复云初始化**: 在 `miniprogram/app.js` 的 `wx.cloud.init()` 中添加 `env: 'cloud1-6gk79e3g86e4662c'`
- **更新部署文档**: 修正 `DEPLOY.md` 中关于 utils 自动打包的错误说明

## Impact
- Affected specs: app-branding (新增), cloud-init (新增), cloud-function-structure (新增)
- Affected code:
  - `cloudfunctions/*/` — 所有 9 个云函数目录结构变更 + require 路径修改
  - `miniprogram/app.js` — 添加 `env` 参数
  - `miniprogram/app.json` — 导航栏标题
  - `miniprogram/pages/index/index.json` — 首页导航栏标题
  - `miniprogram/pages/user/profile/index.wxml` — "关于亲谱"菜单项
  - `miniprogram/pages/user/profile/index.js` — "关于亲谱"弹窗
  - `project.config.json` — 项目描述
  - `README.md`, `DEPLOY.md` — 项目文档
  - `openspec/project.md` — 项目规格描述
