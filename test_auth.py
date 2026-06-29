import requests

token=open(r"C:\Users\Shiva Kumar\OneDrive\Documents\Dine Smart\DineSmart-AI\token.txt").read().strip()
BASE="https://smartdineai.co.in"
H={"Authorization":f"Bearer {token}"}
MOBILE_H={"Authorization":f"Bearer {token}", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"}
endpoints = [
    ("GET", "/api/admin/staff"),
    ("GET", "/api/orders?restaurant_id=rest_mehfil_001&limit=2"),
    ("GET", "/api/tables?restaurant_id=rest_mehfil_001"),
    ("GET", "/api/analytics?restaurant_id=rest_mehfil_001"),
]

for name, headers in [("Desktop", H), ("Mobile", MOBILE_H)]:
    print(f"=== Testing {name} Environment ===")
    for method, path in endpoints:
        try:
            r = requests.request(method, f"{BASE}{path}", headers=headers, timeout=15)
            print(f"{r.status_code} {path}")
            print(f"  {r.text[:200]}")
        except Exception as e:
            print(f"ERR {path}: {e}")
        print()
