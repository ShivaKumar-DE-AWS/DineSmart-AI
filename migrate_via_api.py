import requests
import json
import sys

try:
    token = open("token.txt").read().strip()
except Exception as e:
    print("Error reading token:", e)
    sys.exit(1)

BASE = "https://dinesmart-ai.onrender.com"
HEADERS = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# 1. Get all restaurants
res = requests.get(f"{BASE}/api/super-admin/restaurants", headers=HEADERS)
if res.status_code != 200:
    print("Failed to get restaurants:", res.text)
    sys.exit(1)

restaurants = res.json().get("restaurants", [])
print(f"Found {len(restaurants)} restaurants.")

# 2. Extend trial for each to set status and trial_ends_at
for r in restaurants:
    rid = r["id"]
    print(f"Migrating {r['name']} ({rid})...")
    # Add 14 days
    payload = {"days": 14}
    ext_res = requests.post(f"{BASE}/api/super-admin/restaurants/{rid}/extend-trial", headers=HEADERS, json=payload)
    if ext_res.status_code == 200:
        print(f"  Success: {ext_res.json()}")
    else:
        print(f"  Failed: {ext_res.status_code} {ext_res.text}")

print("Migration via API complete.")
