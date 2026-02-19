## ADDED Requirements

### Requirement: Cloud Environment Initialization
The mini program SHALL initialize `wx.cloud` with an explicit `env` parameter pointing to the target cloud development environment ID, so that all subsequent `cloud.callFunction` calls can locate deployed cloud functions.

#### Scenario: Cloud init with env parameter
- **WHEN** the mini program launches and calls `wx.cloud.init()`
- **THEN** the `env` parameter is set to the configured cloud environment ID
- **AND** subsequent `cloud.callFunction` calls resolve to the correct cloud environment

#### Scenario: Missing env causes clear guidance
- **WHEN** a developer clones the project and the `env` parameter is still set to the placeholder value
- **THEN** the deployment documentation (`DEPLOY.md`) provides clear instructions on how to obtain and configure the cloud environment ID

### Requirement: Cloud Function Deployment Documentation
The deployment documentation SHALL include step-by-step instructions for deploying all cloud functions to the cloud environment via WeChat DevTools.

#### Scenario: Developer follows deployment steps
- **WHEN** a developer reads `DEPLOY.md` after cloning the project
- **THEN** they find instructions to: (1) configure the cloud environment ID in `app.js`, (2) right-click each cloud function directory and select "上传并部署" in WeChat DevTools
