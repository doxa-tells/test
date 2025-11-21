# 📚 API Endpoints – Catalog Backend

## Overview
This document lists **every public API route** under `app/api/` of the Catalog project, the HTTP method, a short description, and the exact JSON payload that the **frontend receives** on a successful request. All responses follow the standard wrapper used by `lib/api.ts`:
```json
{
  "status": "ok",
  "data": <payload>,
  "timestamp": "2025-11-21T10:00:00Z"
}
```
Error responses have the shape:
```json
{
  "status": "error",
  "error": { "code": <http>, "message": "...", "details": [] }
}
```

---

## Authentication
| Method | Path | Success payload | Errors |
|--------|------|----------------|--------|
| **POST** | `/auth/login` | `{ "user": { "id": number, "email": string, "role": string }` | 400/401 → `{ "error": "..." }` |
| **POST** | `/auth/logout` | `{}` (just `ok:true`) | 401 → `{ "error": "unauthorized" }` |
| **POST** | `/auth/register` | `{ "user": { "id": number, "email": string }` | 400/409 → `{ "error": "..." }` |

---

## Actor‑Link
| Method | Path | Success payload | Errors |
|--------|------|----------------|--------|
| **GET** | `/actor-link` | `{ "actor_user_id": number | null }` | 401 → unauthorized |
| **POST** | `/actor-link` | `{}` (ok) | 401 → unauthorized, 400 → bad_request |

---

## Actors & Search
| Method | Path | Success payload | Errors |
|--------|------|----------------|--------|
| **GET** | `/actors/search?q=<term>` | `{ "items": [{ "user_id": number, "full_name": string }, …] }` | 400 → bad_request |
| **GET** | `/actors/castings/[id]` | ```json
{ "casting": {"id":number,"user_id":number,"title":string,"description":string,"created_at":string},
  "company": {"name":string,"role":string,"bio":string} | null,
  "avatar_url": string | null,
  "prefs": { … } | null,
  "portfolio": [{"id":number,"title":string,"media":[{ "url":string,"media_type":string }], …}],
  "owner": boolean }
``` | 400 → bad_request, 404 → not_found |
| **GET** | `/actors/castings/[id]/files` | `{ "items": [{ "id":number,"filename":string,"filetype":string,"url":string,"created_at":string }, …] }` | 400 → bad_request |
| **GET** | `/actors/castings/[id]/prefs` | `{ "prefs": { … } }` (or `null`) | 400 → bad_request |
| **GET** | `/actors/castings/[id]/auditions` | `{ "items": [{ "id":number,"actor_user_id":number,"status":string,"created_at":string }, …] }` | 400 → bad_request |
| **POST** | `/actors/castings/[id]/auditions` | `{ "audition_id": number }` | 401/400 |
| **POST** | `/actors/castings/[id]/decision` | `{}` (ok) | 401/400 |

---

## Favorites
| Method | Path | Success payload | Errors |
|--------|------|----------------|--------|
| **GET** | `/favorites` | `{ "items": [{ "actor_user_id": number, "full_name": string, "avatar_url": string }, …] }` | 401 → unauthorized |
| **GET** | `/favorites?actor=<id>` | `{ "liked": boolean }` | 401 → unauthorized |
| **POST** | `/favorites` (body `{ actor_user_id }`) | `{}` (ok) | 401/400 |
| **DELETE** | `/favorites?actor=<id>` | `{}` (ok) | 401/400 |

---

## Preferences (UI settings)
| Method | Path | Success payload | Errors |
|--------|------|----------------|--------|
| **GET** | `/prefs` | `{ "prefs": { "theme": "dark"|"light", "locale": "ru", "showAvatars": boolean, … } }` | 401 → unauthorized |
| **POST** | `/prefs` (body with prefs) | `{}` (ok) | 401/400 |

---

## Public Data (no auth required)
| Method | Path | Success payload | Errors |
|--------|------|----------------|--------|
| **GET** | `/public-actors` | `{ "actors": [{ "user_id": number, "full_name": string, "avatar_url": string, "company": string }, …] }` | 500 → server_error |
| **GET** | `/public/castings` | `{ "castings": [{ "id": number, "title": string, "company": string, "avatar_url": string }, …] }` | 500 |
| **GET** | `/public/castings/[id]` | Same shape as private `/actors/castings/[id]` but `owner:false` and no private prefs. | 404 |

---

## Settings – Account & Company
| Method | Path | Success payload | Errors |
|--------|------|----------------|--------|
| **GET** | `/settings/account/email` | `{ "email": string }` | 401 |
| **POST** | `/settings/account/email` (body `{ email }`) | `{}` (ok) | 401/400 |
| **POST** | `/settings/account/password` (body `{ current, new }`) | `{}` (ok) | 401/400/invalid_current |
| **GET** | `/settings/company` | `{ "company": { "name": string, "role": string, "bio": string } }` | 401 |
| **POST** | `/settings/company` (body) | `{}` (ok) | 401/400 |
| **GET** | `/settings/avatar` | `{ "url": string }` | 401/404 |
| **POST** | `/settings/avatar` (multipart) | `{ "url": string }` | 401/400 |
| **DELETE** | `/settings/avatar` | `{}` (ok) | 401 |
| **GET** | `/settings/projects` | `{ "projects": [{ "id": number, "title": string, "media":[{…}], …] }` | 401 |
| **POST** | `/settings/projects` (body) | `{ "project_id": number }` | 401/400 |
| **DELETE** | `/settings/projects` (body `{ projectId }`) | `{}` (ok) | 401/400 |

---

## Miscellaneous
| Method | Path | Success payload | Errors |
|--------|------|----------------|--------|
| **POST** | `/send-casting` (public form) | `{ "casting_id": number }` | 400/500 |
| **POST** | `/upload` (multipart) | `{ "file": { "url": string, "size": number, "type": string } }` | 400/500 |

---

## How to Use This Document
- **Copy‑paste** the relevant table rows into your component docs or Storybook stories.
- The **payload** column shows exactly what the frontend will receive **inside the `data` field** of the wrapper.
- Errors are always wrapped with `status: "error"`; you can read `error.message` to display a toast.

*Document last updated: 2025‑11‑21*
