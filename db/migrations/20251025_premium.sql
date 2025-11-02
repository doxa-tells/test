-- Premium subscriptions and categories migration
BEGIN;

-- 1) Extend subs with plan and valid_until
ALTER TABLE IF EXISTS subs
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- 2) Categories dictionary
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL
);

-- 3) User category preferences (many-to-many)
CREATE TABLE IF NOT EXISTS user_category_prefs (
  user_id BIGINT NOT NULL,
  category_code TEXT NOT NULL,
  PRIMARY KEY (user_id, category_code),
  FOREIGN KEY (category_code) REFERENCES categories(code) ON DELETE CASCADE
);

-- 4) Cache for casting classification to avoid repeated LLM calls
CREATE TABLE IF NOT EXISTS casting_category_cache (
  id SERIAL PRIMARY KEY,
  source_chat BIGINT NOT NULL,
  message_id BIGINT NOT NULL,
  thread_id INT,
  categories TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_chat, message_id)
);

-- 5) Suggested base categories seed (idempotent)
INSERT INTO categories (code, title) VALUES
  ('film_role', 'Роль в кино/сериале'),
  ('commercial', 'Рекламный ролик'),
  ('extras', 'Актеры массовых сцен'),
  ('model', 'Модель')
ON CONFLICT (code) DO NOTHING;

COMMIT;
