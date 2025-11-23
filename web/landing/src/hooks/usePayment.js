import { useEffect, useCallback } from 'react';

const WEBAPP_URL = "https://roletapp.kz/";
const TIPTOP_PUBLIC_ID = "pk_0f01d7d3f4ae6e22af386a501024d";
const TIPTOP_SITE_ID = "8192011";
const CURRENCY = "KZT";
const AMOUNT_TRIAL = 30;
const AMOUNT_MONTHLY_PRO = 3490;
const AMOUNT_MONTHLY_PREMIUM = 4490;

const API_SIGN = "/api/sign";
const API_SUB_CREATE = "/api/tiptoppay/subscriptions/create";
const API_SUB_CANCEL = "/api/tiptoppay/subscriptions/cancel";
const API_SUB_FIND = "/api/tiptoppay/subscriptions/find";
const API_SUB_CANCEL_BY_ACCOUNT = "/api/tiptoppay/subscriptions/cancel-by-account";

export const usePayment = () => {
    useEffect(() => {
        // Telegram Mini App readiness
        try { window.Telegram?.WebApp?.ready?.(); } catch (e) { }
    }, []);

    const readUidFromTgWebApp = () => {
        try {
            const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            if (id && /^\d+$/.test(String(id))) return String(id);
            return null;
        } catch (e) { return null; }
    };

    const startSubscription = useCallback(async (plan = "pro", categories = []) => {
        if (!window.tiptop || typeof window.tiptop.Widget !== "function") {
            console.error("TipTopPay: widget factory not found.");
            alert("Платёжный виджет не загрузился. Отключите блокировщики и обновите страницу.");
            return;
        }

        const uid = readUidFromTgWebApp();
        if (!uid) {
            alert("Откройте страницу из Telegram Mini App. Зайдите в наш бот и откройте веб-приложение.");
            return;
        }

        let ts = "", sig = "";
        try {
            const r = await fetch(`${API_SIGN}?uid=${encodeURIComponent(uid)}`, { method: "GET" });
            if (r.ok) {
                const j = await r.json();
                ts = j.ts || "";
                sig = j.sig || "";
            }
        } catch (e) {
            console.warn("Не удалось получить подпись /api/sign:", e);
        }

        const widget = new window.tiptop.Widget();
        const isPremium = String(plan).toLowerCase() === "premium";
        const amountMonthly = isPremium ? AMOUNT_MONTHLY_PREMIUM : AMOUNT_MONTHLY_PRO;
        const planTitle = isPremium ? "Премиум" : "Профессионал";

        const params = {
            publicTerminalId: TIPTOP_PUBLIC_ID,
            paymentSchema: "Single",
            amount: AMOUNT_TRIAL,
            currency: CURRENCY,
            description: `Roletapp AI — ${planTitle} (первый месяц ${AMOUNT_TRIAL} ₸, далее ${amountMonthly} ₸/мес)`,
            userInfo: { accountId: uid },
            recurrent: { interval: "Month", period: 1 },
            metadata: { tg_uid: uid, site_id: TIPTOP_SITE_ID, source: "webapp", plan: planTitle, categories, ts, sig },
            successRedirectUrl: `${WEBAPP_URL}thank-you?uid=${encodeURIComponent(uid)}${ts ? `&ts=${encodeURIComponent(ts)}&sig=${encodeURIComponent(sig)}` : ""}`,
            failRedirectUrl: WEBAPP_URL + "payment-fail"
        };

        try {
            const res = await widget.start(params);
            console.log("TipTopPay result:", res);
            const token = res?.cardToken || res?.token || res?.CardToken;

            if (token) {
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() + 1);
                const startIso = startDate.toISOString().slice(0, 19);

                const payload = {
                    token: String(token),
                    accountId: uid,
                    description: `Ежемесячная подписка на Roletapp AI — ${planTitle}`,
                    amount: amountMonthly,
                    Currency: CURRENCY,
                    requireConfirmation: false,
                    startDate: startIso,
                    interval: "Month",
                    period: 1
                };

                try {
                    const r = await fetch(API_SUB_CREATE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                    const j = await r.json().catch(() => ({}));
                    const subId = j?.Model?.Id || j?.model?.id || j?.Id;
                    if (subId) {
                        localStorage.setItem("ttp_subscription_id", String(subId));
                        try { if (Array.isArray(categories)) localStorage.setItem("roletapp_premium_categories", JSON.stringify(categories)); } catch (e) { }
                    }
                } catch (e) { console.warn("Sub create failed", e); }
            }
        } catch (err) {
            console.error("TipTopPay error:", err);
            alert("Оплата не запустилась. Попробуйте ещё раз или используйте другой способ.");
        }
    }, []);

    const cancelSubscription = useCallback(async () => {
        const uid = readUidFromTgWebApp();
        if (!uid) {
            alert("Откройте страницу из Telegram Mini App. Зайдите в наш бот и откройте веб-приложение.");
            return;
        }

        const accountId = String(uid);
        try {
            const r = await fetch(API_SUB_CANCEL_BY_ACCOUNT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId, preferActive: true })
            });
            const j = await r.json().catch(() => ({}));
            if (r.ok && (j?.Success === true || j?.success === true)) {
                alert("Подписка отменена.");
                localStorage.removeItem("ttp_subscription_id");
                return;
            }
        } catch (e) { console.warn("Cancel: cancel-by-account error", e); }

        // Fallback
        let subId = (localStorage.getItem("ttp_subscription_id") || "").trim();
        try {
            if (!subId) {
                const rFind = await fetch(API_SUB_FIND, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId }) });
                const jFind = await rFind.json().catch(() => ({}));
                const list = jFind?.Model || jFind?.model || [];
                if (Array.isArray(list) && list.length) {
                    const active = list.find(x => (x?.Status || x?.status) === "Active");
                    subId = (active?.Id || list[0]?.Id || "").trim();
                    if (subId) localStorage.setItem("ttp_subscription_id", subId);
                }
            }
            if (!subId) {
                alert("Подписка не найдена. Проверьте аккаунт или Id подписки.");
                return;
            }
            const r2 = await fetch(API_SUB_CANCEL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Id: subId }) });
            const j2 = await r2.json().catch(() => ({}));
            if (r2.ok && (j2?.Success === true || j2?.success === true)) {
                alert("Подписка отменена.");
                localStorage.removeItem("ttp_subscription_id");
            } else {
                alert("Не удалось отменить подписку. Проверьте Id и попробуйте снова.");
            }
        } catch (e) {
            console.warn("Cancel: fallback error", e);
            alert("Ошибка сети при отмене подписки.");
        }
    }, []);

    return { startSubscription, cancelSubscription };
};
