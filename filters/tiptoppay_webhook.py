# tiptoppay_webhook.py
# Запуск: uvicorn tiptoppay_webhook:app --host 0.0.0.0 --port 8000

import os, hmac, hashlib, base64, json, psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

WEBAPP_SIGNING_SECRET = os.getenv("WEBAPP_SIGNING_SECRET", "")  # тот же секрет, что и у бота
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://roletapp.kz,http://localhost:5173").split(",")

# === Настройки ===
TIPTOP_API_PASSWORD = os.getenv("TIPTOP_API_PASSWORD", "")
# Делать ли подпись обязательной. По умолчанию ВЫКЛ (совместимость с TipTopPay кабинетами без заголовка подписи)
TIPTOP_SIGNATURE_REQUIRED = os.getenv("TIPTOP_SIGNATURE_REQUIRED", "0").lower() in ("1","true","yes","on")

# === Параметры подписки по умолчанию (для авто-создания при Pay/Confirm с токеном) ===
SUB_AMOUNT = float(os.getenv("TIPTOP_SUB_AMOUNT", "3490"))
SUB_CURRENCY = os.getenv("TIPTOP_SUB_CURRENCY", "KZT")
SUB_INTERVAL = os.getenv("TIPTOP_SUB_INTERVAL", "Month")  # Day|Week|Month
SUB_PERIOD = int(os.getenv("TIPTOP_SUB_PERIOD", "1"))
SUB_REQUIRE_CONFIRMATION = os.getenv("TIPTOP_SUB_REQUIRE_CONFIRMATION", "0").lower() in ("1","true","yes","on")
SUB_START_OFFSET_DAYS = int(os.getenv("TIPTOP_SUB_START_OFFSET_DAYS", "30"))  # через сколько дней начать рекуррент

app = FastAPI(title="TipTopPay Webhook")

# CORS для фронта, который дергает /api/sign
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_methods=["GET","POST","OPTIONS"],
    allow_headers=["*"],
)

# === DB Connection ===
def _db_connect():
    return psycopg2.connect(
        dbname=os.getenv("PG_DB"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        host=os.getenv("PG_HOST"),
        port=os.getenv("PG_PORT")
    )

def ensure_db():
    con = _db_connect()
    with con.cursor() as cur:
        # base table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS subs(
                user_id    BIGINT PRIMARY KEY,
                status     TEXT NOT NULL CHECK(status IN ('active','inactive')),
                updated_at TIMESTAMPTZ NOT NULL
            )
            """
        )
        # extend for plan/valid_until if not exists (idempotent)
        cur.execute("ALTER TABLE subs ADD COLUMN IF NOT EXISTS plan TEXT")
        cur.execute("ALTER TABLE subs ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ")
    con.commit()
    con.close()

def set_sub_status(uid: str, status: str):
    """Backward-compat helper: updates only status/updated_at."""
    status = "active" if status == "active" else "inactive"
    con = _db_connect()
    with con.cursor() as cur:
        cur.execute(
            """
            INSERT INTO subs(user_id, status, updated_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;
            """,
            (uid, status, datetime.utcnow())
        )
    con.commit(); con.close()

def upsert_sub(uid: str, *, status: str, plan: str | None, valid_until):
    """Upsert with plan and valid_until if provided."""
    status = "active" if status == "active" else "inactive"
    con = _db_connect()
    with con.cursor() as cur:
        if plan is None and valid_until is None:
            cur.execute(
                """
                INSERT INTO subs(user_id, status, updated_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id)
                DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;
                """,
                (uid, status, datetime.utcnow()),
            )
        else:
            cur.execute(
                """
                INSERT INTO subs(user_id, status, plan, valid_until, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id)
                DO UPDATE SET status = EXCLUDED.status,
                              plan = COALESCE(EXCLUDED.plan, subs.plan),
                              valid_until = COALESCE(EXCLUDED.valid_until, subs.valid_until),
                              updated_at = EXCLUDED.updated_at;
                """,
                (uid, status, plan, valid_until, datetime.utcnow()),
            )
    con.commit(); con.close()

def _extract_plan(payload: dict) -> str | None:
    """Try to detect plan from payload/metadata/description: returns 'premium'|'basic'|None"""
    # metadata.plan
    md = payload.get("metadata") or {}
    if isinstance(md, dict):
        plan = (md.get("plan") or md.get("tariff") or "").strip().lower()
        if plan in ("premium", "basic"):
            return plan
    # direct fields
    for k in ("Plan", "plan", "Tariff", "tariff"):
        v = (payload.get(k) or "").strip().lower()
        if v in ("premium", "basic"):
            return v
    # product/description text search
    for k in ("Product", "ProductName", "Description", "description"):
        v = (payload.get(k) or "").strip().lower()
        if not v:
            continue
        if "premium" in v or "премиум" in v:
            return "premium"
        if "basic" in v or "базов" in v:
            return "basic"
    return None

def _compute_valid_until(payload: dict) -> datetime | None:
    """Compute next validity. Prefer interval/period; else default 30 days."""
    try:
        interval = (payload.get("interval") or payload.get("Interval") or SUB_INTERVAL).lower()
        period = int(payload.get("period") or payload.get("Period") or SUB_PERIOD)
        now = datetime.utcnow()
        if interval.startswith("day"):
            return now + timedelta(days=period)
        if interval.startswith("week"):
            return now + timedelta(weeks=period)
        # Month default
        return now + timedelta(days=30 * period)
    except Exception:
        return datetime.utcnow() + timedelta(days=30)

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
    # Если проверка подписи не обязательна — пропускаем всегда
    if not TIPTOP_SIGNATURE_REQUIRED:
        return True
    # dev-режим: если нет пароля — пропускаем
    if not TIPTOP_API_PASSWORD:
        return True
    provided = x_content_hmac or content_hmac
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
    op_type = (payload.get("OperationType") or payload.get("operationType") or "").strip() or None
    status_raw = (payload.get("Status") or payload.get("status") or "").strip()

    # Recurrent: периодические списания со статусом подписки
    if ("Interval" in payload or "Period" in payload) or (notif_type == "Recurrent"):
        status = status_raw.lower()
        if status == "active":
            return "active", "Recurrent"
        if status in {"canceled", "cancelled", "deactivated", "inactive", "suspended"}:
            return "inactive", "Recurrent"
        return None, "Recurrent"

    # Первичная успешная оплата / подтверждение
    if notif_type in {"Pay", "Confirm"} or "CardToken" in payload:
        return "active", notif_type or "Pay"

    # Доп. обработка: OperationType от TipTopPay (инвойсы/платежи без Type)
    if op_type:
        op = op_type.lower()
        # Успешные операции оплаты
        if op in {"payment", "purchase", "charge", "debit", "invoicepaid", "invoice_paid", "confirm"}:
            return "active", "Pay"
        # Возможные неуспешные/возврат/отмена
        if op in {"refund", "cancel", "fail", "failed", "void"}:
            return "inactive", "Cancel"

    # Если пришёл AccountId и TransactionId/PaymentAmount — считаем успешным платежом (эвристика для их уведомлений)
    if payload.get("AccountId") or payload.get("accountId"):
        if ("TransactionId" in payload or "PaymentAmount" in payload or "PaymentCurrency" in payload):
            return "active", "Pay"

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
    # Если успешное создание и есть accountId — сразу отметим локально active
    try:
        if code == 200 and isinstance(data, dict) and (data.get("Success") is True or data.get("success") is True):
            uid = str(body.get("accountId") or body.get("AccountId") or "").strip()
            if uid.isdigit():
                ensure_db()
                plan = (body.get("plan") or body.get("Plan") or "").strip().lower() or _extract_plan(body) or "basic"
                valid_until = _compute_valid_until(body)
                upsert_sub(uid, status="active", plan=plan, valid_until=valid_until)
    except Exception:
        pass
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
    # Если отмена успешна и удалось узнать accountId через get — отметим локально inactive
    try:
        if code == 200 and isinstance(data, dict) and (data.get("Success") is True or data.get("success") is True):
            # Попробуем получить accountId через get
            sub_id = (body.get("Id") or body.get("id") or "").strip()
            if sub_id:
                code_get, data_get = await _ttp_post("/subscriptions/get", {"Id": sub_id})
                model = (isinstance(data_get, dict) and (data_get.get("Model") or data_get.get("model"))) or {}
                uid = str((model or {}).get("AccountId") or "").strip()
                if uid.isdigit():
                    ensure_db()
                    upsert_sub(uid, status="inactive", plan=None, valid_until=None)
    except Exception:
        pass
    return JSONResponse(data, status_code=(code or 502))

@app.post("/api/tiptoppay/subscriptions/cancel-by-account")
async def ttp_subscriptions_cancel_by_account(request: Request):
    body = await request.json()
    account_id = (body.get("accountId") or body.get("AccountId") or "").strip()
    prefer_active = bool(body.get("preferActive", True))
    if not account_id:
        return JSONResponse({"Success": False, "Message": "accountId is required"}, status_code=400)
    # 1) find
    code_find, data_find = await _ttp_post("/subscriptions/find", {"accountId": account_id})
    if code_find != 200 or not isinstance(data_find, dict):
        return JSONResponse({"Success": False, "Message": "find failed", "details": data_find}, status_code=code_find or 502)
    items = data_find.get("Model") or data_find.get("model") or []
    if not items:
        return JSONResponse({"Success": False, "Message": "no subscriptions found for accountId"}, status_code=404)
    # pick target
    target = None
    if prefer_active:
        for it in items:
            st = (it.get("Status") or it.get("status") or "").strip()
            if st.lower() == "active":
                target = it
                break
    if not target:
        target = items[0]
    sub_id = (target.get("Id") or target.get("id") or "").strip()
    if not sub_id:
        return JSONResponse({"Success": False, "Message": "subscription Id not found"}, status_code=500)
    # 2) cancel
    code_cancel, data_cancel = await _ttp_post("/subscriptions/cancel", {"Id": sub_id})
    # Если успешно отменили — синхронизируем локальную БД, чтобы бот сразу потерял доступ
    try:
        if code_cancel == 200 and isinstance(data_cancel, dict) and (data_cancel.get("Success") is True or data_cancel.get("success") is True):
            ensure_db()
            set_sub_status(account_id, "inactive")
    except Exception:
        pass
    return JSONResponse(data_cancel, status_code=(code_cancel or 502))

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

    # Диагностика
    try:
        print("[tiptoppay_webhook] incoming:", {
            "method": request.method,
            "has_json": isinstance(payload, dict),
            "keys": list(payload.keys())[:10],
            "notif_type": notif_type,
            "operation_type": (payload.get("OperationType") or payload.get("operationType")),
            "uid": uid,
            "new_status": new_status,
        })
    except Exception:
        pass

    # 5) Обновление БД
    if uid and new_status:
        try:
            plan = _extract_plan(payload)
            valid_until = _compute_valid_until(payload) if new_status == "active" else None
            upsert_sub(uid, status=new_status, plan=plan, valid_until=valid_until)
            try:
                print(f"[tiptoppay_webhook] upsert_sub uid={uid} -> status={new_status}, plan={plan}, valid_until={valid_until}")
            except Exception:
                pass
        except Exception as e:
            try:
                print(f"[tiptoppay_webhook] DB error: {e}")
            except Exception:
                pass
            return JSONResponse({"code": 500, "message": "db error"}, status_code=500)

    # 5.1) Автосоздание подписки при первичной оплате, если пришёл карточный токен
    try:
        token = (
            payload.get("CardToken") or payload.get("cardToken") or payload.get("token")
            or (payload.get("data") or {}).get("CardToken")
        )
        if token and uid:
            # Собираем параметры подписки по умолчанию
            start_dt = datetime.utcnow() + timedelta(days=SUB_START_OFFSET_DAYS)
            start_iso = start_dt.replace(microsecond=0).isoformat()
            sub_payload = {
                "token": str(token),
                "accountId": str(uid),
                "description": "Ежемесячная подписка на Roletapp AI",
                "amount": SUB_AMOUNT,
                "Currency": SUB_CURRENCY,
                "requireConfirmation": SUB_REQUIRE_CONFIRMATION,
                "startDate": start_iso,
                "interval": SUB_INTERVAL,
                "period": SUB_PERIOD,
            }
            # Пробуем создать рекуррент (ошибку не пробрасываем в ответ вебхука)
            await _ttp_post("/subscriptions/create", sub_payload)
            # и пометим локально active (без изменения плана)
            try:
                ensure_db(); upsert_sub(str(uid), status="active", plan=None, valid_until=_compute_valid_until(sub_payload))
            except Exception:
                pass
    except Exception:
        pass

    # 6) Успешный ответ
    return JSONResponse({"code": 0})