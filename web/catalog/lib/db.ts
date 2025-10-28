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