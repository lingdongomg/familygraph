package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"familygraph/middleware"
	"familygraph/pkg"
	"familygraph/store"
)

// ── Constants ported from cloudfunctions/person/utils/constants.js ──

var personSharedFields = []string{"name", "gender", "birth_year", "avatar", "generation"}
var privateOverlayFields = []string{"phone", "wechat_id", "birth_date", "city", "occupation", "custom_title", "remarks"}
var encryptedFields = map[string]bool{"phone": true, "wechat_id": true}

var relationTypes = map[string]bool{
	"FATHER": true, "MOTHER": true, "SON": true, "DAUGHTER": true,
	"HUSBAND": true, "WIFE": true,
	"OLDER_BROTHER": true, "YOUNGER_BROTHER": true, "OLDER_SISTER": true, "YOUNGER_SISTER": true,
}

// reverseRelation maps relation_type -> { "male": ..., "female": ... }
var reverseRelation = map[string]map[string]string{
	"FATHER":          {"male": "SON", "female": "DAUGHTER"},
	"MOTHER":          {"male": "SON", "female": "DAUGHTER"},
	"SON":             {"male": "FATHER", "female": "MOTHER"},
	"DAUGHTER":        {"male": "FATHER", "female": "MOTHER"},
	"HUSBAND":         {"male": "WIFE", "female": "WIFE"},
	"WIFE":            {"male": "HUSBAND", "female": "HUSBAND"},
	"OLDER_BROTHER":   {"male": "YOUNGER_BROTHER", "female": "YOUNGER_SISTER"},
	"YOUNGER_BROTHER": {"male": "OLDER_BROTHER", "female": "OLDER_SISTER"},
	"OLDER_SISTER":    {"male": "YOUNGER_BROTHER", "female": "YOUNGER_SISTER"},
	"YOUNGER_SISTER":  {"male": "OLDER_BROTHER", "female": "OLDER_SISTER"},
}

var generationDelta = map[string]int{
	"FATHER": -1, "MOTHER": -1,
	"SON": 1, "DAUGHTER": 1,
	"HUSBAND": 0, "WIFE": 0,
	"OLDER_BROTHER": 0, "YOUNGER_BROTHER": 0,
	"OLDER_SISTER": 0, "YOUNGER_SISTER": 0,
}

var siblingTypes = map[string]bool{
	"OLDER_BROTHER": true, "YOUNGER_BROTHER": true,
	"OLDER_SISTER": true, "YOUNGER_SISTER": true,
}
var childTypes = map[string]bool{"SON": true, "DAUGHTER": true}
var parentTypes = map[string]bool{"FATHER": true, "MOTHER": true}
var spouseTypes = map[string]bool{"HUSBAND": true, "WIFE": true}

// siblingTypesList etc. for SQL IN clauses
var siblingTypesList = []string{"OLDER_BROTHER", "YOUNGER_BROTHER", "OLDER_SISTER", "YOUNGER_SISTER"}
var childTypesList = []string{"SON", "DAUGHTER"}
var parentTypesList = []string{"FATHER", "MOTHER"}
var spouseTypesList = []string{"HUSBAND", "WIFE"}

// ── Helpers ──

// reverseRelType looks up the reverse relation given the ref person's gender.
func reverseRelType(relType, refGender string) string {
	m, ok := reverseRelation[relType]
	if !ok {
		return ""
	}
	if v, ok := m[refGender]; ok {
		return v
	}
	return m["male"]
}

// relExists checks if a relationship from_id -> to_id already exists in the family.
func relExists(familyID, fromID, toID string) (bool, error) {
	var cnt int
	err := store.DB.QueryRow(
		"SELECT COUNT(*) FROM relationships WHERE family_id = ? AND from_id = ? AND to_id = ?",
		familyID, fromID, toID,
	).Scan(&cnt)
	if err != nil {
		return false, err
	}
	return cnt > 0, nil
}

// insertRel inserts a relationship row.
func insertRel(familyID, fromID, toID, relType, now string) error {
	_, err := store.DB.Exec(
		"INSERT INTO relationships (family_id, from_id, to_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?)",
		familyID, fromID, toID, relType, now,
	)
	return err
}

// getPersonGender fetches the gender of a person by id.
func getPersonGender(personID string) (string, error) {
	var gender string
	err := store.DB.QueryRow("SELECT gender FROM persons WHERE id = ?", personID).Scan(&gender)
	return gender, err
}

// inPlaceholders builds a "?,?,?" string and args slice for a SQL IN clause.
func inPlaceholders(types []string) (string, []interface{}) {
	ph := ""
	args := make([]interface{}, len(types))
	for i, t := range types {
		if i > 0 {
			ph += ","
		}
		ph += "?"
		args[i] = t
	}
	return ph, args
}

// ────────────────────────────────────────
// PersonCreate — POST /api/v1/person
// ────────────────────────────────────────
func PersonCreate(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	var req struct {
		FamilyID          string `json:"family_id"`
		Name              string `json:"name"`
		Gender            string `json:"gender"`
		BirthYear         *int   `json:"birth_year"`
		ReferencePersonID string `json:"reference_person_id"`
		RelationType      string `json:"relation_type"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		Fail(w, "缺少必填参数")
		return
	}
	if req.FamilyID == "" || req.Name == "" || req.Gender == "" {
		Fail(w, "缺少必填参数")
		return
	}

	isFirstMember := req.ReferencePersonID == ""
	if !isFirstMember && req.RelationType == "" {
		Fail(w, "指定了参照成员时必须选择关系类型")
		return
	}
	if req.RelationType != "" && !relationTypes[req.RelationType] {
		Fail(w, "无效的关系类型: "+req.RelationType)
		return
	}

	member, err := store.CheckMembership(openid, req.FamilyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}
	if !store.HasPermission(member.Role, "member") {
		Fail(w, "Restricted 用户无权创建成员")
		return
	}

	generation := 0

	if !isFirstMember {
		var refFamilyID string
		var refGeneration int
		err := store.DB.QueryRow(
			"SELECT family_id, generation FROM persons WHERE id = ?", req.ReferencePersonID,
		).Scan(&refFamilyID, &refGeneration)
		if err != nil || refFamilyID != req.FamilyID {
			Fail(w, "参照成员不存在或不属于该家庭")
			return
		}
		delta, ok := generationDelta[req.RelationType]
		if !ok {
			Fail(w, "无法计算辈分差")
			return
		}
		generation = refGeneration + delta
	}

	now := time.Now().UTC().Format(time.RFC3339)
	db := store.DB

	// Create person record
	var birthYear interface{}
	if req.BirthYear != nil {
		birthYear = *req.BirthYear
	}

	var newPersonID string
	err = db.QueryRow(
		`INSERT INTO persons (family_id, name, gender, birth_year, avatar, avatar_public, generation, bound_user_id, created_by, created_at, updated_at)
		 VALUES (?, ?, ?, ?, '', 0, ?, NULL, ?, ?, ?)
		 RETURNING id`,
		req.FamilyID, req.Name, req.Gender, birthYear, generation, openid, now, now,
	).Scan(&newPersonID)
	if err != nil {
		Fail(w, "创建成员失败")
		return
	}

	// Create relationships when a reference person is provided
	if !isFirstMember {
		// Re-fetch reference person's gender for reverse relation
		refGender, err := getPersonGender(req.ReferencePersonID)
		if err != nil {
			log.Printf("[PersonCreate] get ref gender: %v", err)
		}

		// Forward relationship: new person -> reference person
		if err := insertRel(req.FamilyID, newPersonID, req.ReferencePersonID, req.RelationType, now); err != nil {
			log.Printf("[PersonCreate] insert forward rel: %v", err)
		}

		// Reverse relationship: reference person -> new person
		revMap := reverseRelation[req.RelationType]
		if revMap != nil {
			reverseType := revMap[refGender]
			if reverseType == "" {
				reverseType = revMap["male"]
			}
			if err := insertRel(req.FamilyID, req.ReferencePersonID, newPersonID, reverseType, now); err != nil {
				log.Printf("[PersonCreate] insert reverse rel: %v", err)
			}
		}

		// ── Infer additional edges ──

		// Rule 1: Sibling -> inherit parent edges from reference person
		if siblingTypes[req.RelationType] {
			inferRule1SiblingParents(req.FamilyID, newPersonID, req.ReferencePersonID, req.Gender, now)
		}

		// Rule 2: Child -> inherit parent edge from reference person's spouse
		if childTypes[req.RelationType] {
			inferRule2ChildSpouseParent(req.FamilyID, newPersonID, req.ReferencePersonID, req.RelationType, now)

			// Rule 6: Child -> inherit sibling edges from reference person's other children
			inferRule6ChildSiblings(req.FamilyID, newPersonID, req.ReferencePersonID, req.Gender, now)
		}

		// Rule 3: Parent -> inherit child edges from reference person's siblings
		if parentTypes[req.RelationType] {
			inferRule3ParentChildFromSiblings(req.FamilyID, newPersonID, req.ReferencePersonID, req.RelationType, now)

			// Rule 4: Parent -> inherit spouse edge from reference person's other parent
			inferRule4ParentSpouse(req.FamilyID, newPersonID, req.ReferencePersonID, req.Gender, now)
		}

		// Rule 5: Sibling -> inherit sibling edges from reference person's other siblings
		if siblingTypes[req.RelationType] {
			inferRule5SiblingSiblings(req.FamilyID, newPersonID, req.ReferencePersonID, req.Gender, now)
		}

		// Rule 7: Spouse -> inherit child edges from reference person's children
		if spouseTypes[req.RelationType] {
			inferRule7SpouseChildren(req.FamilyID, newPersonID, req.ReferencePersonID, req.Gender, now)
		}
	}

	// Increment family member_count
	_, _ = db.Exec(
		"UPDATE families SET member_count = member_count + 1, updated_at = ? WHERE id = ?",
		now, req.FamilyID,
	)

	// Create edit_history record
	_, _ = db.Exec(
		"INSERT INTO edit_history (family_id, person_id, action, operator_id, snapshot_before, field_changes, created_at) VALUES (?, ?, 'create', ?, NULL, NULL, ?)",
		req.FamilyID, newPersonID, openid, now,
	)

	OK(w, map[string]string{"person_id": newPersonID})
}

// ── Inference Rule Implementations ──

// Rule 1: Sibling -> inherit parent edges from reference person.
// Find edges where someone is FATHER/MOTHER of ref, create same toward new person.
func inferRule1SiblingParents(familyID, newPersonID, refPersonID, newGender, now string) {
	ph, phArgs := inPlaceholders(parentTypesList)
	args := append([]interface{}{familyID, refPersonID}, phArgs...)

	rows, err := store.DB.Query(
		"SELECT from_id, relation_type FROM relationships WHERE family_id = ? AND to_id = ? AND relation_type IN ("+ph+")",
		args...,
	)
	if err != nil {
		log.Printf("[Rule1] query parent edges: %v", err)
		return
	}
	defer rows.Close()

	type edge struct {
		parentID string
		relType  string
	}
	var edges []edge
	for rows.Next() {
		var e edge
		rows.Scan(&e.parentID, &e.relType)
		edges = append(edges, e)
	}

	for _, e := range edges {
		exists, _ := relExists(familyID, e.parentID, newPersonID)
		if exists {
			continue
		}

		// parent -> new person (FATHER/MOTHER)
		insertRel(familyID, e.parentID, newPersonID, e.relType, now)

		// new person -> parent (SON/DAUGHTER based on new person's gender)
		childType := "SON"
		if newGender == "female" {
			childType = "DAUGHTER"
		}
		insertRel(familyID, newPersonID, e.parentID, childType, now)
	}
}

// Rule 2: Child -> inherit parent edge from reference person's spouse.
func inferRule2ChildSpouseParent(familyID, newPersonID, refPersonID, relationType, now string) {
	ph, phArgs := inPlaceholders(spouseTypesList)
	args := append([]interface{}{familyID, refPersonID}, phArgs...)

	rows, err := store.DB.Query(
		"SELECT to_id FROM relationships WHERE family_id = ? AND from_id = ? AND relation_type IN ("+ph+")",
		args...,
	)
	if err != nil {
		log.Printf("[Rule2] query spouse edges: %v", err)
		return
	}
	defer rows.Close()

	var spouseIDs []string
	for rows.Next() {
		var sid string
		rows.Scan(&sid)
		spouseIDs = append(spouseIDs, sid)
	}

	for _, spouseID := range spouseIDs {
		exists, _ := relExists(familyID, spouseID, newPersonID)
		if exists {
			continue
		}

		spouseGender, err := getPersonGender(spouseID)
		if err != nil {
			continue
		}

		// spouse -> new person (FATHER/MOTHER based on spouse gender)
		parentType := "FATHER"
		if spouseGender == "female" {
			parentType = "MOTHER"
		}
		insertRel(familyID, spouseID, newPersonID, parentType, now)

		// new person -> spouse (SON/DAUGHTER — same as the relation_type used to create)
		insertRel(familyID, newPersonID, spouseID, relationType, now)
	}
}

// Rule 3: Parent -> inherit child edges from reference person's siblings.
func inferRule3ParentChildFromSiblings(familyID, newPersonID, refPersonID, relationType, now string) {
	ph, phArgs := inPlaceholders(siblingTypesList)
	args := append([]interface{}{familyID, refPersonID}, phArgs...)

	rows, err := store.DB.Query(
		"SELECT to_id FROM relationships WHERE family_id = ? AND from_id = ? AND relation_type IN ("+ph+")",
		args...,
	)
	if err != nil {
		log.Printf("[Rule3] query sibling edges: %v", err)
		return
	}
	defer rows.Close()

	var siblingIDs []string
	for rows.Next() {
		var sid string
		rows.Scan(&sid)
		siblingIDs = append(siblingIDs, sid)
	}

	for _, siblingID := range siblingIDs {
		exists, _ := relExists(familyID, newPersonID, siblingID)
		if exists {
			continue
		}

		siblingGender, err := getPersonGender(siblingID)
		if err != nil {
			continue
		}

		// new parent -> sibling (FATHER/MOTHER same as relation_type)
		insertRel(familyID, newPersonID, siblingID, relationType, now)

		// sibling -> new parent (SON/DAUGHTER based on sibling gender)
		childType := "SON"
		if siblingGender == "female" {
			childType = "DAUGHTER"
		}
		insertRel(familyID, siblingID, newPersonID, childType, now)
	}
}

// Rule 4: Parent -> inherit spouse edge from reference person's other parent.
func inferRule4ParentSpouse(familyID, newPersonID, refPersonID, newGender, now string) {
	ph, phArgs := inPlaceholders(parentTypesList)
	args := append([]interface{}{familyID, refPersonID}, phArgs...)

	rows, err := store.DB.Query(
		"SELECT from_id FROM relationships WHERE family_id = ? AND to_id = ? AND relation_type IN ("+ph+")",
		args...,
	)
	if err != nil {
		log.Printf("[Rule4] query other parent edges: %v", err)
		return
	}
	defer rows.Close()

	var otherParentIDs []string
	for rows.Next() {
		var pid string
		rows.Scan(&pid)
		otherParentIDs = append(otherParentIDs, pid)
	}

	for _, otherParentID := range otherParentIDs {
		if otherParentID == newPersonID {
			continue
		}

		exists, _ := relExists(familyID, newPersonID, otherParentID)
		if exists {
			continue
		}

		// Determine spouse type based on new person's gender
		spouseType := "HUSBAND"
		reverseSpouseType := "WIFE"
		if newGender != "male" {
			spouseType = "WIFE"
			reverseSpouseType = "HUSBAND"
		}

		insertRel(familyID, newPersonID, otherParentID, spouseType, now)
		insertRel(familyID, otherParentID, newPersonID, reverseSpouseType, now)
	}
}

// Rule 5: Sibling -> inherit sibling edges from reference person's other siblings.
func inferRule5SiblingSiblings(familyID, newPersonID, refPersonID, newGender, now string) {
	ph, phArgs := inPlaceholders(siblingTypesList)
	args := append([]interface{}{familyID, refPersonID}, phArgs...)

	rows, err := store.DB.Query(
		"SELECT to_id, relation_type FROM relationships WHERE family_id = ? AND from_id = ? AND relation_type IN ("+ph+")",
		args...,
	)
	if err != nil {
		log.Printf("[Rule5] query other sibling edges: %v", err)
		return
	}
	defer rows.Close()

	type sibEdge struct {
		otherSiblingID string
		relType        string
	}
	var edges []sibEdge
	for rows.Next() {
		var e sibEdge
		rows.Scan(&e.otherSiblingID, &e.relType)
		edges = append(edges, e)
	}

	for _, e := range edges {
		if e.otherSiblingID == newPersonID {
			continue
		}

		exists, _ := relExists(familyID, newPersonID, e.otherSiblingID)
		if exists {
			continue
		}

		// New person views other sibling same way ref views them
		newToOther := e.relType
		revMap := reverseRelation[newToOther]
		otherToNew := "YOUNGER_BROTHER"
		if revMap != nil {
			if v, ok := revMap[newGender]; ok {
				otherToNew = v
			} else {
				otherToNew = revMap["male"]
			}
		}

		insertRel(familyID, newPersonID, e.otherSiblingID, newToOther, now)
		insertRel(familyID, e.otherSiblingID, newPersonID, otherToNew, now)
	}
}

// Rule 6: Child -> inherit sibling edges from reference person's other children.
func inferRule6ChildSiblings(familyID, newPersonID, refPersonID, newGender, now string) {
	ph, phArgs := inPlaceholders(childTypesList)
	args := append([]interface{}{familyID, refPersonID}, phArgs...)

	rows, err := store.DB.Query(
		"SELECT from_id FROM relationships WHERE family_id = ? AND to_id = ? AND relation_type IN ("+ph+")",
		args...,
	)
	if err != nil {
		log.Printf("[Rule6] query other child edges: %v", err)
		return
	}
	defer rows.Close()

	var otherChildIDs []string
	for rows.Next() {
		var cid string
		rows.Scan(&cid)
		otherChildIDs = append(otherChildIDs, cid)
	}

	for _, otherChildID := range otherChildIDs {
		if otherChildID == newPersonID {
			continue
		}

		exists, _ := relExists(familyID, newPersonID, otherChildID)
		if exists {
			continue
		}

		otherChildGender, err := getPersonGender(otherChildID)
		if err != nil {
			continue
		}

		// new child is younger sibling of existing child
		newToOther := "OLDER_BROTHER"
		if otherChildGender == "female" {
			newToOther = "OLDER_SISTER"
		}
		otherToNew := "YOUNGER_BROTHER"
		if newGender == "female" {
			otherToNew = "YOUNGER_SISTER"
		}

		insertRel(familyID, newPersonID, otherChildID, newToOther, now)
		insertRel(familyID, otherChildID, newPersonID, otherToNew, now)
	}
}

// Rule 7: Spouse -> inherit child edges from reference person's children.
func inferRule7SpouseChildren(familyID, newPersonID, refPersonID, newGender, now string) {
	ph, phArgs := inPlaceholders(childTypesList)
	args := append([]interface{}{familyID, refPersonID}, phArgs...)

	rows, err := store.DB.Query(
		"SELECT from_id FROM relationships WHERE family_id = ? AND to_id = ? AND relation_type IN ("+ph+")",
		args...,
	)
	if err != nil {
		log.Printf("[Rule7] query child edges: %v", err)
		return
	}
	defer rows.Close()

	var childIDs []string
	for rows.Next() {
		var cid string
		rows.Scan(&cid)
		childIDs = append(childIDs, cid)
	}

	for _, childID := range childIDs {
		exists, _ := relExists(familyID, newPersonID, childID)
		if exists {
			continue
		}

		childGender, err := getPersonGender(childID)
		if err != nil {
			continue
		}

		// new spouse -> child (FATHER/MOTHER based on new person's gender)
		parentType := "FATHER"
		if newGender == "female" {
			parentType = "MOTHER"
		}
		insertRel(familyID, newPersonID, childID, parentType, now)

		// child -> new spouse (SON/DAUGHTER based on child gender)
		childType := "SON"
		if childGender == "female" {
			childType = "DAUGHTER"
		}
		insertRel(familyID, childID, newPersonID, childType, now)
	}
}

// ────────────────────────────────────────
// PersonUpdate — PUT /api/v1/person/{id}
// ────────────────────────────────────────
func PersonUpdate(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	personID := r.PathValue("id")

	// Decode body into a generic map so we can inspect arbitrary fields
	var body map[string]interface{}
	if err := DecodeJSON(r, &body); err != nil {
		Fail(w, "请求体解析失败")
		return
	}

	familyID, _ := body["family_id"].(string)
	if personID == "" || familyID == "" {
		Fail(w, "缺少 person_id 或 family_id")
		return
	}

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}

	// Fetch existing person
	var pName, pGender, pAvatar, pCreatedBy string
	var pBirthYear sql.NullInt64
	var pAvatarPublicInt, pGeneration int
	var pBoundUserID sql.NullString
	var pFamilyID string

	err = store.DB.QueryRow(
		"SELECT family_id, name, gender, birth_year, avatar, avatar_public, generation, bound_user_id, created_by FROM persons WHERE id = ?",
		personID,
	).Scan(&pFamilyID, &pName, &pGender, &pBirthYear, &pAvatar, &pAvatarPublicInt, &pGeneration, &pBoundUserID, &pCreatedBy)
	if err != nil {
		Fail(w, "成员不存在或不属于该家庭")
		return
	}
	if pFamilyID != familyID {
		Fail(w, "成员不存在或不属于该家庭")
		return
	}

	// Restricted users can only update their own bound person
	if member.Role == "restricted" {
		if !pBoundUserID.Valid || pBoundUserID.String != openid {
			Fail(w, "Restricted 用户只能修改自己绑定的成员")
			return
		}
	}

	// Build the current person field map for snapshot_before
	currentFields := map[string]interface{}{
		"name":       pName,
		"gender":     pGender,
		"birth_year": nil,
		"avatar":     pAvatar,
		"generation": pGeneration,
	}
	if pBirthYear.Valid {
		currentFields["birth_year"] = pBirthYear.Int64
	}

	// Filter to shared fields only -- ignore generation (computed)
	updateData := map[string]interface{}{}
	for _, key := range personSharedFields {
		if key == "generation" {
			continue
		}
		if val, ok := body[key]; ok {
			updateData[key] = val
		}
	}

	// Handle avatar_public: only bound user or owner can modify
	if val, ok := body["avatar_public"]; ok {
		isSelf := pBoundUserID.Valid && pBoundUserID.String == openid
		isOwner := member.Role == "owner"
		if isSelf || isOwner {
			// Convert to bool then to int for SQLite
			switch v := val.(type) {
			case bool:
				if v {
					updateData["avatar_public"] = 1
				} else {
					updateData["avatar_public"] = 0
				}
			default:
				updateData["avatar_public"] = 0
			}
		}
	}

	if len(updateData) == 0 {
		Fail(w, "没有可更新的共享字段")
		return
	}

	// Build snapshot_before from current shared fields
	snapshotBefore := map[string]interface{}{}
	for _, key := range personSharedFields {
		snapshotBefore[key] = currentFields[key]
	}

	// Build field_changes
	fieldChanges := map[string]interface{}{}
	for key, newVal := range updateData {
		oldVal := currentFields[key]
		if key == "avatar_public" {
			// Map from the int-stored value
			oldVal = pAvatarPublicInt
		}
		fieldChanges[key] = map[string]interface{}{"old": oldVal, "new": newVal}
	}

	now := time.Now().UTC().Format(time.RFC3339)

	snapshotJSON, _ := json.Marshal(snapshotBefore)
	changesJSON, _ := json.Marshal(fieldChanges)

	// Create edit_history snapshot before update
	_, _ = store.DB.Exec(
		"INSERT INTO edit_history (family_id, person_id, action, operator_id, snapshot_before, field_changes, created_at) VALUES (?, ?, 'update', ?, ?, ?, ?)",
		familyID, personID, openid, string(snapshotJSON), string(changesJSON), now,
	)

	// Build dynamic UPDATE SQL
	setClauses := ""
	var updateArgs []interface{}
	for key, val := range updateData {
		if setClauses != "" {
			setClauses += ", "
		}
		setClauses += key + " = ?"
		updateArgs = append(updateArgs, val)
	}
	setClauses += ", updated_at = ?"
	updateArgs = append(updateArgs, now)
	updateArgs = append(updateArgs, personID)

	_, err = store.DB.Exec(
		"UPDATE persons SET "+setClauses+" WHERE id = ?",
		updateArgs...,
	)
	if err != nil {
		Fail(w, "更新失败")
		return
	}

	OK(w, nil)
}

// ────────────────────────────────────────
// PersonDelete — DELETE /api/v1/person/{id}
// ────────────────────────────────────────
func PersonDelete(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	personID := r.PathValue("id")

	// For DELETE, family_id comes as a query parameter
	familyID := r.URL.Query().Get("family_id")
	if personID == "" || familyID == "" {
		Fail(w, "缺少 person_id 或 family_id")
		return
	}

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}
	if !store.HasPermission(member.Role, "member") {
		Fail(w, "Restricted 用户无权删除成员")
		return
	}

	// Fetch person for snapshot
	var pFamilyID, pName, pGender, pAvatar, pCreatedBy string
	var pBirthYear sql.NullInt64
	var pGeneration int
	var pBoundUserID sql.NullString

	err = store.DB.QueryRow(
		"SELECT family_id, name, gender, birth_year, avatar, generation, bound_user_id, created_by FROM persons WHERE id = ?",
		personID,
	).Scan(&pFamilyID, &pName, &pGender, &pBirthYear, &pAvatar, &pGeneration, &pBoundUserID, &pCreatedBy)
	if err != nil {
		Fail(w, "成员不存在或不属于该家庭")
		return
	}
	if pFamilyID != familyID {
		Fail(w, "成员不存在或不属于该家庭")
		return
	}

	// Cannot delete yourself (bound person)
	if pBoundUserID.Valid && pBoundUserID.String == openid {
		Fail(w, "不能删除自己")
		return
	}

	// Permission check:
	// - Owner can delete anyone (except self, checked above)
	// - Member can only delete persons they created
	isOwner := member.Role == "owner"
	if !isOwner {
		if pCreatedBy == "" || pCreatedBy != openid {
			Fail(w, "只能删除自己创建的成员")
			return
		}
	}

	// Build snapshot_before
	snapshotBefore := map[string]interface{}{
		"name":       pName,
		"gender":     pGender,
		"birth_year": nil,
		"avatar":     pAvatar,
		"generation": pGeneration,
	}
	if pBirthYear.Valid {
		snapshotBefore["birth_year"] = pBirthYear.Int64
	}

	now := time.Now().UTC().Format(time.RFC3339)
	snapshotJSON, _ := json.Marshal(snapshotBefore)

	// Create edit_history with action 'delete'
	_, _ = store.DB.Exec(
		"INSERT INTO edit_history (family_id, person_id, action, operator_id, snapshot_before, field_changes, created_at) VALUES (?, ?, 'delete', ?, ?, NULL, ?)",
		familyID, personID, openid, string(snapshotJSON), now,
	)

	// Cascade deletes
	store.DB.Exec("DELETE FROM relationships WHERE family_id = ? AND from_id = ?", familyID, personID)
	store.DB.Exec("DELETE FROM relationships WHERE family_id = ? AND to_id = ?", familyID, personID)
	store.DB.Exec("DELETE FROM photos WHERE person_id = ?", personID)
	store.DB.Exec("DELETE FROM photo_tags WHERE person_id = ?", personID)
	store.DB.Exec("DELETE FROM person_notes WHERE person_id = ?", personID)

	// Delete the person record
	_, err = store.DB.Exec("DELETE FROM persons WHERE id = ?", personID)
	if err != nil {
		Fail(w, "删除成员失败")
		return
	}

	// Decrement family member_count
	_, _ = store.DB.Exec(
		"UPDATE families SET member_count = member_count - 1, updated_at = ? WHERE id = ?",
		now, familyID,
	)

	OK(w, nil)
}

// ────────────────────────────────────────
// PersonGetDetail — GET /api/v1/person/{id}
// ────────────────────────────────────────
func PersonGetDetail(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	personID := r.PathValue("id")
	familyID := r.URL.Query().Get("family_id")

	if personID == "" || familyID == "" {
		Fail(w, "缺少 person_id 或 family_id")
		return
	}

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}

	// Fetch person record (shared fields)
	var pFamilyID, pName, pGender, pAvatar, pCreatedBy string
	var pBirthYear sql.NullInt64
	var pAvatarPublicInt, pGeneration int
	var pBoundUserID sql.NullString

	err = store.DB.QueryRow(
		"SELECT family_id, name, gender, birth_year, avatar, avatar_public, generation, bound_user_id, created_by FROM persons WHERE id = ?",
		personID,
	).Scan(&pFamilyID, &pName, &pGender, &pBirthYear, &pAvatar, &pAvatarPublicInt, &pGeneration, &pBoundUserID, &pCreatedBy)
	if err != nil {
		Fail(w, "成员不存在或不属于该家庭")
		return
	}
	if pFamilyID != familyID {
		Fail(w, "成员不存在或不属于该家庭")
		return
	}

	result := map[string]interface{}{
		"_id":           personID,
		"name":          pName,
		"gender":        pGender,
		"birth_year":    nil,
		"avatar":        pAvatar,
		"generation":    pGeneration,
		"bound_user_id": nil,
		"avatar_public": pAvatarPublicInt != 0,
	}
	if pBirthYear.Valid {
		result["birth_year"] = pBirthYear.Int64
	}
	if pBoundUserID.Valid {
		result["bound_user_id"] = pBoundUserID.String
	}

	// Filter avatar visibility
	isSelf := pBoundUserID.Valid && pBoundUserID.String == openid
	isOwner := member.Role == "owner"
	if !isSelf && !isOwner && pAvatarPublicInt == 0 {
		result["avatar"] = ""
	}

	// Compute delete permission for the caller
	isCreator := pCreatedBy != "" && pCreatedBy == openid
	hasDeleteRole := isOwner || (store.HasPermission(member.Role, "member") && isCreator)
	result["_can_delete"] = !isSelf && hasDeleteRole

	// Get caller's private overlay (person_notes)
	var notePhone, noteWechatID, noteBirthDate, noteCity, noteOccupation, noteCustomTitle, noteRemarksJSON string
	err = store.DB.QueryRow(
		"SELECT phone, wechat_id, birth_date, city, occupation, custom_title, remarks FROM person_notes WHERE user_id = ? AND person_id = ? LIMIT 1",
		openid, personID,
	).Scan(&notePhone, &noteWechatID, &noteBirthDate, &noteCity, &noteOccupation, &noteCustomTitle, &noteRemarksJSON)

	if err == nil {
		// Note record found; overlay non-empty private fields
		noteFields := map[string]string{
			"phone":        notePhone,
			"wechat_id":    noteWechatID,
			"birth_date":   noteBirthDate,
			"city":         noteCity,
			"occupation":   noteOccupation,
			"custom_title": noteCustomTitle,
		}

		for _, key := range privateOverlayFields {
			if key == "remarks" {
				continue // handled separately below
			}
			val, exists := noteFields[key]
			if !exists || val == "" {
				continue
			}
			// Decrypt encrypted fields before returning
			if encryptedFields[key] {
				decrypted, decErr := pkg.Decrypt(val)
				if decErr != nil {
					log.Printf("[PersonGetDetail] 解密字段 %s 失败: %v", key, decErr)
				} else {
					val = decrypted
				}
			}
			result[key] = val
			result[key+"_source"] = "my_note"
		}

		// Handle remarks
		hasRemarks := false
		if noteRemarksJSON != "" && noteRemarksJSON != "[]" {
			var remarks []interface{}
			if json.Unmarshal([]byte(noteRemarksJSON), &remarks) == nil && len(remarks) > 0 {
				result["remarks"] = remarks
				result["remarks_source"] = "my_note"
				hasRemarks = true
			}
		}

		if !hasRemarks {
			result["remarks"] = []interface{}{}
		}
	}
	// If no note record, remarks fields remain absent (matching JS behavior where noteRes.data.length == 0)

	OK(w, result)
}

// ────────────────────────────────────────
// PersonList — GET /api/v1/person?family_id=xxx
// ────────────────────────────────────────
func PersonList(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.URL.Query().Get("family_id")

	if familyID == "" {
		Fail(w, "缺少 family_id")
		return
	}

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}

	// Get all persons in family
	rows, err := store.DB.Query(
		"SELECT id, name, gender, birth_year, is_deceased, avatar, avatar_public, generation, bound_user_id FROM persons WHERE family_id = ?",
		familyID,
	)
	if err != nil {
		Fail(w, "查询成员列表失败")
		return
	}
	defer rows.Close()

	type personRow struct {
		ID           string
		Name         string
		Gender       string
		BirthYear    sql.NullInt64
		IsDeceased   int
		Avatar       string
		AvatarPublic int
		Generation   int
		BoundUserID  sql.NullString
	}

	var persons []personRow
	var personIDs []interface{}
	for rows.Next() {
		var p personRow
		rows.Scan(&p.ID, &p.Name, &p.Gender, &p.BirthYear, &p.IsDeceased, &p.Avatar, &p.AvatarPublic, &p.Generation, &p.BoundUserID)
		persons = append(persons, p)
		personIDs = append(personIDs, p.ID)
	}

	if len(persons) == 0 {
		OK(w, []interface{}{})
		return
	}

	// Batch get person_notes for current user to attach custom_title
	noteMap := map[string]string{}
	if len(personIDs) > 0 {
		// Build IN clause
		ph := ""
		noteArgs := []interface{}{openid}
		for i, pid := range personIDs {
			if i > 0 {
				ph += ","
			}
			ph += "?"
			noteArgs = append(noteArgs, pid)
		}
		noteRows, err := store.DB.Query(
			"SELECT person_id, custom_title FROM person_notes WHERE user_id = ? AND person_id IN ("+ph+")",
			noteArgs...,
		)
		if err == nil {
			defer noteRows.Close()
			for noteRows.Next() {
				var pid, ct string
				noteRows.Scan(&pid, &ct)
				if ct != "" {
					noteMap[pid] = ct
				}
			}
		}
	}

	// Assemble result with avatar privacy filtering
	isOwner := member.Role == "owner"
	resultList := make([]map[string]interface{}, 0, len(persons))
	for _, p := range persons {
		isSelf := p.BoundUserID.Valid && p.BoundUserID.String == openid
		avatarVisible := isSelf || isOwner || p.AvatarPublic != 0

		avatar := p.Avatar
		if !avatarVisible {
			avatar = ""
		}

		entry := map[string]interface{}{
			"_id":           p.ID,
			"name":          p.Name,
			"gender":        p.Gender,
			"birth_year":    nil,
			"is_deceased":   p.IsDeceased != 0,
			"avatar":        avatar,
			"avatar_public": p.AvatarPublic != 0,
			"generation":    p.Generation,
			"bound_user_id": nil,
			"custom_title":  nil,
		}
		if p.BirthYear.Valid {
			entry["birth_year"] = p.BirthYear.Int64
		}
		if p.BoundUserID.Valid {
			entry["bound_user_id"] = p.BoundUserID.String
		}
		if ct, ok := noteMap[p.ID]; ok {
			entry["custom_title"] = ct
		}

		resultList = append(resultList, entry)
	}

	OK(w, resultList)
}

// ────────────────────────────────────────
// PersonUploadAvatar — POST /api/v1/person/avatar
// Handles multipart avatar upload for a person.
// ────────────────────────────────────────
func PersonUploadAvatar(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		Fail(w, "解析上传表单失败")
		return
	}

	familyID := r.FormValue("family_id")
	personID := r.FormValue("person_id")
	if familyID == "" || personID == "" {
		Fail(w, "缺少必填参数 (family_id, person_id)")
		return
	}

	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		Fail(w, "缺少上传文件 (file)")
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	ext = strings.ToLower(ext)

	uploadDir := getUploadDir()
	avatarDir := filepath.Join(uploadDir, "avatars", familyID)
	os.MkdirAll(avatarDir, 0755)

	filename := fmt.Sprintf("%s_%d%s", personID, time.Now().UnixMilli(), ext)
	filePath := filepath.Join(avatarDir, filename)

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

	baseURL := strings.TrimRight(getBaseURL(), "/")
	avatarURL := fmt.Sprintf("%s/%s/avatars/%s/%s", baseURL, uploadDir, familyID, filename)

	OK(w, map[string]string{"avatar_url": avatarURL})
}
