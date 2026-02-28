package handler

import (
	"net/http"
	"time"

	"familygraph/middleware"
	"familygraph/store"
)

const editHistoryRetainDays = 90

// AdminSetStorageUnlimited handles POST /api/v1/admin/set-storage-unlimited
func AdminSetStorageUnlimited(w http.ResponseWriter, r *http.Request) {
	_ = middleware.GetOpenID(r) // authenticated but no further role check (developer tool)

	var req struct {
		FamilyID  string `json:"family_id"`
		Unlimited *bool  `json:"unlimited"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		Fail(w, "请求格式错误")
		return
	}

	if req.FamilyID == "" {
		Fail(w, "缺少参数 family_id")
		return
	}
	if req.Unlimited == nil {
		Fail(w, "参数 unlimited 必须为布尔值")
		return
	}

	unlimitedInt := 0
	if *req.Unlimited {
		unlimitedInt = 1
	}

	now := time.Now().UTC().Format(time.RFC3339)
	_, err := store.DB.Exec(
		"UPDATE families SET storage_unlimited = ?, updated_at = ? WHERE id = ?",
		unlimitedInt, now, req.FamilyID,
	)
	if err != nil {
		Fail(w, "更新失败: "+err.Error())
		return
	}

	OK(w, map[string]interface{}{
		"family_id":         req.FamilyID,
		"storage_unlimited": *req.Unlimited,
	})
}

// AdminCleanup handles POST /api/v1/admin/cleanup
func AdminCleanup(w http.ResponseWriter, r *http.Request) {
	_ = middleware.GetOpenID(r) // authenticated

	nowMs := time.Now().UnixMilli()

	results := map[string]int{
		"expired_invite_codes":  0,
		"expired_join_requests": 0,
		"expired_share_links":   0,
		"deleted_edit_history":  0,
	}

	// 1. Expire old invite codes: invite_code_active = 1 AND invite_code_expire < now
	res, err := store.DB.Exec(
		"UPDATE families SET invite_code_active = 0 WHERE invite_code_active = 1 AND invite_code_expire < ?",
		nowMs,
	)
	if err == nil {
		n, _ := res.RowsAffected()
		results["expired_invite_codes"] = int(n)
	}

	// 2. Expire old join requests: status = 'pending' AND expire_at < now
	res, err = store.DB.Exec(
		"UPDATE join_requests SET status = 'expired' WHERE status = 'pending' AND expire_at < ?",
		nowMs,
	)
	if err == nil {
		n, _ := res.RowsAffected()
		results["expired_join_requests"] = int(n)
	}

	// 3. Expire old share links: is_active = 1 AND expire_at < now
	res, err = store.DB.Exec(
		"UPDATE share_links SET is_active = 0 WHERE is_active = 1 AND expire_at < ?",
		nowMs,
	)
	if err == nil {
		n, _ := res.RowsAffected()
		results["expired_share_links"] = int(n)
	}

	// 4. Delete old edit_history: created_at < 90 days ago
	cutoff := time.Now().Add(-time.Duration(editHistoryRetainDays) * 24 * time.Hour).UTC().Format(time.RFC3339)
	res, err = store.DB.Exec(
		"DELETE FROM edit_history WHERE created_at < ?",
		cutoff,
	)
	if err == nil {
		n, _ := res.RowsAffected()
		results["deleted_edit_history"] = int(n)
	}

	OK(w, results)
}
