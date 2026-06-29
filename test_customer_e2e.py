import requests
import json
import time

BASE = "https://smartdineai.co.in"
# Super Admin token for checking things, but customer shouldn't need a token for public routes
try:
    token = open("token.txt").read().strip()
except Exception:
    token = ""

H = {
    "Authorization": f"Bearer {token}",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
}
RESTAURANT_ID = "rest_spice_garden_001"

print("=========================================")
print("MOBILE CUSTOMER E2E WORKFLOW TEST")
print("=========================================\n")

# 1. Fetch Menu
print("[1] Fetching Restaurant Menu (Mobile)...")
url = f"{BASE}/api/menu?restaurant_id={RESTAURANT_ID}"
res = requests.get(url, headers=H, timeout=10)
if res.status_code == 200:
    menu = res.json().get("items", [])
    print(f"  PASS: Found {len(menu)} items in the menu.")
    if len(menu) == 0:
        print("  FAIL: Menu is empty. Cannot continue test.")
        exit(1)
    # Pick first available item
    item = next((m for m in menu if m.get("available")), None)
    if not item:
        print("  FAIL: No available items to order.")
        exit(1)
    print(f"  Selected Item: {item['name']} (ID: {item['id']}, Price: {item['price']})")
else:
    print(f"  FAIL: Could not fetch menu. Status {res.status_code}")
    exit(1)

# 2. Create Order
print("\n[2] Creating Customer Order (Mobile)...")
order_payload = {
    "restaurant_id": RESTAURANT_ID,
    "customer_name": "QA Mobile Tester",
    "customer_phone": "9999999999",
    "order_type": "takeaway",
    "payment_method": "upi",
    "items": [
        {
            "item_id": item['id'], 
            "qty": 2, 
            "notes": "Extra spicy (via Mobile)",
            "name": item['name'],
            "price": item['price']
        }
    ]
}
res = requests.post(f"{BASE}/api/orders", json=order_payload, headers=H, timeout=15)
if res.status_code == 200:
    order_data = res.json()
    order_id = order_data.get("order_id")
    order_token = order_data.get("token")
    print(f"  PASS: Order created successfully! ID: {order_id}, Token: {order_token}")
else:
    print(f"  FAIL: Failed to create order. {res.status_code} - {res.text}")
    exit(1)

# 3. Fetch Order Status (Customer tracking)
print("\n[3] Customer Tracking Order (Mobile)...")
res = requests.get(f"{BASE}/api/orders/{order_id}", headers=H, timeout=10)
if res.status_code == 200:
    o = res.json()
    print(f"  PASS: Order retrieved. Status: {o.get('status')}")
else:
    print(f"  FAIL: Could not retrieve order. {res.status_code} - {res.text}")
    exit(1)

# 4. Kitchen Updates Order (Admin Action)
print("\n[4] Kitchen Display System (KDS) Updating Status...")
res = requests.patch(
    f"{BASE}/api/orders/{order_id}/status",
    json={"status": "preparing"},
    headers=H,
    timeout=10
)
if res.status_code == 200:
    print(f"  PASS: Status updated to 'preparing'")
else:
    print(f"  FAIL: Could not update status. {res.status_code} - {res.text}")

res = requests.patch(
    f"{BASE}/api/orders/{order_id}/status",
    json={"status": "ready"},
    headers=H,
    timeout=10
)
if res.status_code == 200:
    print(f"  PASS: Status updated to 'ready'")
else:
    print(f"  FAIL: Could not update status. {res.status_code} - {res.text}")

# 5. Download Bill
print("\n[5] Customer Downloading Bill (Mobile)...")
res = requests.get(f"{BASE}/api/orders/{order_id}/bill", headers=H, timeout=10)
if res.status_code == 200 and "pdf" in res.headers.get("Content-Type", ""):
    print(f"  PASS: PDF Bill successfully generated ({len(res.content)} bytes)")
else:
    print(f"  FAIL: Failed to download bill. {res.status_code}")

print("\n=========================================")
print("E2E WORKFLOW TEST COMPLETE")
print("=========================================")
