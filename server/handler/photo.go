package handler

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"familygraph/middleware"
	"familygraph/pkg"
	"familygraph/store"
)

const (
	storageQuotaBytes  = 500 * 1024 * 1024 // 500 MB
	maxPhotosPerPerson = 20
)

// getUploadDir returns UPLOAD_DIR from env or fallback.
func getUploadDir() string {
	if v := os.Getenv("UPLOAD_DIR"); v != "" {
		return v
	}
	return "uploads"
}

// getBaseURL returns BASE_URL from env or fallback.
func getBaseURL() string {
	if v := os.Getenv("BASE_URL"); v != "" {
		return v
	}
	return "http://localhost:8080"
}

// PhotoUpload handles POST /api/v1/photo/upload
func PhotoUpload(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	// Parse multipart form (max 32 MB)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		Fail(w, "解析上传表单失败")
		return
	}

	familyID := r.FormValue("family_id")
	personID := r.FormValue("person_id")
	if familyID == "" || personID == "" {
		Fail(w, "缺少必填参数 (family_id, person_id)")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -2)
		return
	}

	// Restricted users can only upload to their bound person
	if member.Role == "restricted" {
		if !member.BoundPersonID.Valid || member.BoundPersonID.String != personID {
			Fail(w, "受限成员只能上传到自己绑定的 Person")
			return
		}
	}

	// Check storage quota
	var storageUsed int64
	var storageUnlimited int
	err = store.DB.QueryRow(
		"SELECT storage_used_bytes, storage_unlimited FROM families WHERE id = ?",
		familyID,
	).Scan(&storageUsed, &storageUnlimited)
	if err != nil {
		Fail(w, "家庭不存在")
		return
	}

	// Get uploaded file
	file, header, err := r.FormFile("file")
	if err != nil {
		Fail(w, "缺少上传文件 (file)")
		return
	}
	defer file.Close()

	fileSize := header.Size

	if storageUnlimited == 0 && storageUsed+fileSize > storageQuotaBytes {
		Fail(w, fmt.Sprintf("存储配额不足。已用 %dMB / %dMB",
			storageUsed/1024/1024, storageQuotaBytes/1024/1024), -3)
		return
	}

	// Check photo count for this person
	var photoCount int
	err = store.DB.QueryRow(
		"SELECT COUNT(*) FROM photos WHERE family_id = ? AND person_id = ? AND status = 'active'",
		familyID, personID,
	).Scan(&photoCount)
	if err != nil {
		Fail(w, "查询照片数量失败")
		return
	}
	if photoCount >= maxPhotosPerPerson {
		Fail(w, fmt.Sprintf("该人物的照片已达 %d 张上限", maxPhotosPerPerson), -4)
		return
	}

	// Generate photo ID
	photoID := pkg.GenerateCode(16)

	// Determine file extension
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	ext = strings.ToLower(ext)

	// Create directory
	uploadDir := getUploadDir()
	photoDir := filepath.Join(uploadDir, "photos", familyID)
	if err := os.MkdirAll(photoDir, 0755); err != nil {
		Fail(w, "创建上传目录失败")
		return
	}

	// Save file
	filename := photoID + ext
	filePath := filepath.Join(photoDir, filename)
	dst, err := os.Create(filePath)
	if err != nil {
		Fail(w, "保存文件失败")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(filePath)
		Fail(w, "写入文件失败")
		return
	}

	// Build URLs
	baseURL := strings.TrimRight(getBaseURL(), "/")
	fileURL := fmt.Sprintf("%s/%s/photos/%s/%s", baseURL, uploadDir, familyID, filename)
	thumbURL := fileURL // Thumbnail same as original for now

	// Insert photo record
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = store.DB.Exec(
		`INSERT INTO photos (id, family_id, person_id, uploader_id, file_url, thumb_url, file_size, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
		photoID, familyID, personID, openid, fileURL, thumbURL, fileSize, now, now,
	)
	if err != nil {
		os.Remove(filePath)
		Fail(w, "创建照片记录失败")
		return
	}

	// Increment storage used
	store.DB.Exec("UPDATE families SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?", fileSize, familyID)

	OK(w, map[string]interface{}{
		"photo_id":  photoID,
		"url":       fileURL,
		"thumb_url": thumbURL,
	})
}

// PhotoDelete handles DELETE /api/v1/photo/{id}
func PhotoDelete(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	photoID := r.PathValue("id")
	if photoID == "" {
		Fail(w, "缺少参数 photo_id")
		return
	}

	// Get photo record
	var familyID, personID, uploaderID, fileURL, thumbURL string
	var fileSize int64
	err := store.DB.QueryRow(
		"SELECT family_id, person_id, uploader_id, file_url, thumb_url, file_size FROM photos WHERE id = ?",
		photoID,
	).Scan(&familyID, &personID, &uploaderID, &fileURL, &thumbURL, &fileSize)
	if err != nil {
		Fail(w, "照片不存在")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -2)
		return
	}

	// Permission: uploader or owner
	isUploader := uploaderID == openid
	isOwner := member.Role == "owner"
	if !isUploader && !isOwner {
		Fail(w, "无权删除该照片，只有上传者或 Owner 可删除")
		return
	}

	// Try to delete physical file
	uploadDir := getUploadDir()
	baseURL := strings.TrimRight(getBaseURL(), "/")
	prefix := fmt.Sprintf("%s/%s/photos/", baseURL, uploadDir)
	if strings.HasPrefix(fileURL, prefix) {
		relPath := strings.TrimPrefix(fileURL, prefix)
		localPath := filepath.Join(uploadDir, "photos", relPath)
		os.Remove(localPath)
	}

	// Delete tags
	store.DB.Exec("DELETE FROM photo_tags WHERE photo_id = ?", photoID)

	// Delete photo record
	store.DB.Exec("DELETE FROM photos WHERE id = ?", photoID)

	// Decrement storage
	store.DB.Exec("UPDATE families SET storage_used_bytes = MAX(0, storage_used_bytes - ?) WHERE id = ?", fileSize, familyID)

	OK(w, map[string]string{"deleted_photo_id": photoID})
}

// PhotoList handles GET /api/v1/photo?family_id=x&person_id=y&page=1
func PhotoList(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.URL.Query().Get("family_id")
	personID := r.URL.Query().Get("person_id")
	pageStr := r.URL.Query().Get("page")

	if familyID == "" {
		Fail(w, "缺少必填参数 (family_id)")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -2)
		return
	}

	const pageSize = 20

	if personID != "" {
		// Query photos for a specific person
		rows, err := store.DB.Query(
			`SELECT id, family_id, person_id, uploader_id, file_url, thumb_url, file_size, width, height, status, created_at, updated_at
			 FROM photos WHERE family_id = ? AND person_id = ?
			 ORDER BY created_at DESC LIMIT ?`,
			familyID, personID, maxPhotosPerPerson,
		)
		if err != nil {
			Fail(w, "查询失败")
			return
		}
		defer rows.Close()

		photos := make([]map[string]interface{}, 0)
		for rows.Next() {
			p := scanPhoto(rows)
			if p != nil {
				photos = append(photos, p)
			}
		}

		OK(w, map[string]interface{}{"photos": photos})
		return
	}

	// Paginated list for entire family
	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	offset := (page - 1) * pageSize

	// Get total count
	var total int
	store.DB.QueryRow("SELECT COUNT(*) FROM photos WHERE family_id = ?", familyID).Scan(&total)

	rows, err := store.DB.Query(
		`SELECT id, family_id, person_id, uploader_id, file_url, thumb_url, file_size, width, height, status, created_at, updated_at
		 FROM photos WHERE family_id = ?
		 ORDER BY created_at DESC LIMIT ? OFFSET ?`,
		familyID, pageSize, offset,
	)
	if err != nil {
		Fail(w, "查询失败")
		return
	}
	defer rows.Close()

	photos := make([]map[string]interface{}, 0)
	for rows.Next() {
		p := scanPhoto(rows)
		if p != nil {
			photos = append(photos, p)
		}
	}

	OK(w, map[string]interface{}{
		"photos":    photos,
		"page":      page,
		"page_size": pageSize,
		"total":     total,
	})
}

// PhotoDetail handles GET /api/v1/photo/{id}
func PhotoDetail(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	photoID := r.PathValue("id")
	if photoID == "" {
		Fail(w, "缺少参数 photo_id")
		return
	}

	// Get photo
	var id, famID, persID, uploaderID, fileURL, thumbURL, status, createdAt, updatedAt string
	var fileSize int64
	var width, height int
	err := store.DB.QueryRow(
		`SELECT id, family_id, person_id, uploader_id, file_url, thumb_url, file_size, width, height, status, created_at, updated_at
		 FROM photos WHERE id = ?`, photoID,
	).Scan(&id, &famID, &persID, &uploaderID, &fileURL, &thumbURL, &fileSize, &width, &height, &status, &createdAt, &updatedAt)
	if err != nil {
		Fail(w, "照片不存在")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, famID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -2)
		return
	}

	photo := map[string]interface{}{
		"_id":         id,
		"family_id":   famID,
		"person_id":   persID,
		"uploader_id": uploaderID,
		"file_url":    fileURL,
		"thumb_url":   thumbURL,
		"file_size":   fileSize,
		"width":       width,
		"height":      height,
		"status":      status,
		"created_at":  createdAt,
		"updated_at":  updatedAt,
	}
	if member.Role == "owner" {
		photo["owner_id"] = openid
	} else {
		photo["owner_id"] = ""
	}

	// Get tags with person names
	tagRows, err := store.DB.Query(
		"SELECT id, photo_id, person_id, x, y, tagged_by, created_at FROM photo_tags WHERE photo_id = ?",
		photoID,
	)
	if err != nil {
		Fail(w, "查询标记失败")
		return
	}
	defer tagRows.Close()

	tags := make([]map[string]interface{}, 0)
	for tagRows.Next() {
		var tagID, tagPhotoID, tagPersonID, taggedBy, tagCreatedAt string
		var x, y float64
		if err := tagRows.Scan(&tagID, &tagPhotoID, &tagPersonID, &x, &y, &taggedBy, &tagCreatedAt); err != nil {
			continue
		}

		// Look up person name
		var personName string
		store.DB.QueryRow("SELECT name FROM persons WHERE id = ?", tagPersonID).Scan(&personName)

		tags = append(tags, map[string]interface{}{
			"_id":         tagID,
			"photo_id":    tagPhotoID,
			"person_id":   tagPersonID,
			"person_name": personName,
			"x":           x,
			"y":           y,
			"tagged_by":   taggedBy,
			"created_at":  tagCreatedAt,
		})
	}

	OK(w, map[string]interface{}{
		"photo": photo,
		"tags":  tags,
	})
}

// PhotoAddTag handles POST /api/v1/photo/{id}/tag
func PhotoAddTag(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	photoID := r.PathValue("id")
	if photoID == "" {
		Fail(w, "缺少参数 photo_id")
		return
	}

	var req struct {
		PersonID string   `json:"person_id"`
		X        *float64 `json:"x"`
		Y        *float64 `json:"y"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		Fail(w, "请求格式错误")
		return
	}

	if req.PersonID == "" || req.X == nil || req.Y == nil {
		Fail(w, "缺少必填参数 (person_id, x, y)")
		return
	}

	// Validate coordinates
	if *req.X < 0 || *req.X > 1 || *req.Y < 0 || *req.Y > 1 {
		Fail(w, "标记坐标 x、y 须在 0-1 之间")
		return
	}

	// Get photo to verify family
	var famID string
	err := store.DB.QueryRow("SELECT family_id FROM photos WHERE id = ?", photoID).Scan(&famID)
	if err != nil {
		Fail(w, "照片不存在")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, famID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -2)
		return
	}

	// Create tag
	tagID := pkg.GenerateCode(16)
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = store.DB.Exec(
		"INSERT INTO photo_tags (id, photo_id, person_id, x, y, tagged_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		tagID, photoID, req.PersonID, *req.X, *req.Y, openid, now,
	)
	if err != nil {
		Fail(w, "创建标记失败")
		return
	}

	OK(w, map[string]interface{}{
		"tag_id":     tagID,
		"photo_id":   photoID,
		"person_id":  req.PersonID,
		"x":          *req.X,
		"y":          *req.Y,
		"tagged_by":  openid,
		"created_at": now,
	})
}

// PhotoRemoveTag handles DELETE /api/v1/photo/tag/{tagId}
func PhotoRemoveTag(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	tagID := r.PathValue("tagId")
	if tagID == "" {
		Fail(w, "缺少参数 tag_id")
		return
	}

	// Get tag
	var photoID, tagPersonID, taggedBy string
	var x, y float64
	err := store.DB.QueryRow(
		"SELECT photo_id, person_id, tagged_by, x, y FROM photo_tags WHERE id = ?", tagID,
	).Scan(&photoID, &tagPersonID, &taggedBy, &x, &y)
	if err != nil {
		Fail(w, "标记不存在")
		return
	}

	// Get photo to find family
	var famID string
	err = store.DB.QueryRow("SELECT family_id FROM photos WHERE id = ?", photoID).Scan(&famID)
	if err != nil {
		Fail(w, "关联照片不存在")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, famID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -2)
		return
	}

	// Permission: tagger or owner
	isTagger := taggedBy == openid
	isOwner := member.Role == "owner"
	if !isTagger && !isOwner {
		Fail(w, "无权移除该标记，只有标记者或 Owner 可移除")
		return
	}

	store.DB.Exec("DELETE FROM photo_tags WHERE id = ?", tagID)

	OK(w, map[string]string{"deleted_tag_id": tagID})
}

// scanPhoto scans a photo row into a map.
func scanPhoto(rows *sql.Rows) map[string]interface{} {
	var id, famID, persID, uploaderID, fileURL, thumbURL, status, createdAt, updatedAt string
	var fileSize int64
	var width, height int
	if err := rows.Scan(&id, &famID, &persID, &uploaderID, &fileURL, &thumbURL, &fileSize, &width, &height, &status, &createdAt, &updatedAt); err != nil {
		return nil
	}
	return map[string]interface{}{
		"_id":         id,
		"family_id":   famID,
		"person_id":   persID,
		"uploader_id": uploaderID,
		"file_url":    fileURL,
		"thumb_url":   thumbURL,
		"file_size":   fileSize,
		"width":       width,
		"height":      height,
		"status":      status,
		"created_at":  createdAt,
		"updated_at":  updatedAt,
	}
}
