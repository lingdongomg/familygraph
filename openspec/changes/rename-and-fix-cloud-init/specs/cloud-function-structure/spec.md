## ADDED Requirements

### Requirement: Self-Contained Cloud Functions
Each cloud function directory SHALL contain all of its runtime dependencies as local files (under a `utils/` subdirectory), so that the function can be deployed independently without relying on sibling directories outside its own folder.

#### Scenario: Cloud function deploys without missing modules
- **WHEN** a developer right-clicks a cloud function directory in WeChat DevTools and selects "上传并部署：云端安装依赖"
- **THEN** the deployed function executes without `Cannot find module` errors for any shared utility

#### Scenario: Shared utility referenced locally
- **WHEN** a cloud function's `index.js` requires a shared utility module
- **THEN** the require path uses `./utils/xxx` (local subdirectory) instead of `../utils/xxx` (sibling directory)
