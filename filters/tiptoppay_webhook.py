# tiptoppay_webhook.py
# Запуск: uvicorn tiptoppay_webhook:app --host 0.0.0.0 --port 8000
import os, hmac, hashlib, json, sqlite3
from datetime import datetime
from fastapi import FastAPI, Request, Header
from fastapi.responses import PlainTextResponse

# === НАСТРОЙКИ ===
DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "data", "actors.db"))
TIPTOP_API_PASSWORD = os.getenv("TIPTOP_API_PASSWORD", "")  # Пароль для API: 1dd8...e89
# В ЛК TipTop Pay в вебхуках укажи: https://roletapp.kz/api/tiptoppay/webhook

app = FastAPI(title="TipTopPay Webhook")

# === subs-хелперы (такие же, как в боте) ===
def ensure_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = sqlite3.connect(DB_PATH); cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS subs(
            user_id INTEGER PRIMARY KEY,
            status  TEXT NOT NULL CHECK(status IN ('active','inactive')),
            updated_at TEXT NOT NULL
        )
    """)
    con.commit(); con.close()

def set_sub_status(uid: int, status: str):
    status = "active" if status == "active" else "inactive"
    con = sqlite3.connect(DB_PATH); cur = con.cursor()
    cur.execute(
        "INSERT INTO subs(user_id, status, updated_at) VALUES(?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at",
        (uid, status, datetime.utcnow().isoformat())
    )
    con.commit(); con.close()

# === подпись (проверь заголовок и алгоритм по докам TipTop Pay) ===
def verify_signature(raw_body: bytes, signature_header: str | None) -> bool:
    """
    По докам TipTop Pay подпись обычно HMAC-SHA256 по сырому телу запроса,
    ключ — «Пароль для API». Хедер может называться X-Signature / X-Api-Signature.
    Если другое — поправь ниже имя заголовка/алгоритм.
    """
    if not TIPTOP_API_PASSWORD:
        # если пароль не задан — пропустим в тестовом режиме
        return True
    if not signature_header:
        return False
    digest = hmac.new(TIPTOP_API_PASSWORD.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    # сравнение без учета регистра
    return hmac.compare_digest(digest.lower(), signature_header.strip().lower())

def extract_uid(payload: dict) -> int | None:
    """
    Пытаемся достать Telegram uid, который ты передаёшь в платеж:
    — metadata.tg_uid
    — custom_fields.uid
    — accountId / customerId / order.description (вдруг)
    При необходимости добавь свои пути из доков TipTop Pay.
    """
    # 1) metadata.tg_uid
    try:
        m = payload.get("metadata") or payload.get("data", {}).get("metadata") or {}
        if isinstance(m, dict) and "tg_uid" in m:
            return int(m["tg_uid"])
    except Exception:
        pass
    # 2) custom_fields.uid
    try:
        cf = payload.get("custom_fields") or payload.get("data", {}).get("custom_fields") or {}
        if isinstance(cf, dict) and "uid" in cf:
            return int(cf["uid"])
    except Exception:
        pass
    # 3) accountId / customerId
    for key in ("accountId", "customerId"):
        try:
            v = payload.get(key) or payload.get("data", {}).get(key)
            if v is not None:
                return int(v)
        except Exception:
            pass
    # 4) order.description как "uid:123456"
    try:
        desc = payload.get("order", {}).get("description") or ""
        if isinstance(desc, str) and "uid:" in desc:
            # берем первое вхождение uid:<num>
            import re
            m = re.search(r"uid:(\d+)", desc)
            if m:
                return int(m.group(1))
    except Exception:
        pass
    return None

def map_event_to_status(payload: dict) -> str | None:
    """
    Активируем на успехах/активациях/успешных автосписаниях,
    деактивируем на отменах/ошибках/неуспехе автосписания.
    Названия событий/полей уточни по докам TipTop Pay и при необходимости дополни.
    """
    event = (payload.get("event") or payload.get("type") or "").lower()

    activate_events = {
        "payment.succeeded",
        "invoice.paid",
        "subscription.activated",
        "subscription.charge.succeeded",
        "recurring.charge.succeeded",
    }
    deactivate_events = {
        "payment.failed",
        "subscription.canceled",
        "subscription.cancelled",
        "subscription.charge.failed",
        "recurring.charge.failed",
        "invoice.unpaid",
    }

    if event in activate_events:
        return "active"
    if event in deactivate_events:
        return "inactive"

    # альтернативно — по статусу
    status = (payload.get("status") or payload.get("data", {}).get("status") or "").lower()
    if status in ("succeeded", "paid", "active"):
        return "active"
    if status in ("canceled", "cancelled", "failed", "inactive", "unpaid"):
        return "inactive"

    return None

@app.post("/api/tiptoppay/webhook", response_class=PlainTextResponse)
async def tiptoppay_webhook(request: Request,
                            x_signature: str | None = Header(default=None),
                            x_api_signature: str | None = Header(default=None)):
    ensure_db()

    raw = await request.body()
    sig = x_api_signature or x_signature  # подхватим любой из них

    if not verify_signature(raw, sig):
        return PlainTextResponse("invalid signature", status_code=401)

    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        return PlainTextResponse("bad json", status_code=400)

    uid = extract_uid(payload)
    if uid is None:
        # Приняли, но логируем — не смогли сопоставить юзера
        # (лучше заведи файл/логгер — тут для краткости просто 200)
        return PlainTextResponse("ok (no uid)", status_code=200)

    status = map_event_to_status(payload)
    if status is None:
        # тихо подтверждаем (не блокируем ретраи), но без изменения статуса
        return PlainTextResponse("ok (ignored event)", status_code=200)

    set_sub_status(uid, status)
    return PlainTextResponse("ok", status_code=200)