package handler

import (
	"net/http"
	"time"

	"familygraph/middleware"
	"familygraph/pkg"
	"familygraph/store"
)

// FamilyCreate handles POST /api/v1/family
func FamilyCreate(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	var req struct {
		Name             string `json:"name"`
		PersonName       string `json:"person_name"`
		PersonGender     string `json:"person_gender"`
		PersonBirthYear  *int   `json:"person_birth_year"`
	}
	if err := DecodeJSON(r, &req); err != nil || req.Name == "" || req.PersonName == "" || req.PersonGender == "" {
		Fail(w, "缺少必填参数 (name, person_name, person_gender)")
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	db := store.DB

	// Create family
	var familyID string
	err := db.QueryRow(
		"INSERT INTO families (name, owner_id, member_count, created_at, updated_at) VALUES (?, ?, 1, ?, ?) RETURNING id",
		req.Name, openid, now, now,
	).Scan(&familyID)
	if err != nil {
		Fail(w, "创建家庭失败")
		return
	}

	// Create person
	var birthYear interface{}
	if req.PersonBirthYear != nil {
		birthYear = *req.PersonBirthYear
	}
	var personID string
	err = db.QueryRow(
		"INSERT INTO persons (family_id, name, gender, birth_year, bound_user_id, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
		familyID, req.PersonName, req.PersonGender, birthYear, openid, openid, now, now,
	).Scan(&personID)
	if err != nil {
		Fail(w, "创建人物失败")
		return
	}

	// Create family_member
	_, err = db.Exec(
		"INSERT INTO family_members (family_id, user_id, person_id, bound_person_id, role, joined_at) VALUES (?, ?, ?, ?, 'owner', ?)",
		familyID, openid, personID, personID, now,
	)
	if err != nil {
		Fail(w, "创建成员记录失败")
		return
	}

	OK(w, map[string]string{"family_id": familyID, "person_id": personID})
}

// FamilyGetDetail handles GET /api/v1/family/{id}
func FamilyGetDetail(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.PathValue("id")

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}

	var f struct {
		ID               string `json:"_id"`
		Name             string `json:"name"`
		OwnerID          string `json:"owner_id"`
		MemberCount      int    `json:"member_count"`
		StorageUsed      int64  `json:"storage_used_bytes"`
		StorageUnlimited bool   `json:"storage_unlimited"`
		InviteActive     bool   `json:"invite_code_active"`
		CreatedAt        string `json:"created_at"`
		UpdatedAt        string `json:"updated_at"`
	}

	var unlimitedInt, activeInt int
	err = store.DB.QueryRow(
		"SELECT id, name, owner_id, member_count, storage_used_bytes, storage_unlimited, invite_code_active, created_at, updated_at FROM families WHERE id = ?",
		familyID,
	).Scan(&f.ID, &f.Name, &f.OwnerID, &f.MemberCount, &f.StorageUsed, &unlimitedInt, &activeInt, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		Fail(w, "家庭不存在")
		return
	}
	f.StorageUnlimited = unlimitedInt != 0
	f.InviteActive = activeInt != 0

	OK(w, f)
}

// FamilyDelete handles DELETE /api/v1/family/{id}
func FamilyDelete(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.PathValue("id")

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}
	if !store.HasPermission(member.Role, "owner") {
		Fail(w, "仅 Owner 可删除家庭")
		return
	}

	// ON DELETE CASCADE handles persons, relationships, photos, etc.
	_, err = store.DB.Exec("DELETE FROM families WHERE id = ?", familyID)
	if err != nil {
		Fail(w, "删除失败")
		return
	}

	OK(w, nil)
}

// FamilyGenInviteCode handles POST /api/v1/family/{id}/invite-code
func FamilyGenInviteCode(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.PathValue("id")

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}
	if !store.HasPermission(member.Role, "member") {
		Fail(w, "Restricted 用户无权生成邀请码")
		return
	}

	code := pkg.GenerateCode(6)
	expireAt := time.Now().Add(7 * 24 * time.Hour).UnixMilli()
	now := time.Now().UTC().Format(time.RFC3339)

	_, err = store.DB.Exec(
		"UPDATE families SET invite_code = ?, invite_code_active = 1, invite_code_expire = ?, updated_at = ? WHERE id = ?",
		code, expireAt, now, familyID,
	)
	if err != nil {
		Fail(w, "生成邀请码失败")
		return
	}

	OK(w, map[string]interface{}{"invite_code": code, "expire_at": expireAt})
}

// FamilyGenShareLink handles POST /api/v1/family/{id}/share-link
func FamilyGenShareLink(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.PathValue("id")

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}

	code := pkg.GenerateCode(6)
	now := time.Now().UnixMilli()
	expireAt := now + 7*24*60*60*1000

	var linkID string
	err = store.DB.QueryRow(
		"INSERT INTO share_links (family_id, code, created_by, expire_at, created_at) VALUES (?, ?, ?, ?, datetime('now')) RETURNING id",
		familyID, code, openid, expireAt,
	).Scan(&linkID)
	if err != nil {
		Fail(w, "生成分享链接失败")
		return
	}

	OK(w, map[string]interface{}{"share_link_id": linkID, "code": code, "expire_at": expireAt})
}

// FamilyGetByShareCode handles GET /api/v1/family/share/{code} — public, no auth
func FamilyGetByShareCode(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if code == "" {
		Fail(w, "缺少 share_code")
		return
	}

	now := time.Now().UnixMilli()

	var familyID, linkID string
	err := store.DB.QueryRow(
		"SELECT id, family_id FROM share_links WHERE code = ? AND is_active = 1 AND expire_at > ?",
		code, now,
	).Scan(&linkID, &familyID)
	if err != nil {
		Fail(w, "分享链接无效或已失效")
		return
	}

	// Increment view_count
	store.DB.Exec("UPDATE share_links SET view_count = view_count + 1 WHERE id = ?", linkID)

	// Get family name
	var familyName string
	store.DB.QueryRow("SELECT name FROM families WHERE id = ?", familyID).Scan(&familyName)

	// Get persons (guest visible fields only)
	rows, err := store.DB.Query(
		"SELECT id, name, gender, birth_year FROM persons WHERE family_id = ?", familyID,
	)
	if err != nil {
		Fail(w, "查询失败")
		return
	}
	defer rows.Close()

	var persons []map[string]interface{}
	for rows.Next() {
		var id, name, gender string
		var birthYear *int
		rows.Scan(&id, &name, &gender, &birthYear)
		p := map[string]interface{}{"_id": id, "name": name, "gender": gender, "birth_year": birthYear}
		persons = append(persons, p)
	}
	if persons == nil {
		persons = []map[string]interface{}{}
	}

	// Get relationships
	relRows, err := store.DB.Query(
		"SELECT id, from_id, to_id, relation_type FROM relationships WHERE family_id = ?", familyID,
	)
	if err != nil {
		Fail(w, "查询失败")
		return
	}
	defer relRows.Close()

	var relationships []map[string]string
	for relRows.Next() {
		var id, fromID, toID, relType string
		relRows.Scan(&id, &fromID, &toID, &relType)
		relationships = append(relationships, map[string]string{
			"_id": id, "from_id": fromID, "to_id": toID, "relation_type": relType,
		})
	}
	if relationships == nil {
		relationships = []map[string]string{}
	}

	OK(w, map[string]interface{}{
		"family_name":   familyName,
		"persons":       persons,
		"relationships": relationships,
	})
}
