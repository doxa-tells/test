import asyncio, logging, os
from pathlib import Path
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, RPCError

# .env
HERE = Path(__file__).resolve().parent
for cand in (HERE/'.env', HERE.parent/'.env'):
    if cand.exists():
        load_dotenv(cand); print(f"📦 Загрузил .env: {cand}")
        break
else:
    load_dotenv(); print("📦 .env: автопоиск")

# совместимые импорты ошибок под разные версии telethon
try:
    from telethon.errors.rpcerrorlist import (
        PhoneNumberBannedError, PhoneCodeInvalidError, PhoneCodeExpiredError,
        FloodWaitError, PhoneCodeFloodError
    )
except Exception:
    PhoneNumberBannedError = PhoneCodeInvalidError = PhoneCodeExpiredError = None
    FloodWaitError = PhoneCodeFloodError = None

logging.basicConfig(level=logging.INFO)
logging.getLogger("telethon").setLevel(logging.DEBUG)

API_ID   = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
SESSION  = "mirror_session"

async def qr_login():
    print("🧪 QR-логин: Открой Telegram → Настройки → Устройства → Связать устройство")
    try:
        import qrcode
    except Exception:
        print("⚠️ Нет модуля qrcode. Установи: pip install qrcode")
        return False

    client = TelegramClient(SESSION, API_ID, API_HASH)
    await client.connect()  # ВАЖНО: без start()
    try:
        qrobj = await client.qr_login()
        qr = qrcode.QRCode(border=1)
        qr.add_data(qrobj.url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
        print("📷 Сканируй QR. Жду до 3 минут…")
        await qrobj.wait(180)
        print("✅ QR-авторизация успешна")
        print(f"🗂  Сессия: {(HERE / (SESSION+'.session')).resolve()}")
        return True
    finally:
        await client.disconnect()

async def code_login():
    phone = input("📞 Phone (+7706...): ").strip()
    client = TelegramClient(SESSION, API_ID, API_HASH)
    await client.connect()  # ВАЖНО: без start()
    try:
        result = await client.send_code_request(phone, force_sms=False, request_timeout=60)
        code_type = result.type.__class__.__name__
        print(f"➡️  Code sent via: {code_type}  (если SentCodeTypeApp — код в чате «Telegram»)")
        print(f"ℹ️  Debug sent_code: {result}")
        code = input("🔢 Enter the code: ").strip()
        try:
            await client.sign_in(phone=phone, code=code)
            print("✅ Signed in OK")
        except SessionPasswordNeededError:
            pwd = input("🔐 2FA password: ").strip()
            await client.sign_in(password=pwd)
            print("✅ Signed in with 2FA")
        print(f"🗂  Сессия: {(HERE / (SESSION+'.session')).resolve()}")
        return True
    finally:
        await client.disconnect()

async def main():
    mode = input("Войти по коду (1) или через QR (2)? [1/2]: ").strip() or "2"
    try:
        ok = await (qr_login() if mode == "2" else code_login())
        if not ok:
            print("❗ Не удалось авторизоваться.")
    except Exception as e:
        # нормализованный вывод причин
        try:
            from telethon.errors.rpcerrorlist import FloodWaitError as FWE, PhoneCodeInvalidError as PCIE, PhoneCodeExpiredError as PCEE, PhoneNumberBannedError as PNBE, PhoneCodeFloodError as PCFE
        except Exception:
            FWE=PCIE=PCEE=PNBE=PCFE=None
        if PNBE and isinstance(e, PNBE):
            print("🛑 Номер заблокирован Telegram.")
        elif FWE and isinstance(e, FWE):
            print(f"⏳ FloodWait: подожди {e.seconds} сек.")
        elif PCFE and isinstance(e, PCFE):
            print("⏳ Слишком много запросов кода, попробуй позже.")
        elif PCIE and isinstance(e, PCIE):
            print("❌ Неверный код.")
        elif PCEE and isinstance(e, PCEE):
            print("⌛ Код просрочен.")
        elif isinstance(e, RPCError):
            print(f"❌ RPCError: {type(e).__name__}: {e}")
        else:
            print(f"❌ Unexpected: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
