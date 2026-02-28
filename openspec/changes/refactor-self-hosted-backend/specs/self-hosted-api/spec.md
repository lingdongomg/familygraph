# Capability: Self-Hosted API

## ADDED Requirements

### Requirement: REQ-API-001 — Go HTTP API 服务
The system SHALL provide a Go HTTP API server using net/http (Go 1.22+) that exposes all current cloud function actions as RESTful HTTP endpoints under the /api/v1/ prefix, maintaining identical business logic and response format ({ code, message, data }).

#### Scenario: API server startup
- **Given** the Docker container is started
- **When** the Go binary starts
- **Then** the HTTP server starts on port 8080 within 50ms
- **And** the SQLite database is initialized with the required schema if not present
- **And** the uploads directory is created if not present

#### Scenario: Request routing
- **Given** the API server is running
- **When** a client sends a request to a valid endpoint (e.g., GET /api/v1/person?family_id=xxx)
- **Then** the server routes the request to the corresponding handler function
- **And** returns a JSON response with { code: 0, message: "ok", data: {...} } on success

### Requirement: REQ-API-002 — SQLite 数据库层
The system SHALL use SQLite (via modernc.org/sqlite, a pure Go driver) as the sole database, with WAL mode and busy_timeout enabled, replacing the WeChat CloudBase document database.

#### Scenario: Database initialization
- **Given** the server starts for the first time
- **When** the database file does not exist
- **Then** the server creates the SQLite database file and executes the schema creation SQL to build all 12 tables with appropriate indexes

#### Scenario: Data persistence across restarts
- **Given** the server has been running and processing requests
- **When** the Docker container is restarted
- **Then** all previously stored data is intact via the persistent Docker volume

### Requirement: REQ-API-003 — 统一错误处理
The system SHALL provide structured error handling that catches panics and returns a standardized JSON error response ({ code: -1, message: "...", data: null }) for all unhandled errors.

#### Scenario: Unhandled panic recovery
- **Given** a handler function panics due to an unexpected error
- **When** the recovery middleware catches the panic
- **Then** the server returns HTTP 500 with { code: -1, message: "服务器内部错误", data: null }
- **And** the error is logged to stdout for Docker log collection

### Requirement: REQ-API-004 — Docker Compose 部署
The system SHALL be deployable via a single `docker-compose up -d` command, with a Go binary built via multi-stage Docker build (scratch base image) and Nginx reverse proxy, with persistent volumes for database and uploaded files.

#### Scenario: One-command deployment
- **Given** a fresh server with Docker and Docker Compose installed
- **When** the operator runs `docker-compose up -d` in the project root
- **Then** the Go API container starts (image size < 20MB) and connects to the SQLite database
- **And** the Nginx container starts and serves HTTPS on port 443
- **And** uploaded files and database persist across container restarts

### Requirement: REQ-API-005 — Nginx 反向代理与 HTTPS
The system SHALL use Nginx as a reverse proxy to terminate HTTPS connections, proxy API requests to the Go backend on port 8080, and serve uploaded files as static assets.

#### Scenario: API request proxying
- **Given** Nginx is configured with a valid SSL certificate
- **When** a client sends an HTTPS request to /api/v1/*
- **Then** Nginx forwards the request to the Go API on port 8080
- **And** returns the response to the client

#### Scenario: Static file serving
- **Given** a photo has been uploaded to /uploads/photos/xxx.jpg
- **When** a client requests HTTPS GET /uploads/photos/xxx.jpg
- **Then** Nginx serves the file directly without involving the Go process
