// scripts/migrate-from-cloud.go
//
// 数据迁移工具：从微信云开发导出的 JSON 文件迁移到 SQLite
//
// 用法:
//   go run scripts/migrate-from-cloud.go -data <导出目录> -db <目标数据库路径> [-uploads <上传文件目录>]
//
// 导出目录结构:
//   <导出目录>/
//     users.json           — 用户集合导出
//     families.json        — 家庭集合导出
//     family_members.json  — 家庭成员集合导出
//     persons.json         — 人物集合导出
//     relationships.json   — 关系集合导出
//     photos.json          — 照片集合导出
//     photo_tags.json      — 照片标记集合导出
//     edit_history.json    — 编辑历史集合导出
//     person_notes.json    — 私人备注集合导出
//     join_requests.json   — 加入请求集合导出
//     share_links.json     — 分享链接集合导出
//     custom_title_maps.json — 自定义称呼表集合导出
//
// 每个 JSON 文件格式为 JSON 数组: [{ "_id": "xxx", ... }, ...]

package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

func main() {
	dataDir := flag.String("data", "", "云开发导出 JSON 文件目录")
	dbPath := flag.String("db", "data/familygraph.db", "目标 SQLite 数据库路径")
	uploadsDir := flag.String("uploads", "uploads", "上传文件目标目录（照片下载后存放位置）")
	flag.Parse()

	if *dataDir == "" {
		fmt.Println("Usage: go run migrate-from-cloud.go -data <导出目录> [-db <数据库路径>] [-uploads <上传目录>]")
		os.Exit(1)
	}

	_ = uploadsDir // reserved for future photo download

	// Open database
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(0)", *dbPath)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		log.Fatalf("打开数据库失败: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)

	// Disable foreign keys during migration to allow out-of-order inserts
	db.Exec("PRAGMA foreign_keys = OFF")

	log.Println("=== FamilyGraph 数据迁移 ===")
	log.Printf("源目录: %s", *dataDir)
	log.Printf("目标数据库: %s", *dbPath)

	// Migrate each collection
	migrateUsers(db, *dataDir)
	migrateFamilies(db, *dataDir)
	migrateFamilyMembers(db, *dataDir)
	migratePersons(db, *dataDir)
	migrateRelationships(db, *dataDir)
	migratePhotos(db, *dataDir)
	migratePhotoTags(db, *dataDir)
	migrateEditHistory(db, *dataDir)
	migratePersonNotes(db, *dataDir)
	migrateJoinRequests(db, *dataDir)
	migrateShareLinks(db, *dataDir)
	migrateCustomTitleMaps(db, *dataDir)

	// Re-enable foreign keys
	db.Exec("PRAGMA foreign_keys = ON")

	log.Println("=== 迁移完成 ===")
}

// readJSON reads a JSON array file and returns the parsed records.
func readJSON(dir, filename string) []map[string]interface{} {
	path := filepath.Join(dir, filename)
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("跳过 %s: %v", filename, err)
		return nil
	}

	var records []map[string]interface{}
	if err := json.Unmarshal(data, &records); err != nil {
		log.Printf("解析 %s 失败: %v", filename, err)
		return nil
	}

	log.Printf("读取 %s: %d 条记录", filename, len(records))
	return records
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok && v != nil {
		return fmt.Sprintf("%v", v)
	}
	return ""
}

func getInt(m map[string]interface{}, key string) int64 {
	if v, ok := m[key]; ok && v != nil {
		switch n := v.(type) {
		case float64:
			return int64(n)
		case int64:
			return n
		case json.Number:
			i, _ := n.Int64()
			return i
		}
	}
	return 0
}

func getFloat(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok && v != nil {
		switch n := v.(type) {
		case float64:
			return n
		}
	}
	return 0
}

func getBool(m map[string]interface{}, key string) int {
	if v, ok := m[key]; ok && v != nil {
		switch b := v.(type) {
		case bool:
			if b {
				return 1
			}
		case float64:
			if b != 0 {
				return 1
			}
		}
	}
	return 0
}

func getJSONString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok && v != nil {
		b, err := json.Marshal(v)
		if err == nil {
			return string(b)
		}
	}
	return ""
}

func getDateString(m map[string]interface{}, key string) string {
	v, ok := m[key]
	if !ok || v == nil {
		return ""
	}
	// Cloud export dates can be { "$date": "2024-..." } or plain string
	switch d := v.(type) {
	case string:
		return d
	case map[string]interface{}:
		if ds, ok := d["$date"]; ok {
			return fmt.Sprintf("%v", ds)
		}
	}
	return fmt.Sprintf("%v", v)
}

func nullString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func migrateUsers(db *sql.DB, dir string) {
	records := readJSON(dir, "users.json")
	if records == nil {
		return
	}
	for _, r := range records {
		_, err := db.Exec(
			`INSERT OR IGNORE INTO users (id, openid_hash, encrypted_openid, nickname, avatar_url, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "openid_hash"),
			getString(r, "encrypted_openid"),
			getString(r, "nickname"),
			getString(r, "avatar_url"),
			getDateString(r, "created_at"),
			getDateString(r, "updated_at"),
		)
		if err != nil {
			log.Printf("  users 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  users: 迁移 %d 条", len(records))
}

func migrateFamilies(db *sql.DB, dir string) {
	records := readJSON(dir, "families.json")
	if records == nil {
		return
	}
	for _, r := range records {
		_, err := db.Exec(
			`INSERT OR IGNORE INTO families (id, name, owner_id, member_count, storage_used_bytes, storage_unlimited, invite_code, invite_code_active, invite_code_expire, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "name"),
			getString(r, "owner_id"),
			getInt(r, "member_count"),
			getInt(r, "storage_used_bytes"),
			getBool(r, "storage_unlimited"),
			nullString(getString(r, "invite_code")),
			getBool(r, "invite_code_active"),
			getInt(r, "invite_code_expire"),
			getDateString(r, "created_at"),
			getDateString(r, "updated_at"),
		)
		if err != nil {
			log.Printf("  families 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  families: 迁移 %d 条", len(records))
}

func migrateFamilyMembers(db *sql.DB, dir string) {
	records := readJSON(dir, "family_members.json")
	if records == nil {
		return
	}
	for _, r := range records {
		_, err := db.Exec(
			`INSERT OR IGNORE INTO family_members (id, family_id, user_id, person_id, bound_person_id, role, adopted_title_map_id, joined_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "family_id"),
			getString(r, "user_id"),
			nullString(getString(r, "person_id")),
			nullString(getString(r, "bound_person_id")),
			getString(r, "role"),
			nullString(getString(r, "adopted_title_map_id")),
			getDateString(r, "joined_at"),
		)
		if err != nil {
			log.Printf("  family_members 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  family_members: 迁移 %d 条", len(records))
}

func migratePersons(db *sql.DB, dir string) {
	records := readJSON(dir, "persons.json")
	if records == nil {
		return
	}
	for _, r := range records {
		var birthYear interface{}
		if v, ok := r["birth_year"]; ok && v != nil {
			birthYear = getInt(r, "birth_year")
		}

		_, err := db.Exec(
			`INSERT OR IGNORE INTO persons (id, family_id, name, gender, birth_year, is_deceased, avatar, avatar_public, generation, bound_user_id, created_by, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "family_id"),
			getString(r, "name"),
			getString(r, "gender"),
			birthYear,
			getBool(r, "is_deceased"),
			getString(r, "avatar"),
			getBool(r, "avatar_public"),
			getInt(r, "generation"),
			nullString(getString(r, "bound_user_id")),
			getString(r, "created_by"),
			getDateString(r, "created_at"),
			getDateString(r, "updated_at"),
		)
		if err != nil {
			log.Printf("  persons 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  persons: 迁移 %d 条", len(records))
}

func migrateRelationships(db *sql.DB, dir string) {
	records := readJSON(dir, "relationships.json")
	if records == nil {
		return
	}
	for _, r := range records {
		_, err := db.Exec(
			`INSERT OR IGNORE INTO relationships (id, family_id, from_id, to_id, relation_type, created_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "family_id"),
			getString(r, "from_id"),
			getString(r, "to_id"),
			getString(r, "relation_type"),
			getDateString(r, "created_at"),
		)
		if err != nil {
			log.Printf("  relationships 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  relationships: 迁移 %d 条", len(records))
}

func migratePhotos(db *sql.DB, dir string) {
	records := readJSON(dir, "photos.json")
	if records == nil {
		return
	}
	for _, r := range records {
		// Cloud photos have file_id (cloud file ID), not file_url
		// These will need manual URL update after downloading photos
		fileURL := getString(r, "file_url")
		if fileURL == "" {
			fileURL = getString(r, "file_id")
		}
		thumbURL := getString(r, "thumb_url")
		if thumbURL == "" {
			thumbURL = getString(r, "thumb_file_id")
		}

		_, err := db.Exec(
			`INSERT OR IGNORE INTO photos (id, family_id, person_id, uploader_id, file_url, thumb_url, file_size, width, height, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "family_id"),
			getString(r, "person_id"),
			getString(r, "uploader_id"),
			fileURL,
			thumbURL,
			getInt(r, "file_size"),
			getInt(r, "width"),
			getInt(r, "height"),
			getString(r, "status"),
			getDateString(r, "created_at"),
			getDateString(r, "updated_at"),
		)
		if err != nil {
			log.Printf("  photos 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  photos: 迁移 %d 条", len(records))
	log.Println("  注意: 照片文件需要从云存储手动下载，然后更新 file_url/thumb_url")
}

func migratePhotoTags(db *sql.DB, dir string) {
	records := readJSON(dir, "photo_tags.json")
	if records == nil {
		return
	}
	for _, r := range records {
		_, err := db.Exec(
			`INSERT OR IGNORE INTO photo_tags (id, photo_id, person_id, x, y, tagged_by, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "photo_id"),
			getString(r, "person_id"),
			getFloat(r, "x"),
			getFloat(r, "y"),
			getString(r, "tagged_by"),
			getDateString(r, "created_at"),
		)
		if err != nil {
			log.Printf("  photo_tags 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  photo_tags: 迁移 %d 条", len(records))
}

func migrateEditHistory(db *sql.DB, dir string) {
	records := readJSON(dir, "edit_history.json")
	if records == nil {
		return
	}
	for _, r := range records {
		_, err := db.Exec(
			`INSERT OR IGNORE INTO edit_history (id, family_id, person_id, action, operator_id, user_id, snapshot_before, snapshot_after, field_changes, rollback_from, is_rolled_back, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "family_id"),
			getString(r, "person_id"),
			getString(r, "action"),
			getString(r, "operator_id"),
			nullString(getString(r, "user_id")),
			getJSONString(r, "snapshot_before"),
			getJSONString(r, "snapshot_after"),
			getJSONString(r, "field_changes"),
			nullString(getString(r, "rollback_from")),
			getBool(r, "is_rolled_back"),
			getDateString(r, "created_at"),
		)
		if err != nil {
			log.Printf("  edit_history 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  edit_history: 迁移 %d 条", len(records))
}

func migratePersonNotes(db *sql.DB, dir string) {
	records := readJSON(dir, "person_notes.json")
	if records == nil {
		return
	}
	for _, r := range records {
		// remarks field: if it's an array, marshal to JSON string; if string, keep as-is
		remarksStr := "[]"
		if v, ok := r["remarks"]; ok && v != nil {
			switch rv := v.(type) {
			case []interface{}:
				b, _ := json.Marshal(rv)
				remarksStr = string(b)
			case string:
				remarksStr = rv
			}
		}

		_, err := db.Exec(
			`INSERT OR IGNORE INTO person_notes (id, family_id, person_id, user_id, phone, wechat_id, birth_date, city, occupation, custom_title, remarks, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "family_id"),
			getString(r, "person_id"),
			getString(r, "user_id"),
			getString(r, "phone"),
			getString(r, "wechat_id"),
			getString(r, "birth_date"),
			getString(r, "city"),
			getString(r, "occupation"),
			getString(r, "custom_title"),
			remarksStr,
			getDateString(r, "created_at"),
			getDateString(r, "updated_at"),
		)
		if err != nil {
			log.Printf("  person_notes 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  person_notes: 迁移 %d 条", len(records))
}

func migrateJoinRequests(db *sql.DB, dir string) {
	records := readJSON(dir, "join_requests.json")
	if records == nil {
		return
	}
	for _, r := range records {
		_, err := db.Exec(
			`INSERT OR IGNORE INTO join_requests (id, family_id, user_id, person_id, status, reviewed_by, reviewed_at, reject_reason, expire_at, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "family_id"),
			getString(r, "user_id"),
			nullString(getString(r, "person_id")),
			getString(r, "status"),
			nullString(getString(r, "reviewed_by")),
			nullString(getDateString(r, "reviewed_at")),
			nullString(getString(r, "reject_reason")),
			getInt(r, "expire_at"),
			getDateString(r, "created_at"),
		)
		if err != nil {
			log.Printf("  join_requests 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  join_requests: 迁移 %d 条", len(records))
}

func migrateShareLinks(db *sql.DB, dir string) {
	records := readJSON(dir, "share_links.json")
	if records == nil {
		return
	}
	for _, r := range records {
		_, err := db.Exec(
			`INSERT OR IGNORE INTO share_links (id, family_id, code, created_by, expire_at, is_active, view_count, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "family_id"),
			getString(r, "code"),
			getString(r, "created_by"),
			getInt(r, "expire_at"),
			getBool(r, "is_active"),
			getInt(r, "view_count"),
			getDateString(r, "created_at"),
		)
		if err != nil {
			log.Printf("  share_links 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  share_links: 迁移 %d 条", len(records))
}

func migrateCustomTitleMaps(db *sql.DB, dir string) {
	records := readJSON(dir, "custom_title_maps.json")
	if records == nil {
		return
	}
	for _, r := range records {
		overridesStr := "{}"
		if v, ok := r["overrides"]; ok && v != nil {
			b, err := json.Marshal(v)
			if err == nil {
				overridesStr = string(b)
			}
		}

		_, err := db.Exec(
			`INSERT OR IGNORE INTO custom_title_maps (id, creator_id, family_id, name, overrides, is_shared, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			getString(r, "_id"),
			getString(r, "creator_id"),
			getString(r, "family_id"),
			getString(r, "name"),
			overridesStr,
			getBool(r, "is_shared"),
			getDateString(r, "created_at"),
			getDateString(r, "updated_at"),
		)
		if err != nil {
			log.Printf("  custom_title_maps 插入失败 [%s]: %v", getString(r, "_id"), err)
		}
	}
	log.Printf("  custom_title_maps: 迁移 %d 条", len(records))
}

// Suppress unused import warning
var _ = strings.TrimSpace
