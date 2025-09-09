# tiptoppay_webhook.py
# Запуск (пример): /opt/casting_mirror_bot/.venv/bin/uvicorn tiptoppay_webhook:app --host 0.0.0.0 --port 8000 --reload

import os, hmac, hashlib, json, sqlite3
from datetime import datetime
from fastapi import FastAPI, Request, Header
from fastapi.responses import PlainTextResponse

# === НАСТРОЙКИ ===
# По умолчанию кладём БД в /opt/casting_mirror_bot/data/actors.db (относительно этого файла: ../data/actors.db)
DB_PATH = os.getenv(
    "DB_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "actors.db"))
)
TIPTOP_API_PASSWORD = os.getenv("TIPTOP_API_PASSWORD", "")  # Пароль для API из ЛК TipTop Pay

app = FastAPI(title="TipTopPay Webhook")

# === helpers: таблица subs и апсерт статуса ===
def ensure_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS subs(
            user_id   INTEGER PRIMARY KEY,
            status    TEXT NOT NULL CHECK(status IN ('active','inactive')),
            updated_at TEXT NOT NULL
        )
    """)
    con.commit()
    con.close()

def set_sub_status(uid: int, status: str):
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

# === валидация подписи (при включённом TIPTOP_API_PASSWORD) ===
def verify_signature(raw_body: bytes, signature_header: str | None) -> bool:
    """
    По докам TipTop Pay подпись обычно HMAC-SHA256 по сыроему телу запроса,
    ключ — «Пароль для API». Имя заголовка может отличаться, мы принимаем несколько вариантов.
    Если TIPTOP_API_PASSWORD не задан — пропускаем (dev-режим).
    """
    if not TIPTOP_API_PASSWORD:
        return True  # dev / без подписи
    if not signature_header:
        return False
    digest = hmac.new(TIPTOP_API_PASSWORD.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest.lower(), signature_header.strip().lower())

# === извлечение uid из полезной нагрузки ===
def _try_int(v):
    try:
        return int(v)
    except Exception:
        return None

def extract_uid(payload: dict) -> int | None:
    """
    Пробуем все типовые места:
    - userInfo.accountId (и внутри data.userInfo.accountId)
    - metadata: uid / user_id / accountId (на верхнем уровне, в data, в order/payment/subscription.*.metadata)
    - custom_fields.uid
    - accountId / customerId на верхнем уровне
    - order.description: "uid:123456"
    """
    # 0) userInfo.accountId (основной вариант из мини-аппы)
    v = (
        payload.get("userInfo", {}).get("accountId")
        or payload.get("data", {}).get("userInfo", {}).get("accountId")
    )
    uid = _try_int(v)
    if uid is not None:
        return uid

    # 1) metadata.*
    for root_key in (None, "data", "order", "payment", "subscription", "recurrent"):
        node = payload if root_key is None else payload.get(root_key, {})
        md = node.get("metadata") if isinstance(node, dict) else {}
        if isinstance(md, dict):
            for k in ("uid", "user_id", "accountId", "tg_uid"):
                uid = _try_int(md.get(k))
                if uid is not None:
                    return uid

    # 2) custom_fields.uid
    cf = payload.get("custom_fields") or payload.get("data", {}).get("custom_fields")
    if isinstance(cf, dict):
        uid = _try_int(cf.get("uid"))
        if uid is not None:
            return uid

    # 3) accountId / customerId на верхнем уровне или в data
    for key in ("accountId", "customerId"):
        uid = _try_int(payload.get(key) or payload.get("data", {}).get(key))
        if uid is not None:
            return uid

    # 4) order.description как "uid:123456"
    try:
        desc = payload.get("order", {}).get("description") or ""
        if isinstance(desc, str) and "uid:" in desc:
            import re
            m = re.search(r"uid:(\d+)", desc)
            if m:
                return int(m.group(1))
    except Exception:
        pass

    return None

# === нормализация события -> статус подписки ===
def map_event_to_status(payload: dict) -> str | None:
    """
    Активируем при успешных оплатах/активациях/продлениях,
    деактивируем при отменах/ошибках.
    """
    event = (payload.get("event") or payload.get("type") or "").lower()
    status = (payload.get("status") or payload.get("data", {}).get("status") or "").lower()

    activate_events = {
        "payment.succeeded",
        "invoice.paid",
        "subscription.activated",
        "subscription.renewed",
        "subscription.charge.succeeded",
        "recurring.charge.succeeded",
    }
    deactivate_events = {
        "payment.failed",
        "subscription.canceled",
        "subscription.cancelled",
        "subscription.deactivated",
        "subscription.charge.failed",
        "recurring.charge.failed",
        "invoice.unpaid",
        "payment.refunded",
        "payment.reversed",
    }

    if event in activate_events:
        return "active"
    if event in deactivate_events:
        return "inactive"

    if status in {"succeeded", "paid", "success", "approved", "active"}:
        return "active"
    if status in {"failed", "declined", "canceled", "cancelled", "inactive", "unpaid", "reversed"}:
        return "inactive"

    return None

# === endpoints ===
@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/api/tiptoppay/webhook", response_class=PlainTextResponse)
async def tiptoppay_webhook(
    request: Request,
    x_signature: str | None = Header(default=None),
    x_api_signature: str | None = Header(default=None),
    x_content_signature: str | None = Header(default=None),
):
    ensure_db()

    raw = await request.body()
    # принимаем несколько возможных имён заголовка подписи
    sig = x_api_signature or x_signature or x_content_signature
    if not verify_signature(raw, sig):
        return PlainTextResponse("invalid signature", status_code=401)

    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        return PlainTextResponse("bad json", status_code=400)

    uid = extract_uid(payload)
    if uid is None:
        # Приняли, чтобы провайдер не ретраил бесконечно, но логически ничего не делаем
        return PlainTextResponse("ok (no uid)", status_code=200)

    new_status = map_event_to_status(payload)
    if new_status is None:
        return PlainTextResponse("ok (ignored event)", status_code=200)

    try:
        set_sub_status(uid, new_status)
    except Exception:
        return PlainTextResponse("db error", status_code=500)

    return PlainTextResponse("ok", status_code=200)