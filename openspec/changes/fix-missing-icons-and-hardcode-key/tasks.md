## 1. 补全缺失图标
- [x] 1.1 创建 `miniprogram/static/icons/settings.png`（齿轮图标，48x48px，#8B4513 色调）
- [x] 1.2 创建 `miniprogram/static/icons/default-avatar.png`（人物轮廓图标，48x48px，#CCCCCC 灰色）
- [ ] 1.3 在微信开发者工具中验证 `pages/family/home` 和 `pages/person/detail` 不再报图片加载错误

## 2. 硬编码加密密钥
- [x] 2.1 修改 `cloudfunctions/user/utils/crypto.js` 中的 `getKey()` 函数，将 `process.env.ENCRYPTION_KEY` 替换为硬编码密钥
- [x] 2.2 同步修改 `cloudfunctions/person/utils/crypto.js`
- [x] 2.3 同步修改 `cloudfunctions/note/utils/crypto.js`

## 3. 更新文档
- [x] 3.1 简化 `DEPLOY.md` 第五步（环境变量配置），说明密钥已内置，无需手动配置
