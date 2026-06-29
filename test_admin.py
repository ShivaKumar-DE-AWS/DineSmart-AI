import requests, sys

TOKEN = open(r"C:\Users\Shiva Kumar\OneDrive\Documents\Dine Smart\DineSmart-AI\token.txt").read().strip()
BASE = "https://smartdineai.co.in"
H = {"Authorization": f"Bearer {TOKEN}"}

def t(method, url, desc="", body=None):
    try:
        r = requests.request(method, url, headers=H, json=body, timeout=15)
        text = r.text[:300]
        print(f"{r.status_code:3d} {desc:40s} {text[:200]}")
        return r
    except Exception as e:
        print(f"ERR  {desc:40s} {e}")
        return None

print("="*70)
print("TABLES")
t("GET", f"{BASE}/api/tables?restaurant_id=rest_mehfil_001", "get tables")
t("GET", f"{BASE}/api/tables/rest_mehfil_001", "get tables path")

print("\nSETTINGS")
t("GET", f"{BASE}/api/admin/settings", "admin settings (needs impersonation or will 404)")

print("\nANALYTICS")
t("GET", f"{BASE}/api/analytics?restaurant_id=rest_mehfil_001&period=7d", "analytics query")

print("\nORDERS (superadmin)")
t("GET", f"{BASE}/api/orders?restaurant_id=rest_mehfil_001&limit=2", "orders query")

print("\nAUTH /me")
t("GET", f"{BASE}/api/auth/me", "auth me")

print("\nBILLING")
t("GET", f"{BASE}/api/billing/status", "billing status")

print("\nSUPER-ADMIN (full)")
t("POST", f"{BASE}/api/super-admin/restaurants/rest_mehfil_001/suspend", "suspend")
t("POST", f"{BASE}/api/super-admin/restaurants/rest_mehfil_001/impersonate", "impersonate")
