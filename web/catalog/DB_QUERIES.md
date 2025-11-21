# 📚 Database Query Documentation – Catalog Backend

## Overview
The Catalog backend stores its data in a **PostgreSQL** database. All interactions with the DB are centralized in `app/lib/db.ts`.  Each helper function either runs a raw SQL query via the internal `query()` wrapper or orchestrates a series of queries to guarantee data integrity.

Below you will find a **compact reference table** for every public DB helper, the SQL it executes, the parameters it expects, and the shape of the data returned to the API layer.

---

## 1️⃣ Core Helper
| Function | Purpose | SQL (simplified) | Params | Returns |
|----------|---------|------------------|--------|---------|
| `query(sql, params?)` | Low‑level wrapper around `pg` client. Opens a connection, runs the query, returns `rows`. | `client.query(sql, params)` | `sql: string`, `params: any[]` | `Array<any>` (rows) |
| `ensureTables()` | Creates all tables if they do not exist and runs a few migrations. | Multiple `CREATE TABLE IF NOT EXISTS …` statements + `ALTER TABLE …` checks. | none | `void` (runs side‑effects) |

---

## 2️⃣ Authentication & Session
| Function | SQL | Params | Returns |
|----------|-----|--------|---------|
| `getUserAuthById(id)` | `SELECT id, email, pass_hash, created_at FROM users_auth WHERE id = $1` | `[id]` | `{ id, email, pass_hash, created_at }` |
| `updateUserEmail(id, email)` | `UPDATE users_auth SET email=$1 WHERE id=$2` | `[email, id]` | `void` |
| `updateUserPasswordHash(id, pass_hash)` | `UPDATE users_auth SET pass_hash=$1 WHERE id=$2` | `[pass_hash, id]` | `void` |
| `getUserByEmail(email)` | `SELECT id, email, pass_hash, created_at FROM users_auth WHERE email = $1` | `[email]` | `{ id, email, pass_hash, created_at }` |
| `createUser(email, pass_hash)` | `INSERT INTO users_auth(email, pass_hash) VALUES ($1,$2) RETURNING id, email, created_at` | `[email, pass_hash]` | `{ id, email, created_at }` |
| `createSession(id, user_id, expiresAtISO)` | `INSERT INTO sessions(id, user_id, expires_at) VALUES ($1,$2,$3)` | `[id, user_id, expiresAtISO]` | `void` |
| `getSessionUser(sessionId)` | `SELECT u.id, u.email, u.created_at FROM sessions s JOIN users_auth u ON u.id = s.user_id WHERE s.id = $1 AND s.expires_at > NOW()` | `[sessionId]` | `{ id, email, created_at }` |
| `destroySession(sessionId)` | `DELETE FROM sessions WHERE id=$1` | `[sessionId]` | `void` |

---

## 3️⃣ Companies & Actor Links
| Function | SQL | Params | Returns |
|----------|-----|--------|---------|
| `upsertCompany(user_id, name, role, bio?)` | 1️⃣ `SELECT id FROM companies WHERE user_id=$1 ORDER BY id DESC` (detect duplicates)  <br>2️⃣ `UPDATE companies SET name=$2, role=$3, bio=$4 WHERE id=$id` <br>3️⃣ `INSERT INTO companies(user_id, name, role, bio) VALUES ($1,$2,$3,$4) RETURNING …` | `[user_id, name, role, bio]` | `{ id, user_id, name, role, bio }` |
| `getLinkedActorUserId(auth_user_id)` | `SELECT actor_user_id FROM user_actor_link WHERE auth_user_id=$1` | `[auth_user_id]` | `number | null` |
| `setLinkedActorUserId(auth_user_id, actor_user_id)` | `INSERT INTO user_actor_link(auth_user_id, actor_user_id, updated_at) VALUES ($1,$2,NOW()) ON CONFLICT (auth_user_id) DO UPDATE SET actor_user_id=EXCLUDED.actor_user_id, updated_at=NOW()` | `[auth_user_id, actor_user_id]` | `void` |

---

## 4️⃣ Castings & Files
| Function | SQL | Params | Returns |
|----------|-----|--------|---------|
| `createCasting(user_id, title, description)` | `INSERT INTO castings(user_id, title, description) VALUES ($1,$2,$3) RETURNING id, user_id, title, description, created_at` | `[user_id, title, description]` | `{ id, user_id, title, description, created_at }` |
| `listMyCastings(user_id)` | `SELECT id, user_id, title, description, created_at FROM castings WHERE user_id=$1 ORDER BY created_at DESC` | `[user_id]` | `Casting[]` |
| `listAllCastings(limit, offset)` | `SELECT id, user_id, title, description, created_at FROM castings ORDER BY created_at DESC LIMIT $1 OFFSET $2` | `[limit, offset]` | `Casting[]` |
| `getCasting(casting_id, user_id)` | `SELECT id, user_id, title, description, created_at FROM castings WHERE id=$1 AND user_id=$2` | `[casting_id, user_id]` | `Casting | undefined` |
| `getCastingPublic(casting_id)` | `SELECT id, user_id, title, description, created_at FROM castings WHERE id=$1` | `[casting_id]` | `Casting | undefined` |
| `listCastingFiles(casting_id)` | `SELECT id, filename, filetype, url, created_at FROM casting_files WHERE casting_id=$1 ORDER BY created_at DESC` | `[casting_id]` | `FileMeta[]` |
| `addCastingAudition(casting_id, actor_user_id, filename, url)` | `INSERT INTO casting_auditions(casting_id, actor_user_id, filename, url) VALUES ($1,$2,$3,$4)` | `[casting_id, actor_user_id, filename, url]` | `void` |
| `listCastingAuditions(casting_id)` | `SELECT id, casting_id, actor_user_id, filename, url, created_at FROM casting_auditions WHERE casting_id=$1 ORDER BY created_at DESC` | `[casting_id]` | `Audition[]` |
| `recordDecision(casting_id, actor_user_id, decision)` | `INSERT INTO casting_likes(casting_id, actor_user_id, decision) VALUES ($1,$2,$3) ON CONFLICT (casting_id, actor_user_id) DO UPDATE SET decision = EXCLUDED.decision` | `[casting_id, actor_user_id, decision]` | `void` |
| `sendCastingToActor(casting_id, actor_user_id)` | `INSERT INTO casting_sends(casting_id, actor_user_id) VALUES ($1,$2) ON CONFLICT (casting_id, actor_user_id) DO NOTHING` | `[casting_id, actor_user_id]` | `void` |

---

## 5️⃣ Actors & Catalog Search
| Function | SQL (key parts) | Params | Returns |
|----------|----------------|--------|---------|
| `listActors(filters)` | Dynamically builds a `WHERE` clause based on supplied filters (name, sex, city, look_type, body_type, hair_color, eye_color, language, height, age, etc.) and finally runs:
```sql
SELECT user_id, full_name, sex, age_range, look_type, body_type,
       height_cm, weight_kg, hair_color, hair_type, eye_color,
       cities, languages, instagram, video_vizitka, showreel, portfolio, projects,
       skills, updated_at
FROM users
WHERE <generated_conditions>
ORDER BY updated_at DESC
LIMIT $limit OFFSET $offset;
``` | `filters: CatalogFilters` (converted to positional `$1…$n`) | `Actor[]` (array of objects matching the `Actor` type) |
| `getActorById(id)` | `SELECT user_id, full_name, sex, age_range, look_type, body_type, height_cm, weight_kg, hair_color, hair_type, eye_color, cities, languages, instagram, video_vizitka, showreel, portfolio, projects, skills, updated_at FROM users WHERE user_id = $1` | `[id]` | `Actor | undefined` |
| `photoUrl(userId, n)` | **Helper** – builds a URL string, no DB call. | `(userId, n)` | `string` |

---

## 6️⃣ Preferences (User‑wide UI settings)
| Function | SQL | Params | Returns |
|----------|-----|--------|---------|
| `getUserPrefs(user_id)` | `SELECT sex, city, look_type, body_type, hair_color, eye_color, lang, height_min, height_max, age_from, age_to FROM user_prefs WHERE user_id=$1` | `[user_id]` | `UserPrefs | null` |
| `saveUserPrefs(user_id, p)` | `INSERT INTO user_prefs(user_id, sex, city, look_type, body_type, hair_color, eye_color, lang, height_min, height_max, age_from, age_to, updated_at) VALUES ($1,$2,…,$12,NOW()) ON CONFLICT (user_id) DO UPDATE SET …` | `[user_id, p.sex, p.city, …]` | `void` |

---

## 7️⃣ Favorites (Actor‑to‑User relationships)
| Function | SQL | Params | Returns |
|----------|-----|--------|---------|
| `addFavorite(user_id, actor_user_id)` | `INSERT INTO favorites(user_id, actor_user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING` | `[user_id, actor_user_id]` | `void` |
| `removeFavorite(user_id, actor_user_id)` | `DELETE FROM favorites WHERE user_id=$1 AND actor_user_id=$2` | `[user_id, actor_user_id]` | `void` |
| `listFavoriteActors(user_id)` | ```sql
SELECT u.user_id, u.full_name, u.sex, u.age_range, u.look_type, u.body_type,
       u.height_cm, u.weight_kg, u.hair_color, u.hair_type, u.eye_color,
       u.cities, u.languages, u.instagram, u.video_vizitka, u.showreel, u.portfolio, u.projects,
       u.skills, u.updated_at
FROM favorites f JOIN users u ON u.user_id = f.actor_user_id
WHERE f.user_id = $1
ORDER BY f.created_at DESC;
``` | `[user_id]` | `Actor[]` |
| `isFavorite(user_id, actor_user_id)` | `SELECT 1 FROM favorites WHERE user_id=$1 AND actor_user_id=$2` | `[user_id, actor_user_id]` | `boolean` |

---

## 8️⃣ User Projects (Portfolio items)
| Function | SQL | Params | Returns |
|----------|-----|--------|---------|
| `listUserProjects(user_id)` | `SELECT id, user_id, title, role, description, media_url, media_type, created_at FROM user_projects WHERE user_id=$1 ORDER BY created_at DESC` | `[user_id]` | `UserProject[]` |
| `addUserProject(user_id, data)` | `INSERT INTO user_projects(user_id, title, role, description, media_url, media_type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, user_id, title, role, description, media_url, media_type, created_at` | `[user_id, data.title, data.role, data.description, data.media_url, data.media_type]` | `UserProject` |
| `deleteUserProject(user_id, id)` | `DELETE FROM user_projects WHERE id=$1 AND user_id=$2` | `[id, user_id]` | `void` |

---

## 9️⃣ Casting Preferences (per‑casting)
| Function | SQL | Params | Returns |
|----------|-----|--------|---------|
| `getCastingPrefs(casting_id)` | `SELECT role_title, project, city, sex, look_type, body_type, hair_color, eye_color, lang, height_min, height_max, age_from, age_to, weight_min, weight_max, notes, requirements FROM casting_prefs WHERE casting_id=$1` | `[casting_id]` | `CastingPrefs | null` |
| `saveCastingPrefs(casting_id, p)` | `INSERT INTO casting_prefs(casting_id, role_title, project, city, sex, look_type, body_type, hair_color, eye_color, lang, height_min, height_max, age_from, age_to, weight_min, weight_max, notes, requirements, updated_at) VALUES (…) ON CONFLICT (casting_id) DO UPDATE SET …` | `[casting_id, p.role_title, …]` | `void` |
| `updateCastingBasic(casting_id, user_id, title, description)` | `UPDATE castings SET title=$1, description=$2 WHERE id=$3 AND user_id=$4` | `[title, description, casting_id, user_id]` | `void` |

---

## 10️⃣ Table Diagram (high‑level)
```
users_auth      ← stores login credentials
sessions        ← JWT‑session mapping
companies       ← company info per user
castings        ← each casting created by a user
casting_files   ← files attached to a casting
casting_likes   ← actor decisions (like/skip)
casting_sends   ← which actors a casting was sent to
casting_auditions ← uploaded audition files
user_actor_link ← link between auth user and actor profile
favorites       ← many‑to‑many (user ↔ actor)
user_prefs      ← UI filter preferences
casting_prefs   ← preferences attached to a casting
user_projects   ← portfolio projects
user_project_media ← media items for a project
```

---

## How to Use This Doc
- **Search** for a function name (e.g. `listActors`) to see the exact SQL and the shape returned to the API layer.
- When adding a new endpoint, **reuse an existing helper** if possible; otherwise add a new function here and keep the table up‑to‑date.
- The tables above are the single source of truth for **backend‑to‑frontend data contracts** – the API docs (`API_ENDPOINTS.md`) reference the payloads produced by these helpers.

*Document last updated: 2025‑11‑21*
