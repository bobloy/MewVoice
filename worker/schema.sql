-- MewVoice D1 Schema

CREATE TABLE IF NOT EXISTS packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female')),
  description TEXT NOT NULL DEFAULT '',
  clip_counts TEXT NOT NULL,
  created_at TEXT NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  steam_id TEXT,
  steam_name TEXT,
  steam_avatar TEXT,
  r2_key TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_packs_created_at ON packs(created_at);
CREATE INDEX IF NOT EXISTS idx_packs_score ON packs(score);
CREATE INDEX IF NOT EXISTS idx_packs_steam_id ON packs(steam_id);
CREATE INDEX IF NOT EXISTS idx_packs_published ON packs(published);

CREATE TABLE IF NOT EXISTS votes (
  pack_id TEXT NOT NULL,
  steam_id TEXT NOT NULL,
  vote INTEGER NOT NULL CHECK (vote IN (1, -1)),
  PRIMARY KEY (pack_id, steam_id),
  FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_votes_pack_id ON votes(pack_id);
