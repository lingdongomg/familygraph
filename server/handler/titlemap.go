package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"familygraph/middleware"
	"familygraph/store"
)

// TitlemapCreate handles POST /api/v1/titlemap
func TitlemapCreate(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	var req struct {
		FamilyID  string                 `json:"family_id"`
		Name      string                 `json:"name"`
		Overrides map[string]interface{} `json:"overrides"`
		IsShared  *bool                  `json:"is_shared"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		Fail(w, "请求格式错误")
		return
	}

	if req.FamilyID == "" {
		Fail(w, "缺少 family_id")
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		Fail(w, "称呼表名称不能为空")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, req.FamilyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -3)
		return
	}

	// Validate overrides
	if req.Overrides == nil {
		req.Overrides = map[string]interface{}{}
	}
	for key, value := range req.Overrides {
		strVal, ok := value.(string)
		if !ok || len([]rune(strVal)) > 20 {
			Fail(w, "称谓值过长或格式错误: "+key)
			return
		}
	}

	overridesJSON, _ := json.Marshal(req.Overrides)

	isShared := 0
	if req.IsShared != nil && *req.IsShared {
		isShared = 1
	}

	now := time.Now().UTC().Format(time.RFC3339)

	var tmID string
	err = store.DB.QueryRow(
		`INSERT INTO custom_title_maps (creator_id, family_id, name, overrides, is_shared, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
		openid, req.FamilyID, strings.TrimSpace(req.Name), string(overridesJSON), isShared, now, now,
	).Scan(&tmID)
	if err != nil {
		Fail(w, "创建称呼表失败")
		return
	}

	OK(w, map[string]string{"_id": tmID})
}

// TitlemapUpdate handles PUT /api/v1/titlemap/{id}
func TitlemapUpdate(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	tmID := r.PathValue("id")
	if tmID == "" {
		Fail(w, "缺少 title_map_id")
		return
	}

	// Get existing record
	var creatorID string
	err := store.DB.QueryRow("SELECT creator_id FROM custom_title_maps WHERE id = ?", tmID).Scan(&creatorID)
	if err != nil {
		Fail(w, "称呼表不存在")
		return
	}

	if creatorID != openid {
		Fail(w, "只能编辑自己创建的称呼表")
		return
	}

	var req struct {
		Name      *string                `json:"name"`
		Overrides map[string]interface{} `json:"overrides"`
		IsShared  *bool                  `json:"is_shared"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		Fail(w, "请求格式错误")
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	setClauses := []string{"updated_at = ?"}
	args := []interface{}{now}

	if req.Name != nil {
		if strings.TrimSpace(*req.Name) == "" {
			Fail(w, "称呼表名称不能为空")
			return
		}
		setClauses = append(setClauses, "name = ?")
		args = append(args, strings.TrimSpace(*req.Name))
	}

	if req.Overrides != nil {
		for key, value := range req.Overrides {
			strVal, ok := value.(string)
			if !ok || len([]rune(strVal)) > 20 {
				Fail(w, "称谓值过长或格式错误: "+key)
				return
			}
		}
		overridesJSON, _ := json.Marshal(req.Overrides)
		setClauses = append(setClauses, "overrides = ?")
		args = append(args, string(overridesJSON))
	}

	if req.IsShared != nil {
		isShared := 0
		if *req.IsShared {
			isShared = 1
		}
		setClauses = append(setClauses, "is_shared = ?")
		args = append(args, isShared)
	}

	args = append(args, tmID)
	query := "UPDATE custom_title_maps SET " + joinStrings(setClauses, ", ") + " WHERE id = ?"
	_, err = store.DB.Exec(query, args...)
	if err != nil {
		Fail(w, "更新称呼表失败")
		return
	}

	OK(w, nil)
}

// TitlemapDelete handles DELETE /api/v1/titlemap/{id}
func TitlemapDelete(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	tmID := r.PathValue("id")
	if tmID == "" {
		Fail(w, "缺少 title_map_id")
		return
	}

	// Get existing record
	var creatorID, familyID string
	err := store.DB.QueryRow("SELECT creator_id, family_id FROM custom_title_maps WHERE id = ?", tmID).Scan(&creatorID, &familyID)
	if err != nil {
		Fail(w, "称呼表不存在")
		return
	}

	if creatorID != openid {
		Fail(w, "只能删除自己创建的称呼表")
		return
	}

	// Clear references in family_members
	store.DB.Exec(
		"UPDATE family_members SET adopted_title_map_id = NULL WHERE family_id = ? AND adopted_title_map_id = ?",
		familyID, tmID,
	)

	// Delete the title map
	store.DB.Exec("DELETE FROM custom_title_maps WHERE id = ?", tmID)

	OK(w, nil)
}

// TitlemapGet handles GET /api/v1/titlemap/{id}
func TitlemapGet(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	tmID := r.PathValue("id")
	if tmID == "" {
		Fail(w, "缺少 title_map_id")
		return
	}

	var creatorID, familyID, name, overridesStr, createdAt, updatedAt string
	var isShared int
	err := store.DB.QueryRow(
		"SELECT creator_id, family_id, name, overrides, is_shared, created_at, updated_at FROM custom_title_maps WHERE id = ?",
		tmID,
	).Scan(&creatorID, &familyID, &name, &overridesStr, &isShared, &createdAt, &updatedAt)
	if err != nil {
		Fail(w, "称呼表不存在")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -3)
		return
	}

	// Visibility: shared or own
	if isShared == 0 && creatorID != openid {
		Fail(w, "该称呼表未分享")
		return
	}

	var overrides interface{}
	if err := json.Unmarshal([]byte(overridesStr), &overrides); err != nil {
		overrides = map[string]interface{}{}
	}

	OK(w, map[string]interface{}{
		"_id":        tmID,
		"creator_id": creatorID,
		"family_id":  familyID,
		"name":       name,
		"overrides":  overrides,
		"is_shared":  isShared != 0,
		"created_at": createdAt,
		"updated_at": updatedAt,
	})
}

// TitlemapList handles GET /api/v1/titlemap?family_id=xxx
func TitlemapList(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.URL.Query().Get("family_id")
	if familyID == "" {
		Fail(w, "缺少 family_id")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -3)
		return
	}

	// Get shared + own title maps
	rows, err := store.DB.Query(
		`SELECT id, creator_id, family_id, name, overrides, is_shared, created_at, updated_at
		 FROM custom_title_maps
		 WHERE family_id = ? AND (is_shared = 1 OR creator_id = ?)
		 ORDER BY created_at DESC`,
		familyID, openid,
	)
	if err != nil {
		Fail(w, "查询失败")
		return
	}
	defer rows.Close()

	items := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, cID, fID, n, ovStr, cAt, uAt string
		var isSh int
		if err := rows.Scan(&id, &cID, &fID, &n, &ovStr, &isSh, &cAt, &uAt); err != nil {
			continue
		}

		var overrides interface{}
		if err := json.Unmarshal([]byte(ovStr), &overrides); err != nil {
			overrides = map[string]interface{}{}
		}

		items = append(items, map[string]interface{}{
			"_id":        id,
			"creator_id": cID,
			"family_id":  fID,
			"name":       n,
			"overrides":  overrides,
			"is_shared":  isSh != 0,
			"_isMine":    cID == openid,
			"created_at": cAt,
			"updated_at": uAt,
		})
	}

	OK(w, items)
}

// Ensure sql is used (for sql.NullString if needed elsewhere).
var _ = sql.ErrNoRows
