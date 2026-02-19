# Change: 补全缺失图标 + 加密密钥硬编码

## Why
1. 微信开发者工具运行时报 `Failed to load local image resource /static/icons/settings.png`，另外 `default-avatar.png` 也缺失（被 3 个页面引用）。这两个图标在代码中被引用但从未创建。
2. 加密模块读取 `process.env.ENCRYPTION_KEY` 环境变量，需要在云开发控制台手动配置。用户希望简化流程，将密钥直接硬编码到 `crypto.js` 中。

## What Changes
- **补全图标**: 创建 `settings.png` 和 `default-avatar.png` 两个 SVG 转 PNG 占位图标（简洁纯色风格，与项目主题色 #8B4513 一致）
- **硬编码密钥**: 将 `crypto.js` 中的 `process.env.ENCRYPTION_KEY` 替换为硬编码的随机密钥字符串，移除环境变量依赖
- **更新文档**: 简化 `DEPLOY.md` 中的环境变量配置步骤

## Impact
- Affected specs: static-assets (新增), encryption-config (新增)
- Affected code:
  - `miniprogram/static/icons/settings.png` — 新建
  - `miniprogram/static/icons/default-avatar.png` — 新建
  - `cloudfunctions/user/utils/crypto.js` — 硬编码密钥
  - `cloudfunctions/person/utils/crypto.js` — 硬编码密钥
  - `cloudfunctions/note/utils/crypto.js` — 硬编码密钥
  - `DEPLOY.md` — 简化环境变量说明
