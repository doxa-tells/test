// web/catalog/lib/db.ts
import "server-only";
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool() {
    if (pool) return pool;

    pool = new Pool({
        user: process.env.PG_USER,
        host: process.env.PG_HOST,
        database: process.env.PG_DB,
        password: process.env.PG_PASSWORD,
        port: parseInt(process.env.PG_PORT || "5432"),
    });
    return pool;
}

export type CastingPrefs = {
  role_title?: string | null;
  project?: string | null;
  city?: string | null;
  sex?: string | null;
  look_type?: string | null;
  body_type?: string | null;
  hair_color?: string | null;
  eye_color?: string | null;
  lang?: string | null;
  height_min?: number | null;
  height_max?: number | null;
  age_from?: number | null;
  age_to?: number | null;
  notes?: string | null;
  requirements?: string | null;
};

export async function getCastingPrefs(casting_id: number): Promise<CastingPrefs | null> {
  const rows = await query(
    `SELECT role_title, project, city, sex, look_type, body_type, hair_color, eye_color, lang,
            height_min, height_max, age_from, age_to, notes, requirements
     FROM casting_prefs WHERE casting_id=$1`, [casting_id]
  );
  return rows[0] || null;
}

export async function saveCastingPrefs(casting_id: number, p: CastingPrefs) {
  await query(
    `INSERT INTO casting_prefs(casting_id, role_title, project, city, sex, look_type, body_type, hair_color, eye_color, lang, height_min, height_max, age_from, age_to, notes, requirements, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
     ON CONFLICT (casting_id) DO UPDATE SET
       role_title=EXCLUDED.role_title, project=EXCLUDED.project, city=EXCLUDED.city,
       sex=EXCLUDED.sex, look_type=EXCLUDED.look_type, body_type=EXCLUDED.body_type,
       hair_color=EXCLUDED.hair_color, eye_color=EXCLUDED.eye_color, lang=EXCLUDED.lang,
       height_min=EXCLUDED.height_min, height_max=EXCLUDED.height_max,
       age_from=EXCLUDED.age_from, age_to=EXCLUDED.age_to,
       notes=EXCLUDED.notes, requirements=EXCLUDED.requirements,
       updated_at=NOW()`,
    [casting_id, p.role_title ?? null, p.project ?? null, p.city ?? null, p.sex ?? null, p.look_type ?? null, p.body_type ?? null, p.hair_color ?? null, p.eye_color ?? null, p.lang ?? null, p.height_min ?? null, p.height_max ?? null, p.age_from ?? null, p.age_to ?? null, p.notes ?? null, p.requirements ?? null]
  );
}

export async function updateCastingBasic(casting_id: number, user_id: number, title: string, description: string | null) {
  await query(`UPDATE castings SET title=$1, description=$2 WHERE id=$3 AND user_id=$4`, [title, description, casting_id, user_id]);
}

export async function query(sql: string, params: any[] = []) {
    const pool = getPool();
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export type Actor = {
  user_id: number;
  full_name: string | null;
  sex: string | null;
  age_range: string | null;
  look_type: string | null;
  body_type: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  hair_color: string | null;
  hair_type: string | null;
  eye_color: string | null;
  cities: string | null;
  languages: string | null;
  instagram: string | null;
  video_vizitka: string | null;
  showreel: string | null;
  portfolio: string | null;
  projects: string | null;
  skills: string | null;       // ← добавлено в тип
  updated_at: string | null;
};

/** Набор фильтров для каталога (все поля опциональны) */
export type CatalogFilters = {
  q?: string;            // поиск по имени
  sex?: string;          // Мужской | Женский
  city?: string;         // подстрока внутри cities
  look_type?: string;
  body_type?: string;    // фильтр по телосложению
  hair_color?: string;
  eye_color?: string;
  lang?: string;         // подстрока внутри languages
  heightMin?: number;
  heightMax?: number;
  ageFrom?: number;      // мин. край фильтра
  ageTo?: number;        // макс. край фильтра
  limit?: number;
  offset?: number;
};

/** Список актёров с фильтрами */
export async function listActors(filters: CatalogFilters = {}): Promise<Actor[]> {
    const {
        q, sex, city, look_type, body_type, hair_color, eye_color, lang,
        heightMin, heightMax, ageFrom, ageTo,
        limit = 60, offset = 0,
    } = filters;

    let whereClauses: string[] = ["full_name IS NOT NULL AND full_name <> ''"];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (q && q.trim()) {
        whereClauses.push(`full_name ILIKE $${paramIndex++}`);
        queryParams.push(`%${q.trim()}%`);
    }
    if (sex && sex.trim()) {
        whereClauses.push(`sex = $${paramIndex++}`);
        queryParams.push(sex.trim());
    }
    if (city && city.trim()) {
        whereClauses.push(`cities ILIKE $${paramIndex++}`);
        queryParams.push(`%${city.trim()}%`);
    }
    if (look_type && look_type.trim()) {
        whereClauses.push(`look_type = $${paramIndex++}`);
        queryParams.push(look_type.trim());
    }
    if (body_type && body_type.trim()) {
        whereClauses.push(`body_type = $${paramIndex++}`);
        queryParams.push(body_type.trim());
    }
    if (hair_color && hair_color.trim()) {
        whereClauses.push(`hair_color = $${paramIndex++}`);
        queryParams.push(hair_color.trim());
    }
    if (eye_color && eye_color.trim()) {
        whereClauses.push(`eye_color = $${paramIndex++}`);
        queryParams.push(eye_color.trim());
    }
    if (lang && lang.trim()) {
        whereClauses.push(`languages ILIKE $${paramIndex++}`);
        queryParams.push(`%${lang.trim()}%`);
    }
    if (typeof heightMin === "number" && Number.isFinite(heightMin)) {
        whereClauses.push(`height_cm >= $${paramIndex++}`);
        queryParams.push(heightMin);
    }
    if (typeof heightMax === "number" && Number.isFinite(heightMax)) {
        whereClauses.push(`height_cm <= $${paramIndex++}`);
        queryParams.push(heightMax);
    }

    const ageRange = "regexp_split_to_array(age_range, E'\\s*-\\s*')";
    if (typeof ageFrom === "number" && Number.isFinite(ageFrom)) {
        whereClauses.push(`CAST(${ageRange}[2] AS INTEGER) >= $${paramIndex++}`);
        queryParams.push(ageFrom);
    }
    if (typeof ageTo === "number" && Number.isFinite(ageTo)) {
        whereClauses.push(`CAST(${ageRange}[1] AS INTEGER) <= $${paramIndex++}`);
        queryParams.push(ageTo);
    }

    const qsql = `
        SELECT user_id, full_name, sex, age_range, look_type, body_type,
               height_cm, weight_kg, hair_color, hair_type, eye_color,
               cities, languages, instagram, video_vizitka, showreel, portfolio, projects,
               skills, updated_at
        FROM users
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY updated_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

    queryParams.push(limit, offset);

    return query(qsql, queryParams);
}

/** Получить актёра по ID */
export async function getActorById(id: number): Promise<Actor | undefined> {
    const q = `
        SELECT user_id, full_name, sex, age_range, look_type, body_type,
               height_cm, weight_kg, hair_color, hair_type, eye_color,
               cities, languages, instagram, video_vizitka, showreel, portfolio, projects,
               skills, updated_at
        FROM users WHERE user_id = $1`;
    const rows = await query(q, [id]);
    return rows[0];
}

/** серверный helper для URL фотографии через API-роут */
export function photoUrl(userId: number, n: 1 | 2 | 3 | 4) {
  return `/media/${userId}/photo/${n}`;
}

// === App-specific helpers for auth, profile and castings ===
export type AuthUser = { id: number; email: string; created_at: string };
export type Company = { id: number; user_id: number; name: string; role: string | null };
export type Casting = { id: number; user_id: number; title: string; description: string | null; created_at: string };

/** Create tables if not exist */
export async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users_auth (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      pass_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      , UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS castings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS casting_files (
      id SERIAL PRIMARY KEY,
      casting_id INTEGER NOT NULL REFERENCES castings(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      filetype TEXT,
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS casting_likes (
      id SERIAL PRIMARY KEY,
      casting_id INTEGER NOT NULL REFERENCES castings(id) ON DELETE CASCADE,
      actor_user_id INTEGER NOT NULL,
      decision TEXT NOT NULL CHECK (decision IN ('like','skip')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(casting_id, actor_user_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
      actor_user_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, actor_user_id)
    );

    CREATE TABLE IF NOT EXISTS casting_sends (
      id SERIAL PRIMARY KEY,
      casting_id INTEGER NOT NULL REFERENCES castings(id) ON DELETE CASCADE,
      actor_user_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(casting_id, actor_user_id)
    );

    CREATE TABLE IF NOT EXISTS user_prefs (
      user_id INTEGER PRIMARY KEY REFERENCES users_auth(id) ON DELETE CASCADE,
      sex TEXT,
      city TEXT,
      look_type TEXT,
      body_type TEXT,
      hair_color TEXT,
      eye_color TEXT,
      lang TEXT,
      height_min INTEGER,
      height_max INTEGER,
      age_from INTEGER,
      age_to INTEGER,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS casting_prefs (
      casting_id INTEGER PRIMARY KEY REFERENCES castings(id) ON DELETE CASCADE,
      role_title TEXT,
      project TEXT,
      city TEXT,
      sex TEXT,
      look_type TEXT,
      body_type TEXT,
      hair_color TEXT,
      eye_color TEXT,
      lang TEXT,
      height_min INTEGER,
      height_max INTEGER,
      age_from INTEGER,
      age_to INTEGER,
      notes TEXT,
      requirements TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function getUserByEmail(email: string): Promise<(AuthUser & { pass_hash: string }) | undefined> {
  const rows = await query(`SELECT id, email, pass_hash, created_at FROM users_auth WHERE email = $1`, [email]);
  return rows[0];
}

export async function createUser(email: string, pass_hash: string): Promise<AuthUser> {
  const rows = await query(
    `INSERT INTO users_auth(email, pass_hash) VALUES ($1,$2) RETURNING id, email, created_at`,
    [email, pass_hash]
  );
  return rows[0];
}

export async function upsertCompany(user_id: number, name: string, role: string | null) {
  const rows = await query(
    `INSERT INTO companies(user_id, name, role)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id, name) DO UPDATE SET role = EXCLUDED.role
     RETURNING id, user_id, name, role`,
    [user_id, name, role]
  );
  return rows[0];
}

export async function createCasting(user_id: number, title: string, description: string | null) {
  const rows = await query(
    `INSERT INTO castings(user_id, title, description) VALUES ($1,$2,$3) RETURNING id, user_id, title, description, created_at`,
    [user_id, title, description]
  );
  return rows[0] as Casting;
}

export async function listMyCastings(user_id: number) {
  return query(`SELECT id, user_id, title, description, created_at FROM castings WHERE user_id=$1 ORDER BY created_at DESC`, [user_id]);
}

export async function getCasting(casting_id: number, user_id: number) {
  const rows = await query(`SELECT id, user_id, title, description, created_at FROM castings WHERE id=$1 AND user_id=$2`, [casting_id, user_id]);
  return rows[0] as Casting | undefined;
}

export async function recordDecision(casting_id: number, actor_user_id: number, decision: 'like'|'skip') {
  await query(
    `INSERT INTO casting_likes(casting_id, actor_user_id, decision)
     VALUES ($1,$2,$3)
     ON CONFLICT (casting_id, actor_user_id) DO UPDATE SET decision = EXCLUDED.decision`,
    [casting_id, actor_user_id, decision]
  );
}

// Sessions
export async function createSession(id: string, user_id: number, expiresAtISO: string) {
  await query(`INSERT INTO sessions(id, user_id, expires_at) VALUES ($1,$2,$3)`, [id, user_id, expiresAtISO]);
}

export async function getSessionUser(sessionId: string): Promise<AuthUser | undefined> {
  const rows = await query(
    `SELECT u.id, u.email, u.created_at
     FROM sessions s JOIN users_auth u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > NOW()`,
    [sessionId]
  );
  return rows[0];
}

export async function destroySession(sessionId: string) {
  await query(`DELETE FROM sessions WHERE id=$1`, [sessionId]);
}

export async function listCastingFiles(casting_id: number) {
  return query(
    `SELECT id, filename, filetype, url, created_at FROM casting_files WHERE casting_id=$1 ORDER BY created_at DESC`,
    [casting_id]
  );
}

// === Favorites helpers ===
export async function addFavorite(user_id: number, actor_user_id: number) {
  await query(`INSERT INTO favorites(user_id, actor_user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [user_id, actor_user_id]);
}

export async function removeFavorite(user_id: number, actor_user_id: number) {
  await query(`DELETE FROM favorites WHERE user_id=$1 AND actor_user_id=$2`, [user_id, actor_user_id]);
}

export async function listFavoriteActors(user_id: number): Promise<Actor[]> {
  const rows = await query(
    `SELECT u.user_id, u.full_name, u.sex, u.age_range, u.look_type, u.body_type,
            u.height_cm, u.weight_kg, u.hair_color, u.hair_type, u.eye_color,
            u.cities, u.languages, u.instagram, u.video_vizitka, u.showreel, u.portfolio, u.projects,
            u.skills, u.updated_at
     FROM favorites f JOIN users u ON u.user_id = f.actor_user_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [user_id]
  );
  return rows as Actor[];
}

export async function isFavorite(user_id: number, actor_user_id: number): Promise<boolean> {
  const rows = await query(`SELECT 1 FROM favorites WHERE user_id=$1 AND actor_user_id=$2`, [user_id, actor_user_id]);
  return !!rows[0];
}

// === Casting sends ===
export async function sendCastingToActor(casting_id: number, actor_user_id: number) {
  await query(
    `INSERT INTO casting_sends(casting_id, actor_user_id) VALUES ($1,$2)
     ON CONFLICT (casting_id, actor_user_id) DO NOTHING`,
    [casting_id, actor_user_id]
  );
}

export type UserPrefs = {
  sex?: string | null;
  city?: string | null;
  look_type?: string | null;
  body_type?: string | null;
  hair_color?: string | null;
  eye_color?: string | null;
  lang?: string | null;
  height_min?: number | null;
  height_max?: number | null;
  age_from?: number | null;
  age_to?: number | null;
};

export async function getUserPrefs(user_id: number): Promise<UserPrefs | null> {
  const rows = await query(`SELECT sex, city, look_type, body_type, hair_color, eye_color, lang, height_min, height_max, age_from, age_to FROM user_prefs WHERE user_id=$1`, [user_id]);
  return rows[0] || null;
}

export async function saveUserPrefs(user_id: number, p: UserPrefs) {
  await query(
    `INSERT INTO user_prefs(user_id, sex, city, look_type, body_type, hair_color, eye_color, lang, height_min, height_max, age_from, age_to, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       sex=EXCLUDED.sex, city=EXCLUDED.city, look_type=EXCLUDED.look_type, body_type=EXCLUDED.body_type,
       hair_color=EXCLUDED.hair_color, eye_color=EXCLUDED.eye_color, lang=EXCLUDED.lang,
       height_min=EXCLUDED.height_min, height_max=EXCLUDED.height_max, age_from=EXCLUDED.age_from, age_to=EXCLUDED.age_to,
       updated_at=NOW()`,
    [user_id, p.sex ?? null, p.city ?? null, p.look_type ?? null, p.body_type ?? null, p.hair_color ?? null, p.eye_color ?? null, p.lang ?? null, p.height_min ?? null, p.height_max ?? null, p.age_from ?? null, p.age_to ?? null]
  );
}

