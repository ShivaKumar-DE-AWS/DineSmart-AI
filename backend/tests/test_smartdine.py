"""SmartDine AI backend regression tests."""
import os
import json
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://dinesmart-ai.onrender.com").rstrip("/")
API = f"{BASE_URL}/api"

# ---------- fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()

def login(s, email, password):
    import time
    for attempt in range(5):
        r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
        if r.status_code == 200:
            return r.json()
        if r.status_code == 429 and attempt < 4:
            time.sleep(15)  # ponytail: wait out rate-limit window
    assert r.status_code == 200, r.text
    return r.json()

@pytest.fixture(scope="session")
def admin(s):
    return login(s, "mehfil@smartdine.ai", "Owner@123")

@pytest.fixture(scope="session")
def chef(s):
    return login(s, "kitchen-mehfil@smartdine.ai", "Chef@123")

@pytest.fixture(scope="session")
def counter(s):
    return login(s, "counter-mehfil@smartdine.ai", "Counter@123")

@pytest.fixture(scope="session")
def guest(s):
    return login(s, "guest-mehfil@smartdine.ai", "Guest@123")


def hdr(tok):
    return {"Authorization": f"Bearer {tok}"}

# ---------- Health ----------
def test_health(s):
    r = s.get(f"{API}/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"

# ---------- Auth ----------
def test_login_admin_role(admin):
    assert admin["user"]["role"] == "admin"
    assert admin["user"]["email"] == "mehfil@smartdine.ai"
    assert isinstance(admin["token"], str) and len(admin["token"]) > 20

def test_login_kitchen_role(chef):
    assert chef["user"]["role"] == "kitchen"

def test_login_counter_role(counter):
    assert counter["user"]["role"] == "counter"

def test_login_customer_role(guest):
    assert guest["user"]["role"] == "customer"

def test_login_bad(s):
    r = s.post(f"{API}/auth/login", json={"email": "admin-mehfil@smartdine.ai", "password": "wrong"})
    assert r.status_code in (401, 429), f"expected 401/429 got {r.status_code}"

def test_me_with_token(s, admin):
    r = s.get(f"{API}/auth/me", headers=hdr(admin["token"]))
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "admin"

def test_me_without_token(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401

# ---------- Menu ----------
MEHFIL_REST_ID = "rest_mehfil_001"
def test_menu_has_items(s):
    r = s.get(f"{API}/menu", params={"restaurant_id": MEHFIL_REST_ID})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    for it in items:
        assert "name" in it and "price" in it and "image_url" in it and "id" in it

# ---------- Orders ----------
@pytest.fixture(scope="session")
def created_order(s, admin):
    menu = s.get(f"{API}/menu", params={"restaurant_id": admin["user"]["restaurant_id"]}).json()["items"]
    items = [
        {"item_id": menu[0]["id"], "name": menu[0]["name"], "price": menu[0]["price"], "qty": 2},
        {"item_id": menu[1]["id"], "name": menu[1]["name"], "price": menu[1]["price"], "qty": 1},
    ]
    payload = {"customer_name": "TEST_Pytest", "items": items, "payment_method": "mock_card", "restaurant_id": admin["user"]["restaurant_id"], "order_type": "takeaway"}
    r = s.post(f"{API}/orders", json=payload, headers=hdr(admin["token"]))
    assert r.status_code == 200, r.text
    # Create returns {ok, order_id, token, total}; fetch full order for assertions
    cr = r.json()
    r2 = s.get(f"{API}/orders/{cr['order_id']}", headers=hdr(admin["token"]))
    assert r2.status_code == 200
    order = r2.json()
    return order, items

def test_create_order(created_order):
    order, items = created_order
    assert order["status"] == "confirmed"
    assert order["token"].startswith("A-") and len(order["token"]) == 5
    expected_sub = round(sum(i["price"] * i["qty"] for i in items), 2)
    expected_tax = round(expected_sub * 0.05, 2)
    expected_total = round(expected_sub + expected_tax, 2)
    assert abs(order["subtotal"] - expected_sub) < 0.01
    assert abs(order["tax"] - expected_tax) < 0.01
    assert abs(order["total"] - expected_total) < 0.01

def test_get_order(s, created_order):
    order, _ = created_order
    r = s.get(f"{API}/orders/{order['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == order["id"]

def test_status_requires_auth(s, created_order):
    order, _ = created_order
    r = s.patch(f"{API}/orders/{order['id']}/status", json={"status": "preparing"})
    assert r.status_code in (401, 403)

def test_status_transitions(s, created_order, admin, chef, counter):
    order, _ = created_order
    # confirmed -> preparing (kitchen)
    r1 = s.patch(f"{API}/orders/{order['id']}/status", json={"status": "preparing"}, headers=hdr(chef["token"]))
    assert r1.status_code == 200 and r1.json()["status"] == "preparing"
    # preparing -> ready (kitchen)
    r2 = s.patch(f"{API}/orders/{order['id']}/status", json={"status": "ready"}, headers=hdr(chef["token"]))
    assert r2.status_code == 200 and r2.json()["status"] == "ready"
    # ready -> served (counter)
    r3 = s.patch(f"{API}/orders/{order['id']}/status", json={"status": "served"}, headers=hdr(counter["token"]))
    assert r3.status_code == 200 and r3.json()["status"] == "served"

# ---------- Inventory ----------
def test_inventory_no_auth(s):
    r = s.get(f"{API}/inventory")
    assert r.status_code in (401, 403)

def test_inventory_admin(s, admin):
    r = s.get(f"{API}/inventory", headers=hdr(admin["token"]))
    assert r.status_code == 200
    assert len(r.json()["items"]) >= 1

def test_inventory_customer_forbidden(s, guest):
    r = s.get(f"{API}/inventory", headers=hdr(guest["token"]))
    assert r.status_code == 403

# ---------- Analytics ----------
def test_dashboard_admin(s, admin):
    r = s.get(f"{API}/analytics/dashboard", headers=hdr(admin["token"]))
    assert r.status_code == 200
    j = r.json()
    for k in ["revenue_today", "orders_today", "avg_ticket", "top_items", "low_stock_count", "low_stock", "status_counts"]:
        assert k in j

def test_revenue_admin(s, admin):
    r = s.get(f"{API}/analytics/revenue", headers=hdr(admin["token"]))
    assert r.status_code == 200
    assert "series" in r.json()

def test_customers_admin(s, admin):
    r = s.get(f"{API}/analytics/customers", headers=hdr(admin["token"]))
    assert r.status_code == 200
    j = r.json()
    for k in ["total_customers", "repeat_customers", "repeat_rate", "top_customers"]:
        assert k in j

def test_analytics_requires_admin(s, chef):
    r = s.get(f"{API}/analytics/dashboard", headers=hdr(chef["token"]))
    assert r.status_code == 403

# ---------- Payment (UPI/QR) ----------
def test_payment_config(s):
    r = s.get(f"{API}/payment/config")
    assert r.status_code == 200
    j = r.json()
    assert j["stripe_enabled"] == False
    assert j["provider"] == "upi_qr"

def test_payment_intent(s):
    r = s.post(f"{API}/payment/intent", json={"amount": 540.5, "method": "upi"})
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "succeeded"
    assert j["intent_id"].startswith("upi_")
    assert abs(j["amount"] - 540.5) < 0.01


