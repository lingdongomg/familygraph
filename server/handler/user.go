package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"familygraph/middleware"
	"familygraph/pkg"
	"familygraph/store"
)

type loginRequest struct {
	Code string `json:"code"`
}

type loginResponse struct {
	Token     string   `json:"token"`
	UserID    string   `json:"user_id"`
	Nickname  string   `json:"nick_name"`
	Avatar    string   `json:"avatar_url"`
	FamilyIDs []string `json:"family_ids"`
}

// UserLogin handles POST /api/v1/user/login.
func UserLogin(wxAppID, wxSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := DecodeJSON(r, &req); err != nil || req.Code == "" {
			Fail(w, "缺少参数 code")
			return
		}

		// Call WeChat jscode2session
		session, err := pkg.Code2Session(wxAppID, wxSecret, req.Code)
		if err != nil {
			Fail(w, "微信登录失败: "+err.Error())
			return
		}

		openid := session.OpenID
		openidHash := pkg.HashOpenID(openid)
		encryptedOID := pkg.Encrypt(openid)

		// Find or create user
		user, err := store.GetUserByOpenIDHash(openidHash)
		if err != nil {
			Fail(w, "数据库错误")
			return
		}

		if user == nil {
			user, err = store.CreateUser(openidHash, encryptedOID)
			if err != nil {
				Fail(w, "创建用户失败")
				return
			}
		}

		// Generate JWT
		token, err := middleware.GenerateToken(user.ID, openid, openidHash)
		if err != nil {
			Fail(w, "生成令牌失败")
			return
		}

		// Get family IDs for this user (replaces the removed users.family_ids field)
		familyIDs := []string{}
		famRows, famErr := store.DB.Query(
			"SELECT family_id FROM family_members WHERE user_id = ?", openid,
		)
		if famErr == nil {
			defer famRows.Close()
			for famRows.Next() {
				var fid string
				if famRows.Scan(&fid) == nil {
					familyIDs = append(familyIDs, fid)
				}
			}
		}

		OK(w, loginResponse{
			Token:     token,
			UserID:    user.ID,
			Nickname:  user.Nickname,
			Avatar:    user.AvatarURL,
			FamilyIDs: familyIDs,
		})
	}
}

type updateProfileRequest struct {
	Nickname  *string `json:"nickname"`
	NickName  *string `json:"nick_name"`
	AvatarURL *string `json:"avatar_url"`
}

// UserUpdateProfile handles PUT /api/v1/user/profile.
func UserUpdateProfile(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	var req updateProfileRequest
	if err := DecodeJSON(r, &req); err != nil {
		Fail(w, "请求格式错误")
		return
	}

	// Accept both nickname and nick_name for compatibility
	nickname := req.Nickname
	if nickname == nil {
		nickname = req.NickName
	}

	if nickname == nil && req.AvatarURL == nil {
		Fail(w, "缺少需要更新的字段 (nickname / avatar_url)")
		return
	}

	openidHash := pkg.HashOpenID(openid)

	user, err := store.GetUserByOpenIDHash(openidHash)
	if err != nil || user == nil {
		Fail(w, "用户不存在，请先登录", -2)
		return
	}

	if err := store.UpdateUserProfile(openidHash, nickname, req.AvatarURL); err != nil {
		Fail(w, "更新失败")
		return
	}

	// Return updated user with family_ids
	updated, _ := store.GetUserByOpenIDHash(openidHash)
	if updated == nil {
		updated = user
	}

	familyIDs := []string{}
	famRows, famErr := store.DB.Query(
		"SELECT family_id FROM family_members WHERE user_id = ?", openid,
	)
	if famErr == nil {
		defer famRows.Close()
		for famRows.Next() {
			var fid string
			if famRows.Scan(&fid) == nil {
				familyIDs = append(familyIDs, fid)
			}
		}
	}

	OK(w, map[string]interface{}{
		"user_id":    updated.ID,
		"nickname":   updated.Nickname,
		"nick_name":  updated.Nickname,
		"avatar_url": updated.AvatarURL,
		"family_ids": familyIDs,
	})
}

// UserUploadAvatar handles POST /api/v1/user/avatar (multipart upload).
func UserUploadAvatar(w http.ResponseWriter, r *http.Request) {
	openid := middleware.GetOpenID(r)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		Fail(w, "解析上传表单失败")
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
	avatarDir := filepath.Join(uploadDir, "avatars")
	os.MkdirAll(avatarDir, 0755)

	filename := fmt.Sprintf("%s_%d%s", pkg.GenerateCode(12), time.Now().UnixMilli(), ext)
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
	avatarURL := fmt.Sprintf("%s/%s/avatars/%s", baseURL, uploadDir, filename)

	// Update user profile with new avatar URL
	openidHash := pkg.HashOpenID(openid)
	if err := store.UpdateUserProfile(openidHash, nil, &avatarURL); err != nil {
		os.Remove(filePath)
		Fail(w, "更新头像失败")
		return
	}

	OK(w, map[string]string{"avatar_url": avatarURL})
}
