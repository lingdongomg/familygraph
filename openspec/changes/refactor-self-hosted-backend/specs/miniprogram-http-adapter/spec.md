# Capability: Miniprogram HTTP Adapter

## MODIFIED Requirements

### Requirement: REQ-ADAPTER-001 — API 调用层从云函数迁移至 HTTP
The miniprogram api.js utility SHALL replace all wx.cloud.callFunction calls with wx.request HTTP calls, mapping cloud function name/action pairs to RESTful HTTP endpoints while preserving the existing callFunction(name, data) interface for minimal page-level code changes.

#### Scenario: Transparent API migration
- **Given** a page calls `callFunction('person/list', { family_id: 'xxx' })`
- **When** the api.js adapter processes the call
- **Then** it translates to `wx.request GET https://domain/api/v1/person?family_id=xxx`
- **And** returns the response data in the same format as before

#### Scenario: Error response compatibility
- **Given** the server returns { code: -1, message: '错误信息', data: null }
- **When** the adapter processes the response
- **Then** it rejects the promise with an Error whose message is '错误信息'
- **And** page-level error handling continues to work without changes

### Requirement: REQ-ADAPTER-002 — 文件上传迁移
The miniprogram SHALL replace all wx.cloud.uploadFile calls with wx.uploadFile targeting the self-hosted server, and replace wx.cloud.getTempFileURL with direct HTTPS URL access.

#### Scenario: Photo upload via HTTP
- **Given** a user selects a photo to upload in the album page
- **When** the upload is triggered
- **Then** the miniprogram calls wx.uploadFile to POST /api/v1/photo/upload
- **And** receives a direct HTTPS URL for the uploaded photo (no temp URL conversion needed)

#### Scenario: Image display without getTempFileURL
- **Given** a photo record contains a url field like "https://domain/uploads/photos/xxx.jpg"
- **When** the miniprogram renders the photo in an image component
- **Then** the image src is used directly without calling wx.cloud.getTempFileURL

### Requirement: REQ-ADAPTER-003 — 移除微信云开发初始化
The miniprogram app.js SHALL remove the wx.cloud.init() call and instead configure the self-hosted server base URL as a global configuration.

#### Scenario: App initialization
- **Given** the miniprogram starts
- **When** app.js onLaunch executes
- **Then** the server base URL is loaded from configuration (not hardcoded)
- **And** no wx.cloud.init() is called
- **And** the login flow calls the self-hosted /api/v1/user/login endpoint

### Requirement: REQ-ADAPTER-004 — 微信公众平台域名配置
The miniprogram project SHALL document and require the configuration of the self-hosted server domain as a valid request/upload/download domain in the WeChat Mini Program management console.

#### Scenario: Domain configuration checklist
- **Given** the operator is deploying the self-hosted backend
- **When** the deployment documentation is followed
- **Then** the operator configures the server domain in WeChat console under:
  - request 合法域名: https://yourdomain.com
  - uploadFile 合法域名: https://yourdomain.com
  - downloadFile 合法域名: https://yourdomain.com
