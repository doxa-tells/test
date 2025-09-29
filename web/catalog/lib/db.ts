// web/catalog/lib/db.ts
import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let _db: Database.Database | null = null;

function resolveDbPath(): string {
  const envPath = (process.env.DB_PATH || "").trim();
  if (envPath) {
    // поддерживаем относительный путь в DB_PATH
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  // по умолчанию: ../../data/actors.db (из каталога web/catalog)
  return path.resolve(process.cwd(), "../../data/actors.db");
}

export function db() {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`actors.db not found: ${dbPath}`);
  }
  _db = new Database(dbPath, { readonly: true });
  return _db;
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
export function listActors(filters: CatalogFilters = {}): Actor[] {
  const {
    q, sex, city, look_type, body_type, hair_color, eye_color, lang,
    heightMin, heightMax, ageFrom, ageTo,
    limit = 60, offset = 0,
  } = filters;

  const where: string[] = ["full_name IS NOT NULL AND full_name <> ''"];
  const args: (string | number)[] = [];

  if (q && q.trim()) {
    where.push("full_name LIKE ?");
    args.push(`%${q.trim()}%`);
  }
  if (sex && sex.trim()) {
    where.push("sex = ?");
    args.push(sex.trim());
  }
  if (city && city.trim()) {
    where.push("cities LIKE ?");
    args.push(`%${city.trim()}%`);
  }
  if (look_type && look_type.trim()) {
    where.push("look_type = ?");
    args.push(look_type.trim());
  }
  if (body_type && body_type.trim()) {
    where.push("body_type = ?");
    args.push(body_type.trim());
  }
  if (hair_color && hair_color.trim()) {
    where.push("hair_color = ?");
    args.push(hair_color.trim());
  }
  if (eye_color && eye_color.trim()) {
    where.push("eye_color = ?");
    args.push(eye_color.trim());
  }
  if (lang && lang.trim()) {
    where.push("languages LIKE ?");
    args.push(`%${lang.trim()}%`);
  }

  if (typeof heightMin === "number" && Number.isFinite(heightMin)) {
    where.push("height_cm >= ?");
    args.push(heightMin);
  }
  if (typeof heightMax === "number" && Number.isFinite(heightMax)) {
    where.push("height_cm <= ?");
    args.push(heightMax);
  }

  // ==== Корректная фильтрация по ИНТЕРВАЛУ age_range ====
  // Нормализуем age_range: убираем пробелы и разные типы дефисов к '-'
  const AGE = "REPLACE(REPLACE(REPLACE(age_range,' ',''),'–','-'),'—','-')";
  const AGE_MIN = `CAST(CASE WHEN instr(${AGE}, '-')>0 THEN substr(${AGE}, 1, instr(${AGE}, '-')-1) ELSE ${AGE} END AS INTEGER)`;
  const AGE_MAX = `CAST(CASE WHEN instr(${AGE}, '-')>0 THEN substr(${AGE}, instr(${AGE}, '-')+1) ELSE ${AGE} END AS INTEGER)`;

  // Пересечение интервалов: [AGE_MIN, AGE_MAX] ∩ [ageFrom, ageTo] ≠ ∅
  if (typeof ageFrom === "number" && Number.isFinite(ageFrom) &&
      typeof ageTo === "number" && Number.isFinite(ageTo)) {
    where.push(`(${AGE_MAX} >= ? AND ${AGE_MIN} <= ?)`);
    args.push(ageFrom, ageTo);
  } else if (typeof ageFrom === "number" && Number.isFinite(ageFrom)) {
    where.push(`${AGE_MAX} >= ?`);
    args.push(ageFrom);
  } else if (typeof ageTo === "number" && Number.isFinite(ageTo)) {
    where.push(`${AGE_MIN} <= ?`);
    args.push(ageTo);
  }
  // ======================================================

  const qsql = `
    SELECT user_id, full_name, sex, age_range, look_type, body_type,
           height_cm, weight_kg, hair_color, hair_type, eye_color,
           cities, languages, instagram, video_vizitka, showreel, portfolio, projects,
           updated_at
    FROM users
    WHERE ${where.join(" AND ")}
    ORDER BY datetime(replace(updated_at,'T',' ')) DESC
    LIMIT ? OFFSET ?`;

  return db().prepare(qsql).all(...args, limit, offset) as Actor[];
}

/** Получить актёра по ID */
export function getActorById(id: number): Actor | undefined {
  const q = `
    SELECT user_id, full_name, sex, age_range, look_type, body_type,
           height_cm, weight_kg, hair_color, hair_type, eye_color,
           cities, languages, instagram, video_vizitka, showreel, portfolio, projects,
           updated_at
    FROM users WHERE user_id = ?`;
  return db().prepare(q).get(id) as Actor | undefined;
}

/** серверный helper для URL фотографии через API-роут */
export function photoUrl(userId: number, n: 1 | 2 | 3 | 4) {
  return `/media/${userId}/photo/${n}`;
}
