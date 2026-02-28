package handler

import (
	"database/sql"
	"net/http"
	"time"

	"familygraph/middleware"
	"familygraph/pkg"
	"familygraph/store"
)

// MemberApplyJoin handles POST /api/v1/member/join
// Validates invite code, checks user not already member, checks person exists and not bound,
// creates join_request with 48h expiry.
func MemberApplyJoin(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	var req struct {
		InviteCode string `json:"invite_code"`
		PersonID   string `json:"person_id"`
	}
	if err := DecodeJSON(r, &req); err != nil || req.InviteCode == "" || req.PersonID == "" {
		Fail(w, "缺少必要参数")
		return
	}

	db := store.DB
	now := time.Now().UnixMilli()

	// Validate invite code: active, not expired
	var familyID string
	err := db.QueryRow(
		"SELECT id FROM families WHERE invite_code = ? AND invite_code_active = 1 AND invite_code_expire > ?",
		req.InviteCode, now,
	).Scan(&familyID)
	if err != nil {
		Fail(w, "邀请码无效或已过期")
		return
	}

	// Check user not already a member
	existing, err := store.CheckMembership(openid, familyID)
	if err != nil {
		Fail(w, "查询成员状态失败")
		return
	}
	if existing != nil {
		Fail(w, "您已是该家庭成员")
		return
	}

	// Check person exists in this family and is not bound
	var personBoundUserID sql.NullString
	err = db.QueryRow(
		"SELECT bound_user_id FROM persons WHERE id = ? AND family_id = ?",
		req.PersonID, familyID,
	).Scan(&personBoundUserID)
	if err == sql.ErrNoRows {
		Fail(w, "该成员不存在于此家庭中")
		return
	}
	if err != nil {
		Fail(w, "查询人物失败")
		return
	}
	if personBoundUserID.Valid && personBoundUserID.String != "" {
		Fail(w, "该成员已被其他用户绑定")
		return
	}

	// Create join request with 48h expiry
	expireAt := now + 48*60*60*1000
	var requestID string
	err = db.QueryRow(
		"INSERT INTO join_requests (family_id, user_id, person_id, status, expire_at, created_at) VALUES (?, ?, ?, 'pending', ?, datetime('now')) RETURNING id",
		familyID, openid, req.PersonID, expireAt,
	).Scan(&requestID)
	if err != nil {
		Fail(w, "创建加入申请失败")
		return
	}

	OK(w, map[string]string{"request_id": requestID})
}

// MemberReviewJoin handles POST /api/v1/member/review
// Approves or rejects join request. On approval: creates family_member, binds person's bound_user_id.
func MemberReviewJoin(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	var req struct {
		RequestID    string  `json:"request_id"`
		Approved     *bool   `json:"approved"`
		RejectReason string  `json:"reject_reason"`
	}
	if err := DecodeJSON(r, &req); err != nil || req.RequestID == "" || req.Approved == nil {
		Fail(w, "缺少必要参数")
		return
	}

	db := store.DB

	// Get join request
	var jr struct {
		ID       string
		FamilyID string
		UserID   string
		PersonID sql.NullString
		Status   string
	}
	err := db.QueryRow(
		"SELECT id, family_id, user_id, person_id, status FROM join_requests WHERE id = ?",
		req.RequestID,
	).Scan(&jr.ID, &jr.FamilyID, &jr.UserID, &jr.PersonID, &jr.Status)
	if err == sql.ErrNoRows {
		Fail(w, "加入申请不存在")
		return
	}
	if err != nil {
		Fail(w, "查询申请失败")
		return
	}

	if jr.Status != "pending" {
		Fail(w, "该申请已处理")
		return
	}

	// Check reviewer has permission (Owner or Member)
	reviewer, err := store.CheckMembership(openid, jr.FamilyID)
	if err != nil || reviewer == nil || !store.HasPermission(reviewer.Role, "member") {
		Fail(w, "无权审批该申请")
		return
	}

	nowStr := time.Now().UTC().Format(time.RFC3339)

	if *req.Approved {
		// Approve: update join_request status
		_, err = db.Exec(
			"UPDATE join_requests SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
			openid, nowStr, req.RequestID,
		)
		if err != nil {
			Fail(w, "更新申请状态失败")
			return
		}

		// Create family_member record
		personID := jr.PersonID.String
		_, err = db.Exec(
			"INSERT INTO family_members (family_id, user_id, person_id, bound_person_id, role, joined_at) VALUES (?, ?, ?, ?, 'member', ?)",
			jr.FamilyID, jr.UserID, personID, personID, nowStr,
		)
		if err != nil {
			Fail(w, "创建成员记录失败")
			return
		}

		// Bind person's bound_user_id
		if jr.PersonID.Valid {
			_, err = db.Exec(
				"UPDATE persons SET bound_user_id = ? WHERE id = ?",
				jr.UserID, personID,
			)
			if err != nil {
				Fail(w, "绑定人物失败")
				return
			}
		}

		// Note: skip family_ids push (field removed)

		OK(w, map[string]string{"status": "approved"})
	} else {
		// Reject
		if req.RejectReason != "" {
			_, err = db.Exec(
				"UPDATE join_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, reject_reason = ? WHERE id = ?",
				openid, nowStr, req.RejectReason, req.RequestID,
			)
		} else {
			_, err = db.Exec(
				"UPDATE join_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
				openid, nowStr, req.RequestID,
			)
		}
		if err != nil {
			Fail(w, "更新申请状态失败")
			return
		}

		OK(w, map[string]string{"status": "rejected"})
	}
}

// MemberValidateInvite handles GET /api/v1/member/validate-invite?code=xxx
// Returns family info and unbound persons list.
func MemberValidateInvite(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		Fail(w, "缺少邀请码")
		return
	}

	db := store.DB
	now := time.Now().UnixMilli()

	// Find active, non-expired family by invite code
	var familyID, familyName string
	err := db.QueryRow(
		"SELECT id, name FROM families WHERE invite_code = ? AND invite_code_active = 1 AND invite_code_expire > ?",
		code, now,
	).Scan(&familyID, &familyName)
	if err != nil {
		Fail(w, "邀请码无效或已过期")
		return
	}

	// Get persons in this family (shared fields only)
	rows, err := db.Query(
		"SELECT id, name, gender, birth_year, bound_user_id FROM persons WHERE family_id = ?",
		familyID,
	)
	if err != nil {
		Fail(w, "查询人物失败")
		return
	}
	defer rows.Close()

	type personInfo struct {
		ID          string  `json:"_id"`
		Name        string  `json:"name"`
		Gender      string  `json:"gender"`
		BirthYear   *int    `json:"birth_year"`
		BoundUserID *string `json:"bound_user_id"`
	}
	var persons []personInfo
	for rows.Next() {
		var p personInfo
		var gender sql.NullString
		var birthYear sql.NullInt64
		var boundUID sql.NullString
		if err := rows.Scan(&p.ID, &p.Name, &gender, &birthYear, &boundUID); err != nil {
			continue
		}
		if gender.Valid {
			p.Gender = gender.String
		}
		if birthYear.Valid {
			by := int(birthYear.Int64)
			p.BirthYear = &by
		}
		if boundUID.Valid && boundUID.String != "" {
			s := boundUID.String
			p.BoundUserID = &s
		}
		persons = append(persons, p)
	}
	if persons == nil {
		persons = []personInfo{}
	}

	OK(w, map[string]interface{}{
		"family_id":   familyID,
		"family_name": familyName,
		"persons":     persons,
	})
}

// MemberListRequests handles GET /api/v1/member/requests?family_id=xxx
// Lists join requests with person name and applicant nickname.
func MemberListRequests(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.URL.Query().Get("family_id")
	if familyID == "" {
		Fail(w, "缺少必要参数")
		return
	}

	// Check caller is a member with at least 'member' role
	membership, err := store.CheckMembership(openid, familyID)
	if err != nil || membership == nil {
		Fail(w, "您不是该家庭成员")
		return
	}
	if !store.HasPermission(membership.Role, "member") {
		Fail(w, "权限不足")
		return
	}

	db := store.DB

	// Get join requests ordered by created_at desc, limit 50
	rows, err := db.Query(
		"SELECT id, family_id, user_id, person_id, status, reviewed_by, reviewed_at, reject_reason, expire_at, created_at FROM join_requests WHERE family_id = ? ORDER BY created_at DESC LIMIT 50",
		familyID,
	)
	if err != nil {
		Fail(w, "查询申请列表失败")
		return
	}
	defer rows.Close()

	type joinRequestInfo struct {
		ID               string  `json:"_id"`
		FamilyID         string  `json:"family_id"`
		UserID           string  `json:"user_id"`
		PersonID         *string `json:"person_id"`
		Status           string  `json:"status"`
		ReviewedBy       *string `json:"reviewed_by"`
		ReviewedAt       *string `json:"reviewed_at"`
		RejectReason     *string `json:"reject_reason"`
		ExpireAt         *int64  `json:"expire_at"`
		CreatedAt        string  `json:"created_at"`
		PersonName       string  `json:"person_name"`
		PersonGender     string  `json:"person_gender"`
		ApplicantNickname string `json:"applicant_nickname"`
		ApplicantAvatar  string  `json:"applicant_avatar"`
	}

	var requests []joinRequestInfo
	for rows.Next() {
		var jr joinRequestInfo
		var personID, reviewedBy, reviewedAt, rejectReason sql.NullString
		var expireAt sql.NullInt64
		if err := rows.Scan(
			&jr.ID, &jr.FamilyID, &jr.UserID, &personID,
			&jr.Status, &reviewedBy, &reviewedAt, &rejectReason,
			&expireAt, &jr.CreatedAt,
		); err != nil {
			continue
		}
		if personID.Valid {
			s := personID.String
			jr.PersonID = &s
		}
		if reviewedBy.Valid {
			s := reviewedBy.String
			jr.ReviewedBy = &s
		}
		if reviewedAt.Valid {
			s := reviewedAt.String
			jr.ReviewedAt = &s
		}
		if rejectReason.Valid {
			s := rejectReason.String
			jr.RejectReason = &s
		}
		if expireAt.Valid {
			jr.ExpireAt = &expireAt.Int64
		}
		requests = append(requests, jr)
	}

	// Enrich each request with person name/gender and applicant info
	for i := range requests {
		if requests[i].PersonID != nil && *requests[i].PersonID != "" {
			var name, gender sql.NullString
			err := db.QueryRow(
				"SELECT name, gender FROM persons WHERE id = ?", *requests[i].PersonID,
			).Scan(&name, &gender)
			if err == nil {
				if name.Valid {
					requests[i].PersonName = name.String
				}
				if gender.Valid {
					requests[i].PersonGender = gender.String
				}
			}
		}
		// Get applicant user info via openid hash
		if requests[i].UserID != "" {
			appHash := pkg.HashOpenID(requests[i].UserID)
			var nickname, avatarURL sql.NullString
			err := db.QueryRow(
				"SELECT nickname, avatar_url FROM users WHERE openid_hash = ?", appHash,
			).Scan(&nickname, &avatarURL)
			if err == nil {
				if nickname.Valid && nickname.String != "" {
					requests[i].ApplicantNickname = nickname.String
				} else {
					requests[i].ApplicantNickname = "微信用户"
				}
				if avatarURL.Valid {
					requests[i].ApplicantAvatar = avatarURL.String
				}
			}
		}
	}

	if requests == nil {
		requests = []joinRequestInfo{}
	}

	OK(w, map[string]interface{}{"requests": requests})
}

// MemberLeave handles POST /api/v1/member/leave
// Owner cannot leave. Deletes family_member, unbinds person.
func MemberLeave(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	var req struct {
		FamilyID string `json:"family_id"`
	}
	if err := DecodeJSON(r, &req); err != nil || req.FamilyID == "" {
		Fail(w, "缺少必要参数")
		return
	}

	member, err := store.CheckMembership(openid, req.FamilyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭成员")
		return
	}

	if member.Role == "owner" {
		Fail(w, "Owner 不能直接退出家庭，请先转让所有权")
		return
	}

	db := store.DB

	// Delete family_member record
	_, err = db.Exec("DELETE FROM family_members WHERE id = ?", member.ID)
	if err != nil {
		Fail(w, "退出失败")
		return
	}

	// Unbind person (set bound_user_id to NULL)
	_, err = db.Exec(
		"UPDATE persons SET bound_user_id = NULL WHERE family_id = ? AND bound_user_id = ?",
		req.FamilyID, openid,
	)
	if err != nil {
		Fail(w, "解绑人物失败")
		return
	}

	// Note: skip family_ids pull (field removed)

	OK(w, nil)
}

// MemberChangeRole handles PUT /api/v1/member/{id}/role
// Only owner can change roles between member/restricted.
func MemberChangeRole(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	memberID := r.PathValue("id")

	var req struct {
		FamilyID    string `json:"family_id"`
		TargetUserID string `json:"target_user_id"`
		NewRole     string `json:"new_role"`
	}
	if err := DecodeJSON(r, &req); err != nil || req.FamilyID == "" || req.TargetUserID == "" || req.NewRole == "" {
		Fail(w, "缺少必要参数")
		return
	}

	// Validate new_role
	if req.NewRole != "member" && req.NewRole != "restricted" {
		Fail(w, "无效的角色，仅支持 member 或 restricted")
		return
	}

	// Cannot change own role
	if req.TargetUserID == openid {
		Fail(w, "不能修改自己的角色")
		return
	}

	// Check operator is owner
	operator, err := store.CheckMembership(openid, req.FamilyID)
	if err != nil || operator == nil || operator.Role != "owner" {
		Fail(w, "仅 Owner 可修改成员角色")
		return
	}

	// Check target is a member of this family
	target, err := store.CheckMembership(req.TargetUserID, req.FamilyID)
	if err != nil || target == nil {
		Fail(w, "目标用户不是该家庭成员")
		return
	}

	db := store.DB

	// Use memberID from path if available, otherwise use target's ID
	updateID := target.ID
	if memberID != "" {
		updateID = memberID
	}

	_, err = db.Exec("UPDATE family_members SET role = ? WHERE id = ?", req.NewRole, updateID)
	if err != nil {
		Fail(w, "修改角色失败")
		return
	}

	OK(w, map[string]string{"new_role": req.NewRole})
}

// MemberList handles GET /api/v1/member?family_id=xxx
// Lists members with user nicknames.
func MemberList(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.URL.Query().Get("family_id")
	if familyID == "" {
		Fail(w, "缺少必要参数")
		return
	}

	// Check caller is a family member
	caller, err := store.CheckMembership(openid, familyID)
	if err != nil || caller == nil {
		Fail(w, "您不是该家庭成员")
		return
	}

	db := store.DB

	// Get all members of the family
	rows, err := db.Query(
		"SELECT id, family_id, user_id, person_id, bound_person_id, role, adopted_title_map_id, joined_at FROM family_members WHERE family_id = ?",
		familyID,
	)
	if err != nil {
		Fail(w, "查询成员列表失败")
		return
	}
	defer rows.Close()

	type memberInfo struct {
		ID                string `json:"_id"`
		UserID            string `json:"user_id"`
		OpenIDHash        string `json:"openid_hash"`
		Role              string `json:"role"`
		CreatedAt         string `json:"created_at"`
		Nickname          string `json:"nickname"`
		AvatarURL         string `json:"avatar_url"`
	}

	// Collect members and their user_ids
	type rawMember struct {
		ID        string
		UserID    string
		Role      string
		JoinedAt  string
	}

	var rawMembers []rawMember
	for rows.Next() {
		var m rawMember
		var personID, boundPersonID, adoptedTitleMapID sql.NullString
		var familyIDVal string
		if err := rows.Scan(&m.ID, &familyIDVal, &m.UserID, &personID, &boundPersonID, &m.Role, &adoptedTitleMapID, &m.JoinedAt); err != nil {
			continue
		}
		rawMembers = append(rawMembers, m)
	}

	if len(rawMembers) == 0 {
		OK(w, []interface{}{})
		return
	}

	// Build a map of openid_hash -> user info by querying users
	userMap := make(map[string]struct {
		Nickname  string
		AvatarURL string
	})
	for _, m := range rawMembers {
		h := pkg.HashOpenID(m.UserID)
		if _, exists := userMap[h]; !exists {
			var nickname, avatarURL sql.NullString
			err := db.QueryRow(
				"SELECT nickname, avatar_url FROM users WHERE openid_hash = ?", h,
			).Scan(&nickname, &avatarURL)
			if err == nil {
				n := ""
				a := ""
				if nickname.Valid {
					n = nickname.String
				}
				if avatarURL.Valid {
					a = avatarURL.String
				}
				userMap[h] = struct {
					Nickname  string
					AvatarURL string
				}{n, a}
			}
		}
	}

	// Build result
	var result []memberInfo
	for _, m := range rawMembers {
		h := pkg.HashOpenID(m.UserID)
		info := memberInfo{
			ID:         m.ID,
			UserID:     m.UserID,
			OpenIDHash: h,
			Role:       m.Role,
			CreatedAt:  m.JoinedAt,
		}
		if u, ok := userMap[h]; ok {
			info.Nickname = u.Nickname
			info.AvatarURL = u.AvatarURL
		}
		result = append(result, info)
	}

	if result == nil {
		result = []memberInfo{}
	}

	OK(w, result)
}

// MemberGetSelf handles GET /api/v1/member/self?family_id=xxx
// Returns caller's membership info.
func MemberGetSelf(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.URL.Query().Get("family_id")
	if familyID == "" {
		Fail(w, "缺少 family_id")
		return
	}

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭成员")
		return
	}

	adoptedTitleMapID := ""
	if member.AdoptedTitleMapID.Valid {
		adoptedTitleMapID = member.AdoptedTitleMapID.String
	}

	OK(w, map[string]interface{}{
		"_id":                  member.ID,
		"role":                 member.Role,
		"adopted_title_map_id": adoptedTitleMapID,
	})
}

// MemberUpdateTitleMap handles PUT /api/v1/member/{id}/title-map
// Sets or clears adopted_title_map_id.
func MemberUpdateTitleMap(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	_ = r.PathValue("id") // member id from path (for route matching)

	var req struct {
		FamilyID   string  `json:"family_id"`
		TitleMapID *string `json:"title_map_id"`
	}
	if err := DecodeJSON(r, &req); err != nil || req.FamilyID == "" {
		Fail(w, "缺少 family_id")
		return
	}

	member, err := store.CheckMembership(openid, req.FamilyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭成员")
		return
	}

	db := store.DB

	if req.TitleMapID != nil && *req.TitleMapID != "" {
		titleMapID := *req.TitleMapID

		// Validate the title map exists and is usable
		var tmFamilyID string
		var tmIsShared int
		var tmCreatorID string
		err := db.QueryRow(
			"SELECT family_id, is_shared, creator_id FROM custom_title_maps WHERE id = ?",
			titleMapID,
		).Scan(&tmFamilyID, &tmIsShared, &tmCreatorID)
		if err == sql.ErrNoRows {
			Fail(w, "称呼表不存在")
			return
		}
		if err != nil {
			Fail(w, "查询称呼表失败")
			return
		}

		if tmFamilyID != req.FamilyID {
			Fail(w, "称呼表不属于该家庭")
			return
		}
		if tmIsShared == 0 && tmCreatorID != openid {
			Fail(w, "该称呼表未分享")
			return
		}

		_, err = db.Exec(
			"UPDATE family_members SET adopted_title_map_id = ? WHERE id = ?",
			titleMapID, member.ID,
		)
		if err != nil {
			Fail(w, "更新称呼表失败")
			return
		}
	} else {
		// Clear adopted title map
		_, err = db.Exec(
			"UPDATE family_members SET adopted_title_map_id = NULL WHERE id = ?",
			member.ID,
		)
		if err != nil {
			Fail(w, "清除称呼表失败")
			return
		}
	}

	OK(w, nil)
}
