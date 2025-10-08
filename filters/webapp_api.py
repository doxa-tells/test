# -*- coding: utf-8 -*-
from typing import Optional
import time, hmac, hashlib, base64
from urllib.parse import urlencode

def _b64url(s: str) -> str:
    b = s.encode("utf-8")
    return base64.urlsafe_b64encode(b).decode("ascii").rstrip("=")

def _sign(uid: int, ts: str, secret: Optional[str]) -> Optional[str]:
    if not secret:
        return None
    msg = f"{uid}:{ts}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

def build_apply_webapp_url(
    base_url: str,
    *,
    uid: int,
    to: str,
    subject: str,
    body_text: str,
    signing_secret: Optional[str] = None,
) -> str:
    """
    Сборка URL для мини-аппы /apply с подписью (совместимо с Python 3.8+).
    body_text кодируется в base64url (без '=').
    """
    ts = str(int(time.time()))
    q = {
        "to": to,
        "subject": subject or "",
        "body": _b64url(body_text or ""),
        "uid": str(uid),
        "ts": ts,
    }
    sig = _sign(uid, ts, signing_secret)
    if sig:
        q["sig"] = sig
    sep = "&" if ("?" in base_url) else "?"
    return base_url + sep + urlencode(q)