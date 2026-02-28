package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"familygraph/middleware"
	"familygraph/pkg"
	"familygraph/store"
)

// NoteUpsert handles PUT /api/v1/note
func NoteUpsert(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	var req struct {
		FamilyID    string   `json:"family_id"`
		PersonID    string   `json:"person_id"`
		Phone       *string  `json:"phone"`
		WechatID    *string  `json:"wechat_id"`
		BirthDate   *string  `json:"birth_date"`
		City        *string  `json:"city"`
		Occupation  *string  `json:"occupation"`
		CustomTitle *string  `json:"custom_title"`
		Remarks     *[]string `json:"remarks"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		Fail(w, "请求格式错误")
		return
	}

	if req.FamilyID == "" || req.PersonID == "" {
		Fail(w, "缺少必填参数 family_id 或 person_id")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, req.FamilyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -3)
		return
	}

	// Validate remarks
	if req.Remarks != nil {
		if len(*req.Remarks) > 20 {
			Fail(w, "备注条目不能超过 20 条")
			return
		}
		for _, item := range *req.Remarks {
			if len([]rune(item)) > 200 {
				Fail(w, "每条备注不能超过 200 字")
				return
			}
		}
	}

	now := time.Now().UTC().Format(time.RFC3339)

	// Check if existing note
	var existingID string
	err = store.DB.QueryRow(
		"SELECT id FROM person_notes WHERE family_id = ? AND person_id = ? AND user_id = ?",
		req.FamilyID, req.PersonID, openid,
	).Scan(&existingID)

	if err == nil && existingID != "" {
		// Update existing
		setClauses := []string{"updated_at = ?"}
		args := []interface{}{now}

		if req.Phone != nil {
			setClauses = append(setClauses, "phone = ?")
			args = append(args, pkg.Encrypt(*req.Phone))
		}
		if req.WechatID != nil {
			setClauses = append(setClauses, "wechat_id = ?")
			args = append(args, pkg.Encrypt(*req.WechatID))
		}
		if req.BirthDate != nil {
			setClauses = append(setClauses, "birth_date = ?")
			args = append(args, *req.BirthDate)
		}
		if req.City != nil {
			setClauses = append(setClauses, "city = ?")
			args = append(args, *req.City)
		}
		if req.Occupation != nil {
			setClauses = append(setClauses, "occupation = ?")
			args = append(args, *req.Occupation)
		}
		if req.CustomTitle != nil {
			setClauses = append(setClauses, "custom_title = ?")
			args = append(args, *req.CustomTitle)
		}
		if req.Remarks != nil {
			remarksJSON, _ := json.Marshal(*req.Remarks)
			setClauses = append(setClauses, "remarks = ?")
			args = append(args, string(remarksJSON))
		}

		args = append(args, existingID)
		query := "UPDATE person_notes SET " + joinStrings(setClauses, ", ") + " WHERE id = ?"
		_, err = store.DB.Exec(query, args...)
		if err != nil {
			Fail(w, "更新备注失败")
			return
		}

		OK(w, map[string]string{"_id": existingID})
		return
	}

	// Create new note
	phone := ""
	if req.Phone != nil {
		phone = pkg.Encrypt(*req.Phone)
	}
	wechatID := ""
	if req.WechatID != nil {
		wechatID = pkg.Encrypt(*req.WechatID)
	}
	birthDate := ""
	if req.BirthDate != nil {
		birthDate = *req.BirthDate
	}
	city := ""
	if req.City != nil {
		city = *req.City
	}
	occupation := ""
	if req.Occupation != nil {
		occupation = *req.Occupation
	}
	customTitle := ""
	if req.CustomTitle != nil {
		customTitle = *req.CustomTitle
	}
	remarksJSON := "[]"
	if req.Remarks != nil {
		b, _ := json.Marshal(*req.Remarks)
		remarksJSON = string(b)
	}

	var noteID string
	err = store.DB.QueryRow(
		`INSERT INTO person_notes (family_id, person_id, user_id, phone, wechat_id, birth_date, city, occupation, custom_title, remarks, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
		req.FamilyID, req.PersonID, openid, phone, wechatID, birthDate, city, occupation, customTitle, remarksJSON, now, now,
	).Scan(&noteID)
	if err != nil {
		Fail(w, "创建备注失败")
		return
	}

	OK(w, map[string]string{"_id": noteID})
}

// NoteGet handles GET /api/v1/note?family_id=x&person_id=y
func NoteGet(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)
	familyID := r.URL.Query().Get("family_id")
	personID := r.URL.Query().Get("person_id")

	if familyID == "" || personID == "" {
		Fail(w, "缺少必填参数 family_id 或 person_id")
		return
	}

	// Check membership
	member, err := store.CheckMembership(openid, familyID)
	if err != nil || member == nil {
		Fail(w, "您不是该家庭的成员", -3)
		return
	}

	var noteID, phone, wechatID, birthDate, city, occupation, customTitle, remarksStr, createdAt, updatedAt string
	err = store.DB.QueryRow(
		`SELECT id, phone, wechat_id, birth_date, city, occupation, custom_title, remarks, created_at, updated_at
		 FROM person_notes WHERE family_id = ? AND person_id = ? AND user_id = ?`,
		familyID, personID, openid,
	).Scan(&noteID, &phone, &wechatID, &birthDate, &city, &occupation, &customTitle, &remarksStr, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		OK(w, map[string]interface{}{})
		return
	}
	if err != nil {
		Fail(w, "查询失败")
		return
	}

	// Decrypt sensitive fields
	decryptedPhone, _ := pkg.Decrypt(phone)
	decryptedWechat, _ := pkg.Decrypt(wechatID)

	// Parse remarks - handle legacy migration
	var remarks []string
	if remarksStr != "" {
		if err := json.Unmarshal([]byte(remarksStr), &remarks); err != nil {
			// If remarks is a plain string (legacy remark field), wrap in array
			if remarksStr != "[]" && remarksStr != "" {
				remarks = []string{remarksStr}
			} else {
				remarks = []string{}
			}
		}
	} else {
		remarks = []string{}
	}

	note := map[string]interface{}{
		"_id":          noteID,
		"family_id":    familyID,
		"person_id":    personID,
		"user_id":      openid,
		"phone":        decryptedPhone,
		"wechat_id":    decryptedWechat,
		"birth_date":   birthDate,
		"city":         city,
		"occupation":   occupation,
		"custom_title": customTitle,
		"remarks":      remarks,
		"created_at":   createdAt,
		"updated_at":   updatedAt,
	}

	OK(w, note)
}
