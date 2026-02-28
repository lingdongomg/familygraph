package store

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// DB is the global database connection.
var DB *sql.DB

// Init opens the SQLite database and creates tables if needed.
func Init(dataDir string) error {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return fmt.Errorf("create data dir: %w", err)
	}

	dbPath := filepath.Join(dataDir, "familygraph.db")
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)", dbPath)

	var err error
	DB, err = sql.Open("sqlite", dsn)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}

	DB.SetMaxOpenConns(1)

	if err := DB.Ping(); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}

	return createTables()
}

func createTables() error {
	_, err := DB.Exec(schema)
	return err
}

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  openid_hash TEXT UNIQUE NOT NULL,
  encrypted_openid TEXT NOT NULL,
  nickname TEXT DEFAULT '微信用户',
  avatar_url TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  member_count INTEGER DEFAULT 1,
  storage_used_bytes INTEGER DEFAULT 0,
  storage_unlimited INTEGER DEFAULT 0,
  invite_code TEXT,
  invite_code_active INTEGER DEFAULT 0,
  invite_code_expire INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  family_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  person_id TEXT,
  bound_person_id TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  adopted_title_map_id TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  UNIQUE(family_id, user_id)
);

CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  birth_year INTEGER,
  is_deceased INTEGER DEFAULT 0,
  avatar TEXT DEFAULT '',
  avatar_public INTEGER DEFAULT 0,
  generation INTEGER DEFAULT 0,
  bound_user_id TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  family_id TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (from_id) REFERENCES persons(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id) REFERENCES persons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  family_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  uploader_id TEXT NOT NULL,
  file_url TEXT DEFAULT '',
  thumb_url TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photo_tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  photo_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  tagged_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS edit_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  family_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  action TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  user_id TEXT,
  snapshot_before TEXT,
  snapshot_after TEXT,
  field_changes TEXT,
  rollback_from TEXT,
  is_rolled_back INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS person_notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  family_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  phone TEXT DEFAULT '',
  wechat_id TEXT DEFAULT '',
  birth_date TEXT DEFAULT '',
  city TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  custom_title TEXT DEFAULT '',
  remarks TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(family_id, person_id, user_id)
);

CREATE TABLE IF NOT EXISTS join_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  family_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  person_id TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at DATETIME,
  reject_reason TEXT,
  expire_at INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  family_id TEXT NOT NULL,
  code TEXT NOT NULL,
  created_by TEXT NOT NULL,
  expire_at INTEGER,
  is_active INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_title_maps (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  creator_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  overrides TEXT DEFAULT '{}',
  is_shared INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_openid_hash ON users(openid_hash);
CREATE INDEX IF NOT EXISTS idx_fm_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_fm_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_persons_family ON persons(family_id);
CREATE INDEX IF NOT EXISTS idx_rel_family ON relationships(family_id);
CREATE INDEX IF NOT EXISTS idx_rel_from ON relationships(from_id);
CREATE INDEX IF NOT EXISTS idx_rel_to ON relationships(to_id);
CREATE INDEX IF NOT EXISTS idx_photos_family ON photos(family_id);
CREATE INDEX IF NOT EXISTS idx_photos_person ON photos(family_id, person_id);
CREATE INDEX IF NOT EXISTS idx_tags_photo ON photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_history_family ON edit_history(family_id);
CREATE INDEX IF NOT EXISTS idx_history_person ON edit_history(person_id);
CREATE INDEX IF NOT EXISTS idx_jr_family ON join_requests(family_id);
CREATE INDEX IF NOT EXISTS idx_sl_code ON share_links(code);
CREATE INDEX IF NOT EXISTS idx_tm_family ON custom_title_maps(family_id);
`
