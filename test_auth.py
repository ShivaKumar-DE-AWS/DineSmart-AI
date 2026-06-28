import requests

token=open(r...ivas token.txt").read().strip()
BASE="https://dinesmart-ai.onrender.com"
H={"Authorization":f"Bearer {token}"}

endpoints = [
    ("GET", "/api/admin/settings"),
    ("GET", "/api/admin/staff"),
    ("GET", "/api/orders?restaurant_id=rest_mehfil_001&limit=2"),
    ("GET", "/api/tables?restaurant_id=rest_mehfil_001"),
    ("GET", "/api/analytics?restaurant_id=rest_mehfil_001&period=7d"),
]

for method, path in endpoints:
    try:
        r = requests.request(method, f"{BASE}{path}", headers=H, timeout=15)
        print(f"{r.status_code} {path}")
        print(f"  {r.text[:200]}")
    except Exception as e:
        print(f"ERR {path}: {e}")
    print()
