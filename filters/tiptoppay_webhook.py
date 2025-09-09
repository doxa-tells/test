# tiptoppay_webhook.py

import os, hmac, hashlib, base64, json, sqlite3
from datetime import datetime
from fastapi import FastAPI, Request, Header
from fastapi.responses import JSONResponse

DB_PATH = os.getenv(
    "DB_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "actors.db"))
)
TIPTOP_API_PASSWORD = os.getenv("TIPTOP_API_PASSWORD", "")

app = FastAPI(title="TipTopPay Webhook")

def ensure_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS subs(
            user_id    TEXT PRIMARY KEY,
            status     TEXT NOT NULL CHECK(status IN ('active','inactive')),
            updated_at TEXT NOT NULL
        )
    """)
    con.commit()
    con.close()

def set_sub_status(uid: str, status: str):
    status = "active" if status == "active" else "inactive"
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute(
        "INSERT INTO subs(user_id, status, updated_at) VALUES(?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at",
        (uid, status, datetime.utcnow().isoformat())
    )
    con.commit()
    con.close()

def _hmac_base64(secret: str, data: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), data, hashlib.sha256).digest()
    return base64.b64encode(digest).decode("ascii")

def _raw_string_for_get(request: Request) -> bytes:
    # Для GET по докам подписывается путь + '?' + query
    path = request.url.path
    qs = request.url.query
    s = f"{path}?{qs}" if qs else path
    return s.encode("utf-8")

def signatures_equal(a: str | None, b: str | None) -> bool:
    if not a or not b:
        return False
    # сравниваем без пробелов/кавычек, регистр неважен
    a = a.strip().strip('"').strip("'")
    b = b.strip().strip('"').strip("'")
    return hmac.compare_digest(a, b)

async def verify_signature(request: Request, x_content_hmac: str | None, content_hmac: str | None) -> bool:
    if not TIPTOP_API_PASSWORD:
        return True  # dev режим
    expected = None
    if request.method.upper() == "GET":
        expected = _hmac_base64(TIPTOP_API_PASSWORD, _raw_string_for_get(request))
    else:
        raw = await request.body()
        expected = _hmac_base64(TIPTOP_API_PASSWORD, raw)
    provided = x_content_hmac or content_hmac
    return signatures_equal(provided, expected)

def _try_int(v):
    try:
        return int(str(v))
    except Exception:
        return None

def extract_uid(payload: dict) -> str | None:
    # 1) Прямо из уведомлений (рекомендовано доками): AccountId (заглавная A)
    for k in ("AccountId", "accountId"):
        v = payload.get(k)
        if v is not None:
            return str(v)

    # 2) На всякий случай — metadata.* (если вы так передаёте)
    md = payload.get("metadata") or {}
    if isinstance(md, dict):
        for k in ("uid", "user_id", "accountId", "tg_uid"):
            v = md.get(k)
            if v is not None:
                return str(v)

    # 3) Описание вида "uid:123456"
    desc = payload.get("Description") or payload.get("description") or ""
    if isinstance(desc, str) and "uid:" in desc:
        import re
        m = re.search(r"uid:(\d+)", desc)
        if m:
            return m.group(1)

    return None

def map_payload_to_status_and_type(payload: dict) -> tuple[str | None, str | None]:
    """
    Возвращает (new_status, notif_type)
    notif_type ∈ {"Pay","Recurrent","Fail","Cancel","Refund","Confirm", None}
    """
    # Явная метка типа (если передаёте её сами в ЛК или query)
    notif_type = (payload.get("Type") or payload.get("NotificationType") or "").strip() or None

    # Эвристики по структуре (док: Recurrent содержит период/интервал/статус)
    if ("Interval" in payload or "Period" in payload) or notif_type == "Recurrent":
        status = (payload.get("Status") or "").lower()
        return ("active" if status == "active" else "inactive"), "Recurrent"

    # Pay/Confirm/Fail/Cancel/Refund различайте по настройке ЛК; по умолчанию GET на разные URL
    # Если пришло Pay (первая успешная оплата) — активируем
    if notif_type in {"Pay", "Confirm"} or "CardToken" in payload:
        return "active", notif_type or "Pay"

    if notif_type in {"Fail", "Cancel", "Refund"}:
        return "inactive", notif_type

    # Если не смогли определить — не меняем
    return None, None

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.api_route("/api/tiptoppay/webhook", methods=["GET", "POST"])
async def tiptoppay_webhook(
    request: Request,
    x_content_hmac: str | None = Header(default=None),   # X-Content-HMAC
    content_hmac: str | None = Header(default=None),     # Content-HMAC
):
    ensure_db()

    # 1) Проверка подписи (Base64 HMAC-SHA256)
    ok = await verify_signature(request, x_content_hmac, content_hmac)
    if not ok:
        return JSONResponse({"code": 403, "message": "invalid signature"}, status_code=403)

    # 2) Разбор payload: GET — query, POST — form/json
    if request.method.upper() == "GET":
        payload = dict(request.query_params)
    else:
        ctype = (request.headers.get("content-type") or "").lower()
        if "application/json" in ctype:
            payload = await request.json()
            if not isinstance(payload, dict):
                payload = {}
        else:
            form = await request.form()
            payload = {k: v for k, v in form.items()}

    # 3) Извлекаем uid (AccountId и др.)
    uid = extract_uid(payload)

    # 4) Определяем тип уведомления и новый статус
    new_status, notif_type = map_payload_to_status_and_type(payload)

    # 5) Если всё есть — апдейтим
    if uid and new_status:
        try:
            set_sub_status(uid, new_status)
        except Exception:
            return JSONResponse({"code": 500, "message": "db error"}, status_code=500)

    # 6) Всегда отвечаем {"code":0} при успешной обработке (по докам)
    return JSONResponse({"code": 0})