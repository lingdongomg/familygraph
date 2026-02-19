## Context

### 改名
项目中文名从"亲记"更名为"亲谱"。"亲谱"更好地表达了"家族谱系"的含义，与 FamilyGraph 的英文名呼应。改名仅影响 UI 显示文本和文档，不涉及代码逻辑、数据库集合名、API 接口等。

### 云函数共享模块加载失败
部署所有 9 个云函数后，调用 `user/login` 报错：
```
errCode: -504002 | Cannot find module '../utils/crypto'
```

**根因分析：**

当前项目结构中，`cloudfunctions/utils/` 是一个与各云函数目录平级的兄弟文件夹：
```
cloudfunctions/
├── user/index.js          ← require('../utils/crypto') 指向上级的 utils/
├── family/index.js
├── ...
└── utils/                 ← 共享模块（crypto, helpers, constants, titleMap）
```

微信云开发的部署机制是**逐个云函数目录独立上传**。当部署 `user/` 时，只有 `user/` 目录内的文件被上传到云端。`../utils/` 是上级目录的兄弟文件夹，不在 `user/` 之内，因此不会被打包上传。运行时 Node.js 执行 `require('../utils/crypto')` 时，该路径在云端不存在，导致 `MODULE_NOT_FOUND`。

`DEPLOY.md` 第 172 行声称"开发者工具会在部署时将其打包到每个云函数中"，这一说法**不正确**。

### 云环境初始化
`miniprogram/app.js` 中 `wx.cloud.init()` 缺少 `env` 参数。已确认环境 ID 为 `cloud1-6gk79e3g86e4662c`。

## Goals / Non-Goals
- **Goals**:
  - 所有用户可见文本中"亲记"改为"亲谱"
  - 修复云函数共享模块加载，使所有 9 个云函数可正常运行
  - 修复 `wx.cloud.init()` env 参数
  - 修正部署文档中的错误说明
- **Non-Goals**:
  - 不修改英文项目名 FamilyGraph
  - 不修改代码中的变量名、集合名等技术标识符
  - 不修改 openspec/changes/ 归档文件中的历史记录

## Decisions

### 共享模块方案：本地复制
**选择**: 将 `cloudfunctions/utils/` 中的 4 个文件复制到每个需要它们的云函数目录下的 `utils/` 子目录，并将 `require('../utils/xxx')` 改为 `require('./utils/xxx')`。

修改后的结构：
```
cloudfunctions/
├── user/
│   ├── index.js           ← require('./utils/crypto'), require('./utils/helpers')
│   ├── utils/
│   │   ├── crypto.js
│   │   └── helpers.js
│   └── package.json
├── family/
│   ├── index.js           ← require('./utils/helpers'), require('./utils/constants')
│   ├── utils/
│   │   ├── helpers.js
│   │   └── constants.js
│   └── package.json
├── ...（其余 7 个云函数类同）
└── utils/                 ← 保留作为单一真相源，开发时修改此处后需同步
```

各云函数的 utils 依赖关系：

| 云函数 | crypto | helpers | constants | titleMap |
|--------|--------|---------|-----------|----------|
| user | x | x | | |
| family | | x | x | |
| member | | x | | |
| person | x | x | x | |
| relationship | | x | x | x |
| photo | | x | x | |
| note | x | x | | |
| history | | x | x | |
| admin | | x | x | |

**替代方案对比**：

1. **npm 私有包**: 将 utils 发布为 npm 包 → 过度工程化，V1 不需要
2. **构建脚本自动复制**: 写一个脚本在部署前自动同步 → 增加了工具链依赖，V1 开发者工具直接部署更简单
3. **内联代码到每个函数**: 把共享逻辑直接粘贴进每个 index.js → 代码重复太多，维护困难

选择本地复制的原因：
- 最简单直接，无需额外工具链
- 每个云函数完全自包含，部署不会出问题
- 保留顶层 `utils/` 作为"源"，在 DEPLOY.md 中说明修改后需同步

## Risks / Trade-offs
- **代码重复**: 4 个 utils 文件会在多个云函数中存在副本。修改时需要同步所有副本 → 在 DEPLOY.md 和项目文档中明确说明，后续可考虑自动化脚本
- 开发者修改共享模块后忘记同步 → V1 阶段可接受，后续可加 lint 检查

## Open Questions
- 无
