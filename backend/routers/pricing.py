"""Geo-priced Subscriptions — localized pricing based on client IP country detection."""
from __future__ import annotations
import httpx
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/pricing", tags=["pricing"])

# ponytail: hardcoded map, refresh rates yearly or when major economies shift
CURRENCY_MAP = {
    "IN": {"currency": "INR", "symbol": "₹", "rate": 85, "pro": 1499, "enterprise": 4999},
    "US": {"currency": "USD", "symbol": "$", "rate": 1, "pro": 18, "enterprise": 59},
    "GB": {"currency": "GBP", "symbol": "£", "rate": 0.79, "pro": 14, "enterprise": 46},
    "AE": {"currency": "AED", "symbol": "د.إ", "rate": 3.67, "pro": 66, "enterprise": 216},
    "SG": {"currency": "SGD", "symbol": "S$", "rate": 1.34, "pro": 24, "enterprise": 79},
    "MY": {"currency": "MYR", "symbol": "RM", "rate": 4.68, "pro": 84, "enterprise": 276},
    "AU": {"currency": "AUD", "symbol": "A$", "rate": 1.54, "pro": 28, "enterprise": 91},
    "CA": {"currency": "CAD", "symbol": "C$", "rate": 1.37, "pro": 25, "enterprise": 81},
    "EU": {"currency": "EUR", "symbol": "€", "rate": 0.93, "pro": 17, "enterprise": 55},
    "SA": {"currency": "SAR", "symbol": "﷼", "rate": 3.75, "pro": 68, "enterprise": 221},
}

DEFAULT_CURRENCY = {"currency": "USD", "symbol": "$", "rate": 1, "pro": 18, "enterprise": 59}

PLAN_FEATURES = {
    "starter": ["Unlimited AI Waiter sessions", "Menu management", "Order queueing", "Table management"],
    "pro": ["Everything in Starter", "Unlimited monthly orders", "AI Waiter capabilities", "Advanced analytics dashboard", "Priority customer support"],
    "enterprise": ["Everything in Pro", "Dedicated account manager", "Custom integrations", "White-label branding", "SLA guarantee", "Bulk API access"],
}

PLAN_NAMES = {"starter": "Starter", "pro": "Pro", "enterprise": "Enterprise"}

COUNTRY_NAMES = {
    "IN": "India", "US": "United States", "GB": "United Kingdom",
    "AE": "United Arab Emirates", "SG": "Singapore", "MY": "Malaysia",
    "AU": "Australia", "CA": "Canada", "EU": "European Union", "SA": "Saudi Arabia",
}

# ponytail: ad-hoc country code → flag emoji, 2-letter code offset
def _flag(code: str) -> str:
    return chr(127462 + ord(code[0]) - 65) + chr(127462 + ord(code[1]) - 65) if len(code) == 2 else ""


@router.get("/geo")
async def geo_pricing(request: Request):
    """Return localized pricing based on client IP country detection. Public endpoint."""
    client_ip = request.headers.get("x-forwarded-for", request.client.host)
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    country_code = "IN"  # fallback

    # skip loopback — always use IN for local dev
    if client_ip and client_ip not in ("127.0.0.1", "::1", "localhost"):
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                resp = await c.get(f"https://ipapi.co/{client_ip}/json/")
                if resp.status_code == 200:
                    data = resp.json()
                    cc = data.get("country_code", "")
                    if cc and cc in CURRENCY_MAP:
                        country_code = cc
                    elif cc:
                        country_code = cc
        except Exception:
            pass

    cc_info = CURRENCY_MAP.get(country_code, DEFAULT_CURRENCY)
    # ponytail: use hardcoded prices when available, else compute from rate
    pro_price = cc_info.get("pro", round(cc_info["rate"] * 18))
    enterprise_price = cc_info.get("enterprise", round(cc_info["rate"] * 59))

    plans = [
        {
            "id": "starter",
            "name": PLAN_NAMES["starter"],
            "price": 0,
            "currency": cc_info["currency"],
            "interval": "month",
            "features": PLAN_FEATURES["starter"],
        },
        {
            "id": "pro",
            "name": PLAN_NAMES["pro"],
            "price": pro_price,
            "currency": cc_info["currency"],
            "interval": "month",
            "features": PLAN_FEATURES["pro"],
        },
        {
            "id": "enterprise",
            "name": PLAN_NAMES["enterprise"],
            "price": enterprise_price,
            "currency": cc_info["currency"],
            "interval": "month",
            "features": PLAN_FEATURES["enterprise"],
        },
    ]

    return {
        "country": country_code,
        "country_name": COUNTRY_NAMES.get(country_code, country_code),
        "flag": _flag(country_code),
        "currency": cc_info["currency"],
        "currency_symbol": cc_info["symbol"],
        "plans": plans,
        "base_currency": cc_info["currency"],
    }
