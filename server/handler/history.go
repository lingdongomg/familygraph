package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"familygraph/middleware"
	"familygraph/store"
)

// rollbackFields are the person fields that can be rolled back.
var rollbackFields = []string{"name", "gender", "birth_year", "is_deceased", "avatar", "generation"}

// HistoryList handles GET /api/v1/history?family_id=xxx&page=0&page_size=20
func HistoryList(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.URL.Query().Get("family_id")
	if familyID == "" {
		Fail(w, "缺少参数 family_id")
		return
	}

	// Check membership - owner only
	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "你不是该家庭的成员", -2)
		return
	}
	if !store.HasPermission(member.Role, "owner") {
		Fail(w, "仅家庭创建者可查看编辑历史", -3)
		return
	}

	// Parse pagination
	page := 0
	if p, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil && p >= 0 {
		page = p
	}
	pageSize := 20
	if ps, err := strconv.Atoi(r.URL.Query().Get("page_size")); err == nil && ps > 0 && ps <= 100 {
		pageSize = ps
	}
	offset := page * pageSize

	// Get total
	var total int
	store.DB.QueryRow("SELECT COUNT(*) FROM edit_history WHERE family_id = ?", familyID).Scan(&total)

	// Query records
	rows, err := store.DB.Query(
		`SELECT id, family_id, person_id, action, operator_id, user_id, snapshot_before, snapshot_after, field_changes, rollback_from, is_rolled_back, created_at
		 FROM edit_history WHERE family_id = ?
		 ORDER BY created_at DESC LIMIT ? OFFSET ?`,
		familyID, pageSize, offset,
	)
	if err != nil {
		Fail(w, "查询失败")
		return
	}
	defer rows.Close()

	records := make([]map[string]interface{}, 0)
	for rows.Next() {
		rec := scanHistoryRow(rows)
		if rec != nil {
			records = append(records, rec)
		}
	}

	OK(w, map[string]interface{}{
		"records":   records,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// HistoryRollback handles POST /api/v1/history/{id}/rollback
func HistoryRollback(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	historyID := r.PathValue("id")
	if historyID == "" {
		Fail(w, "缺少参数 history_id")
		return
	}

	var req struct {
		FamilyID string `json:"family_id"`
	}
	if err := DecodeJSON(r, &req); err != nil || req.FamilyID == "" {
		Fail(w, "缺少参数 family_id")
		return
	}

	familyID := req.FamilyID

	// Check membership - owner only
	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "你不是该家庭的成员", -2)
		return
	}
	if !store.HasPermission(member.Role, "owner") {
		Fail(w, "仅家庭创建者可执行回滚操作", -3)
		return
	}

	// Get history record
	var recFamilyID, personID, action string
	var snapshotBeforeStr, snapshotAfterStr sql.NullString
	var isRolledBack int
	err = store.DB.QueryRow(
		"SELECT family_id, person_id, action, snapshot_before, snapshot_after, is_rolled_back FROM edit_history WHERE id = ?",
		historyID,
	).Scan(&recFamilyID, &personID, &action, &snapshotBeforeStr, &snapshotAfterStr, &isRolledBack)
	if err != nil {
		Fail(w, "历史记录不存在", -4)
		return
	}

	if recFamilyID != familyID {
		Fail(w, "历史记录不属于该家庭", -5)
		return
	}

	if !snapshotBeforeStr.Valid || snapshotBeforeStr.String == "" {
		Fail(w, "该历史记录没有可回滚的快照", -6)
		return
	}

	if isRolledBack != 0 {
		Fail(w, "该历史记录已被回滚", -7)
		return
	}

	// Parse snapshot_before
	var snapshotBefore map[string]interface{}
	if err := json.Unmarshal([]byte(snapshotBeforeStr.String), &snapshotBefore); err != nil {
		Fail(w, "快照数据格式错误", -6)
		return
	}

	// Get current person
	var curName, curGender, curAvatar string
	var curBirthYear sql.NullInt64
	var curIsDeceased, curGeneration int
	err = store.DB.QueryRow(
		"SELECT name, gender, birth_year, is_deceased, avatar, generation FROM persons WHERE id = ?",
		personID,
	).Scan(&curName, &curGender, &curBirthYear, &curIsDeceased, &curAvatar, &curGeneration)
	if err != nil {
		Fail(w, "关联的成员记录不存在", -8)
		return
	}

	// Build current snapshot
	currentSnapshot := map[string]interface{}{
		"name":        curName,
		"gender":      curGender,
		"is_deceased": curIsDeceased,
		"avatar":      curAvatar,
		"generation":  curGeneration,
	}
	if curBirthYear.Valid {
		currentSnapshot["birth_year"] = curBirthYear.Int64
	} else {
		currentSnapshot["birth_year"] = nil
	}

	// Restore person fields from snapshot_before
	now := time.Now().UTC().Format(time.RFC3339)

	// Build SET clause from shared fields in snapshot
	setClauses := []string{"updated_at = ?"}
	args := []interface{}{now}

	for _, field := range rollbackFields {
		val, exists := snapshotBefore[field]
		if !exists {
			continue
		}
		setClauses = append(setClauses, field+" = ?")
		if val == nil {
			args = append(args, nil)
		} else {
			args = append(args, val)
		}
	}
	args = append(args, personID)

	query := "UPDATE persons SET " + joinStrings(setClauses, ", ") + " WHERE id = ?"
	_, err = store.DB.Exec(query, args...)
	if err != nil {
		Fail(w, "回滚更新失败")
		return
	}

	// Create rollback history record
	currentSnapshotJSON, _ := json.Marshal(currentSnapshot)
	restoreSnapshotJSON, _ := json.Marshal(snapshotBefore)

	_, err = store.DB.Exec(
		`INSERT INTO edit_history (family_id, person_id, action, operator_id, user_id, snapshot_before, snapshot_after, rollback_from, created_at)
		 VALUES (?, ?, 'rollback', ?, ?, ?, ?, ?, ?)`,
		familyID, personID, openid, openid, string(currentSnapshotJSON), string(restoreSnapshotJSON), historyID, now,
	)
	if err != nil {
		Fail(w, "创建回滚记录失败")
		return
	}

	// Mark original as rolled back
	store.DB.Exec("UPDATE edit_history SET is_rolled_back = 1 WHERE id = ?", historyID)

	OK(w, map[string]interface{}{
		"person_id":       personID,
		"restored_fields": snapshotBefore,
	})
}

// scanHistoryRow scans a history row into a map.
func scanHistoryRow(rows *sql.Rows) map[string]interface{} {
	var id, famID, persID, action, operatorID string
	var userID, snapshotBefore, snapshotAfter, fieldChanges, rollbackFrom sql.NullString
	var isRolledBack int
	var createdAt string

	if err := rows.Scan(&id, &famID, &persID, &action, &operatorID, &userID, &snapshotBefore, &snapshotAfter, &fieldChanges, &rollbackFrom, &isRolledBack, &createdAt); err != nil {
		return nil
	}

	rec := map[string]interface{}{
		"_id":            id,
		"family_id":      famID,
		"person_id":      persID,
		"action":         action,
		"operator_id":    operatorID,
		"is_rolled_back": isRolledBack != 0,
		"created_at":     createdAt,
	}

	if userID.Valid {
		rec["user_id"] = userID.String
	}
	if rollbackFrom.Valid {
		rec["rollback_from"] = rollbackFrom.String
	}

	// Parse JSON fields
	if snapshotBefore.Valid && snapshotBefore.String != "" {
		var sb interface{}
		if json.Unmarshal([]byte(snapshotBefore.String), &sb) == nil {
			rec["snapshot_before"] = sb
		}
	}
	if snapshotAfter.Valid && snapshotAfter.String != "" {
		var sa interface{}
		if json.Unmarshal([]byte(snapshotAfter.String), &sa) == nil {
			rec["snapshot_after"] = sa
		}
	}
	if fieldChanges.Valid && fieldChanges.String != "" {
		var fc interface{}
		if json.Unmarshal([]byte(fieldChanges.String), &fc) == nil {
			rec["field_changes"] = fc
		}
	}

	return rec
}

// joinStrings joins string slices with a separator.
func joinStrings(parts []string, sep string) string {
	result := ""
	for i, p := range parts {
		if i > 0 {
			result += sep
		}
		result += p
	}
	return result
}
