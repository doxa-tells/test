# tiptoppay_webhook.py
# Запуск: uvicorn tiptoppay_webhook:app --host 0.0.0.0 --port 8000

import os, hmac, hashlib, base64, json, sqlite3
from datetime import datetime
from fastapi import FastAPI, Request, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

WEBAPP_SIGNING_SECRET = os.getenv("WEBAPP_SIGNING_SECRET", "")  # тот же секрет, что и у бота
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://roletapp.kz,http://localhost:5173").split(",")

# === Настройки ===
DB_PATH = os.getenv(
    "DB_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "actors.db"))
)
TIPTOP_API_PASSWORD = os.getenv("TIPTOP_API_PASSWORD", "")
# Делать ли подпись обязательной. По умолчанию ВЫКЛ (совместимость с TipTopPay кабинетами без заголовка подписи)
TIPTOP_SIGNATURE_REQUIRED = os.getenv("TIPTOP_SIGNATURE_REQUIRED", "0").lower() in ("1","true","yes","on")

app = FastAPI(title="TipTopPay Webhook")

# CORS для фронта, который дергает /api/sign
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_methods=["GET","POST","OPTIONS"],
    allow_headers=["*"],
)

# === БД ===
def ensure_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS subs(
            user_id    INTEGER PRIMARY KEY,
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

# === Подпись TipTop Pay: HMAC-SHA256(raw) -> base64, заголовок X-Content-HMAC ===
def _hmac_base64(secret: str, data: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), data, hashlib.sha256).digest()
    return base64.b64encode(digest).decode("ascii")

def _raw_string_for_get(request: Request) -> bytes:
    # Для GET подписывается path[?query]
    path = request.url.path
    qs = request.url.query
    s = f"{path}?{qs}" if qs else path
    return s.encode("utf-8")

def signatures_equal(a: str | None, b: str | None) -> bool:
    if not a or not b:
        return False
    a = a.strip().strip('"').strip("'")
    b = b.strip().strip('"').strip("'")
    return hmac.compare_digest(a, b)

async def verify_signature(request: Request, x_content_hmac: str | None, content_hmac: str | None) -> bool:
    if not TIPTOP_API_PASSWORD:
        return True  # dev режим
    provided = x_content_hmac or content_hmac
    # Если подпись не обязательна и её нет — пропускаем
    if not provided and not TIPTOP_SIGNATURE_REQUIRED:
        return True
    if request.method.upper() == "GET":
        expected = _hmac_base64(TIPTOP_API_PASSWORD, _raw_string_for_get(request))
    else:
        raw = await request.body()
        expected = _hmac_base64(TIPTOP_API_PASSWORD, raw)
    return signatures_equal(provided, expected)

# === Извлечение AccountId (только numeric TG-id) ===
def extract_uid(payload: dict) -> str | None:
    # Рекомендовано: AccountId / accountId
    for k in ("AccountId", "accountId"):
        v = payload.get(k)
        if v is not None:
            s = str(v)
            return s if s.isdigit() else None

    # Дополнительно — metadata.* (если передаётся)
    md = payload.get("metadata") or {}
    if isinstance(md, dict):
        for k in ("uid", "user_id", "accountId", "tg_uid"):
            v = md.get(k)
            if v is not None:
                s = str(v)
                return s if s.isdigit() else None

    # Описание вида "uid:123456"
    desc = payload.get("Description") or payload.get("description") or ""
    if isinstance(desc, str) and "uid:" in desc:
        import re
        m = re.search(r"uid:(\d+)", desc)
        if m:
            return m.group(1)

    return None

# === Нормализация типа уведомления -> статус подписки ===
def map_payload_to_status_and_type(payload: dict) -> tuple[str | None, str | None]:
    """
    Возвращает (new_status, notif_type)
    notif_type ∈ {"Pay","Recurrent","Fail","Cancel","Refund","Confirm", None}
    """
    notif_type = (payload.get("Type") or payload.get("NotificationType") or "").strip() or None

    # Recurrent: периодические списания со статусом подписки
    if ("Interval" in payload or "Period" in payload) or (notif_type == "Recurrent"):
        status = (payload.get("Status") or "").strip().lower()
        if status == "active":
            return "active", "Recurrent"
        if status in {"canceled", "cancelled", "deactivated", "inactive", "suspended"}:
            return "inactive", "Recurrent"
        return None, "Recurrent"

    # Первичная успешная оплата / подтверждение
    if notif_type in {"Pay", "Confirm"} or "CardToken" in payload:
        return "active", notif_type or "Pay"

    # Ошибки/отмена/возврат — выключаем
    if notif_type in {"Fail", "Cancel", "Refund"}:
        return "inactive", notif_type

    return None, None

# === Подпись deep-link для мини-аппы ===
def make_webapp_sig(uid: str, ts: str) -> str:
    if not WEBAPP_SIGNING_SECRET:
        return ""  # dev-режим
    msg = f"{uid}:{ts}".encode("utf-8")
    return hmac.new(WEBAPP_SIGNING_SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()

# === TipTopPay API клиент ===
# Конфиг из окружения
TIPTOP_API_BASE = os.getenv("TIPTOP_API_BASE", "https://api.tiptoppay.kz").rstrip("/")
TIPTOP_API_LOGIN = os.getenv("TIPTOP_API_LOGIN", "")
TIPTOP_API_AUTH_SCHEME = os.getenv("TIPTOP_API_AUTH_SCHEME", "password").lower()  # password|basic|bearer
TIPTOP_API_BEARER = os.getenv("TIPTOP_API_BEARER", "")

# Ленивая импорт-инициализация httpx
_httpx = None

def _get_httpx():
    global _httpx
    if _httpx is None:
        import httpx  # импортим только при использовании
        _httpx = httpx
    return _httpx

def _build_headers() -> dict:
    headers = {"Content-Type": "application/json"}
    # Разные варианты авторизации — настраиваются через env
    if TIPTOP_API_AUTH_SCHEME == "basic" and TIPTOP_API_LOGIN and TIPTOP_API_PASSWORD:
        # httpx сам выставит заголовок Authorization для auth=(user, pass)
        pass
    elif TIPTOP_API_AUTH_SCHEME == "bearer" and TIPTOP_API_BEARER:
        headers["Authorization"] = f"Bearer {TIPTOP_API_BEARER}"
    elif TIPTOP_API_PASSWORD:
        # Часто TipTopPay принимает пароль терминала через X-API-Password или аналог
        headers["X-API-Password"] = TIPTOP_API_PASSWORD
    return headers

async def _ttp_post(path: str, payload: dict) -> tuple[int, dict]:
    httpx = _get_httpx()
    url = f"{TIPTOP_API_BASE}{path}"
    headers = _build_headers()
    auth = None
    if TIPTOP_API_AUTH_SCHEME == "basic" and TIPTOP_API_LOGIN and TIPTOP_API_PASSWORD:
        auth = (TIPTOP_API_LOGIN, TIPTOP_API_PASSWORD)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload, headers=headers, auth=auth)
            data = {}
            try:
                data = r.json()
            except Exception:
                data = {"raw": r.text}
            return r.status_code, data
    except Exception as e:
        return 0, {"success": False, "message": str(e)}

# === Endpoints ===
@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.get("/api/sign")
async def sign(uid: str):
    # подписываем только telegram-id (числа)
    if not uid.isdigit():
        return JSONResponse({"error": "uid must be numeric"}, status_code=400)
    ts = str(int(datetime.utcnow().timestamp()))
    sig = make_webapp_sig(uid, ts)
    return {"ts": ts, "sig": sig}

# === Proxy TipTopPay: Subscriptions ===
@app.post("/api/tiptoppay/subscriptions/create")
async def ttp_subscriptions_create(request: Request):
    body = await request.json()
    code, data = await _ttp_post("/subscriptions/create", body)
    return JSONResponse(data, status_code=(code or 502))

@app.post("/api/tiptoppay/subscriptions/get")
async def ttp_subscriptions_get(request: Request):
    body = await request.json()
    code, data = await _ttp_post("/subscriptions/get", body)
    return JSONResponse(data, status_code=(code or 502))

@app.post("/api/tiptoppay/subscriptions/find")
async def ttp_subscriptions_find(request: Request):
    body = await request.json()
    code, data = await _ttp_post("/subscriptions/find", body)
    return JSONResponse(data, status_code=(code or 502))

@app.post("/api/tiptoppay/subscriptions/update")
async def ttp_subscriptions_update(request: Request):
    body = await request.json()
    code, data = await _ttp_post("/subscriptions/update", body)
    return JSONResponse(data, status_code=(code or 502))

@app.post("/api/tiptoppay/subscriptions/cancel")
async def ttp_subscriptions_cancel(request: Request):
    body = await request.json()
    code, data = await _ttp_post("/subscriptions/cancel", body)
    return JSONResponse(data, status_code=(code or 502))

# === Proxy TipTopPay: Orders ===
@app.post("/api/tiptoppay/orders/create")
async def ttp_orders_create(request: Request):
    body = await request.json()
    code, data = await _ttp_post("/orders/create", body)
    return JSONResponse(data, status_code=(code or 502))

@app.post("/api/tiptoppay/orders/cancel")
async def ttp_orders_cancel(request: Request):
    body = await request.json()
    code, data = await _ttp_post("/orders/cancel", body)
    return JSONResponse(data, status_code=(code or 502))

@app.api_route("/api/tiptoppay/webhook", methods=["GET", "POST"])
async def tiptoppay_webhook(
    request: Request,
    # Явно принимаем оба варианта заголовка
    x_content_hmac: str | None = Header(default=None, alias="X-Content-HMAC"),
    content_hmac: str | None = Header(default=None, alias="Content-HMAC"),
):
    ensure_db()

    # 1) Проверка подписи
    ok = await verify_signature(request, x_content_hmac, content_hmac)
    if not ok:
        return JSONResponse({"code": 403, "message": "invalid signature"}, status_code=403)

    # 2) Разбор payload: GET -> query, POST -> json|form
    if request.method.upper() == "GET":
        payload = dict(request.query_params)
    else:
        ctype = (request.headers.get("content-type") or "").lower()
        if "application/json" in ctype:
            try:
                payload = await request.json()
            except Exception:
                payload = {}
            if not isinstance(payload, dict):
                payload = {}
        else:
            form = await request.form()
            payload = {k: v for k, v in form.items()}

    # 3) UID
    uid = extract_uid(payload)

    # 4) Тип уведомления -> статус
    new_status, notif_type = map_payload_to_status_and_type(payload)

    # 5) Обновление БД
    if uid and new_status:
        try:
            set_sub_status(uid, new_status)
        except Exception:
            return JSONResponse({"code": 500, "message": "db error"}, status_code=500)

    # 6) Успешный ответ
    return JSONResponse({"code": 0})