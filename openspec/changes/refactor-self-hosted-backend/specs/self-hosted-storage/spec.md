# Capability: Self-Hosted Storage

## ADDED Requirements

### Requirement: REQ-STORAGE-001 — 本地文件上传
The system SHALL accept file uploads via Go's standard library multipart handling (r.FormFile), store files to the local filesystem under a structured directory (/uploads/photos/{family_id}/), generate thumbnails using the disintegration/imaging library, and return a publicly accessible HTTPS URL.

#### Scenario: Photo upload
- **Given** an authenticated user is a member of a family
- **When** the user sends POST /api/v1/photo/upload with a photo file and metadata (family_id, person_id)
- **Then** the server saves the original file to /uploads/photos/{family_id}/{photo_id}.{ext}
- **And** generates a thumbnail at /uploads/photos/{family_id}/{photo_id}_thumb.{ext}
- **And** creates a photo record in SQLite
- **And** returns { photo_id, url, thumb_url }

#### Scenario: Avatar upload
- **Given** an authenticated user is editing a person profile
- **When** the user uploads an avatar image via multipart form
- **Then** the server saves the avatar to /uploads/avatars/{person_id}.{ext}
- **And** updates the person's avatar field in the database

### Requirement: REQ-STORAGE-002 — 文件删除
The system SHALL delete the physical file from disk (using os.Remove) when a photo record is deleted from the database.

#### Scenario: Photo deletion with file cleanup
- **Given** a photo record exists with associated files on disk
- **When** the photo is deleted via DELETE /api/v1/photo/{id}
- **Then** the server removes the original file and thumbnail from disk
- **And** decrements the family's storage_used_bytes in SQLite

### Requirement: REQ-STORAGE-003 — 图片处理与压缩
The system SHALL use the disintegration/imaging library (pure Go, no CGO) to generate thumbnails and compress uploaded images to manage disk space on the 50GB server.

#### Scenario: Large image compression
- **Given** a user uploads an image larger than 2MB
- **When** the upload is processed by the server
- **Then** the original image is re-encoded at 80% JPEG quality if it exceeds 2MB
- **And** a 400x400 thumbnail is generated for list views
- **And** a 200x200 thumbnail is generated for avatar use

### Requirement: REQ-STORAGE-004 — 存储配额检查
The system SHALL enforce per-family storage quotas before accepting file uploads, consistent with existing cloud function logic.

#### Scenario: Quota exceeded
- **Given** a family has used storage close to the quota limit
- **When** a user attempts to upload a file that would exceed the quota
- **Then** the server rejects the upload with an error message indicating insufficient storage
