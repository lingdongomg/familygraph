package store

import (
	"database/sql"
	"time"
)

type User struct {
	ID             string `json:"user_id"`
	OpenIDHash     string `json:"openid_hash"`
	EncryptedOID   string `json:"-"`
	Nickname       string `json:"nickname"`
	AvatarURL      string `json:"avatar_url"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

// GetUserByOpenIDHash finds a user by their openid SHA-256 hash.
func GetUserByOpenIDHash(openidHash string) (*User, error) {
	u := &User{}
	err := DB.QueryRow(
		"SELECT id, openid_hash, encrypted_openid, nickname, avatar_url, created_at, updated_at FROM users WHERE openid_hash = ?",
		openidHash,
	).Scan(&u.ID, &u.OpenIDHash, &u.EncryptedOID, &u.Nickname, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

// CreateUser inserts a new user record and returns the generated ID.
func CreateUser(openidHash, encryptedOpenid string) (*User, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	var id string
	err := DB.QueryRow(
		"INSERT INTO users (openid_hash, encrypted_openid, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id",
		openidHash, encryptedOpenid, now, now,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return &User{
		ID:         id,
		OpenIDHash: openidHash,
		Nickname:   "微信用户",
		AvatarURL:  "",
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

// UpdateUserProfile updates nickname and/or avatar_url.
func UpdateUserProfile(openidHash string, nickname *string, avatarURL *string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	if nickname != nil && avatarURL != nil {
		_, err := DB.Exec("UPDATE users SET nickname = ?, avatar_url = ?, updated_at = ? WHERE openid_hash = ?",
			*nickname, *avatarURL, now, openidHash)
		return err
	}
	if nickname != nil {
		_, err := DB.Exec("UPDATE users SET nickname = ?, updated_at = ? WHERE openid_hash = ?",
			*nickname, now, openidHash)
		return err
	}
	if avatarURL != nil {
		_, err := DB.Exec("UPDATE users SET avatar_url = ?, updated_at = ? WHERE openid_hash = ?",
			*avatarURL, now, openidHash)
		return err
	}
	return nil
}

// CheckMembership returns the family_member record if the user is in the family.
func CheckMembership(openid, familyID string) (*FamilyMember, error) {
	fm := &FamilyMember{}
	err := DB.QueryRow(
		"SELECT id, family_id, user_id, person_id, bound_person_id, role, adopted_title_map_id FROM family_members WHERE user_id = ? AND family_id = ?",
		openid, familyID,
	).Scan(&fm.ID, &fm.FamilyID, &fm.UserID, &fm.PersonID, &fm.BoundPersonID, &fm.Role, &fm.AdoptedTitleMapID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return fm, nil
}

type FamilyMember struct {
	ID                string          `json:"_id"`
	FamilyID          string          `json:"family_id"`
	UserID            string          `json:"user_id"`
	PersonID          sql.NullString  `json:"person_id"`
	BoundPersonID     sql.NullString  `json:"bound_person_id"`
	Role              string          `json:"role"`
	AdoptedTitleMapID sql.NullString  `json:"adopted_title_map_id"`
}

// HasPermission checks if memberRole >= requiredRole.
func HasPermission(memberRole, requiredRole string) bool {
	order := map[string]int{"owner": 3, "member": 2, "restricted": 1}
	return order[memberRole] >= order[requiredRole]
}
