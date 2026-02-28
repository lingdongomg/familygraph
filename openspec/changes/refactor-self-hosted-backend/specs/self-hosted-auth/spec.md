# Capability: Self-Hosted Authentication

## ADDED Requirements

### Requirement: REQ-AUTH-001 — 微信 code2session 登录
The system SHALL provide a login endpoint that accepts a WeChat temporary code, calls the WeChat jscode2session API via Go's net/http client to obtain the user's openid, and returns a signed JWT token (golang-jwt/jwt/v5) for subsequent authentication.

#### Scenario: First-time user login
- **Given** a user opens the miniprogram for the first time
- **When** the user calls POST /api/v1/user/login with a valid WeChat code
- **Then** the Go server exchanges the code for an openid via WeChat jscode2session API
- **And** the server creates a new user record with the hashed openid in SQLite
- **And** the server returns a JWT token and user profile

#### Scenario: Returning user login
- **Given** a user has previously logged in and has an existing user record
- **When** the user calls POST /api/v1/user/login with a valid WeChat code
- **Then** the server retrieves the existing user record by openid hash
- **And** the server returns a JWT token and existing user profile

#### Scenario: Invalid WeChat code
- **Given** the WeChat code is expired or invalid
- **When** the user calls POST /api/v1/user/login with an invalid code
- **Then** the server returns an error indicating authentication failure

### Requirement: REQ-AUTH-002 — JWT 中间件鉴权
The system SHALL authenticate all protected API endpoints via a Go http.Handler middleware that validates the JWT token in the Authorization header and injects the authenticated user's openid into the request context.

#### Scenario: Valid JWT token
- **Given** a user has a valid, unexpired JWT token
- **When** the user makes a request to a protected endpoint with Authorization: Bearer {token}
- **Then** the middleware validates the token and the handler retrieves the openid from context

#### Scenario: Missing or expired JWT token
- **Given** a user has no token or an expired token
- **When** the user makes a request to a protected endpoint
- **Then** the middleware returns HTTP 401 with { code: -1, message: "未授权" }

### Requirement: REQ-AUTH-003 — 公开端点免鉴权
The system SHALL allow unauthenticated access to the login endpoint and share link viewing endpoint.

#### Scenario: Share link access without token
- **Given** a valid share code exists
- **When** an unauthenticated user calls GET /api/v1/family/share/{code}
- **Then** the server returns the shared family data without requiring authentication
