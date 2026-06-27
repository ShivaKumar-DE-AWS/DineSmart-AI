"""Mehfil restaurant rebrand backend tests:
- POST /api/auth/guest
- POST/PATCH/DELETE /api/menu (admin)
- POST/DELETE /api/inventory (admin)
- POST /api/upload/image (admin) + GET /api/uploads/<file>
- POST /api/ai-waiter/speak  (TTS)
- POST /api/ai-waiter/transcribe (Whisper)
"""
import io
import os
import struct
import zlib
import requests
import pytest

_url = os.environ.get("REACT_APP_BACKEND_URL")
if not _url:
    # Fallback: read from frontend/.env (testing env doesn't propagate it to python by default)
    try:
        with open("/app/frontend/.env") as _f:
            for _ln in _f:
                if _ln.startswith("REACT_APP_BACKEND_URL="):
                    _url = _ln.split("=", 1)[1].strip()
                    break
    except Exception:
        pass
assert _url, "REACT_APP_BACKEND_URL not configured"
BASE_URL = _url.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_tok(s):
    import time
    # ponytail: retry once after rate-limit window if needed
    for attempt in range(3):
        r = s.post(f"{API}/auth/login", json={"email": "mehfil@smartdine.ai", "password": "Owner@123"})
        if r.status_code == 200:
            return r.json()["token"]
        if r.status_code == 429 and attempt < 2:
            time.sleep(65)  # ponytail: wait out full rate-limit window
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- /api/auth/guest ----------
_RID = "rest_mehfil_001"
class TestGuestAuth:
    def test_guest_empty_payload(self, s):
        r = s.post(f"{API}/auth/guest", params={"restaurant_id": _RID}, json={})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "token" in j and isinstance(j["token"], str) and len(j["token"]) > 20
        assert j["user"]["role"] == "customer"
        assert j["user"]["name"] == "Guest"
        assert j["user"]["id"].startswith("guest_")

    def test_guest_with_name_phone(self, s):
        r = s.post(f"{API}/auth/guest", params={"restaurant_id": _RID}, json={"name": "TEST_Diner", "phone": "9999999999"})
        assert r.status_code == 200
        j = r.json()
        assert j["user"]["name"] == "TEST_Diner"
        assert j["user"]["phone"] == "9999999999"
        assert j["user"]["role"] == "customer"

    def test_guest_token_works_with_me(self, s):
        r = s.post(f"{API}/auth/guest", params={"restaurant_id": _RID}, json={"name": "TEST_MeCheck"})
        tok = r.json()["token"]
        r2 = s.get(f"{API}/auth/me", headers=H(tok))
        assert r2.status_code == 200
        assert r2.json()["user"]["role"] == "customer"


# ---------- /api/menu CRUD ----------
class TestMenuCrud:
    def test_menu_crud_lifecycle(self, s, admin_tok):
        # CREATE
        payload = {
            "name": "TEST_Mehfil_Kebab",
            "description": "Royal smoked kebab",
            "price": 349.0,
            "category": "Mains",
            "image_url": "https://example.com/k.jpg",
            "available": True,
            "prep_time_min": 12,
            "tags": ["spicy", "TEST"],
        }
        r = s.post(f"{API}/menu", json=payload, headers=H(admin_tok))
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["name"] == payload["name"]
        assert created["price"] == 349.0
        item_id = created["id"]

        # GET (public)
        r2 = s.get(f"{API}/menu", params={"restaurant_id": _RID})
        assert r2.status_code == 200
        names = [i["name"] for i in r2.json()["items"]]
        assert payload["name"] in names

        # PATCH
        r3 = s.patch(f"{API}/menu/{item_id}", json={"price": 399.0}, headers=H(admin_tok))
        assert r3.status_code == 200
        # verify
        r4 = s.get(f"{API}/menu", params={"restaurant_id": _RID})
        match = [i for i in r4.json()["items"] if i["id"] == item_id][0]
        assert match["price"] == 399.0

        # DELETE
        r5 = s.delete(f"{API}/menu/{item_id}", headers=H(admin_tok))
        assert r5.status_code == 200
        r6 = s.get(f"{API}/menu", params={"restaurant_id": _RID})
        ids = [i["id"] for i in r6.json()["items"]]
        assert item_id not in ids

    def test_menu_post_requires_admin(self, s):
        r = s.post(f"{API}/menu", json={
            "name": "x", "description": "x", "price": 1.0, "category": "x", "image_url": "x"
        })
        assert r.status_code in (401, 403)

    def test_menu_delete_requires_admin(self, s):
        r = s.delete(f"{API}/menu/anything")
        assert r.status_code in (401, 403)


# ---------- /api/inventory CRUD ----------
class TestInventoryCrud:
    def test_inventory_crud_lifecycle(self, s, admin_tok):
        payload = {"name": "TEST_Saffron", "unit": "g", "qty": 50.0, "reorder_level": 10.0}
        r = s.post(f"{API}/inventory", json=payload, headers=H(admin_tok))
        assert r.status_code == 200, r.text
        created = r.json()
        item_id = created["id"]
        assert created["name"] == "TEST_Saffron"

        r2 = s.get(f"{API}/inventory", headers=H(admin_tok))
        assert r2.status_code == 200
        ids = [i["id"] for i in r2.json()["items"]]
        assert item_id in ids

        # PATCH
        r3 = s.patch(f"{API}/inventory/{item_id}", json={"qty": 25.0}, headers=H(admin_tok))
        assert r3.status_code == 200

        r4 = s.get(f"{API}/inventory", headers=H(admin_tok))
        match = [i for i in r4.json()["items"] if i["id"] == item_id][0]
        assert match["qty"] == 25.0

        # DELETE
        r5 = s.delete(f"{API}/inventory/{item_id}", headers=H(admin_tok))
        assert r5.status_code == 200
        r6 = s.get(f"{API}/inventory", headers=H(admin_tok))
        ids2 = [i["id"] for i in r6.json()["items"]]
        assert item_id not in ids2

    def test_inventory_post_requires_admin(self, s):
        r = s.post(f"{API}/inventory", json={"name": "x", "unit": "g", "qty": 1.0, "reorder_level": 1.0})
        assert r.status_code in (401, 403)


# ---------- /api/upload/image ----------
def _tiny_png_bytes() -> bytes:
    """Generate a minimal valid 1x1 PNG in pure-python."""
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    raw = b"\x00\xff\x00\x00"  # filter=0 + 1px RGB
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


class TestImageUpload:
    def test_upload_image_admin_and_serve(self, s, admin_tok):
        png = _tiny_png_bytes()
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        r = s.post(f"{API}/upload/image", files=files, headers=H(admin_tok))
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["url"].startswith("/api/uploads/")
        assert j["size"] == len(png)
        assert j["filename"].endswith(".png")
        # GET the file back
        full = f"{BASE_URL}{j['url']}"
        r2 = requests.get(full)
        assert r2.status_code == 200
        # Bytes match
        assert r2.content[:8] == png[:8]  # PNG signature
        assert len(r2.content) == len(png)

    def test_upload_no_auth(self, s):
        files = {"file": ("x.png", io.BytesIO(b"x"), "image/png")}
        r = s.post(f"{API}/upload/image", files=files)
        assert r.status_code in (401, 403)

    def test_upload_empty_file_rejected(self, s, admin_tok):
        files = {"file": ("e.png", io.BytesIO(b""), "image/png")}
        r = s.post(f"{API}/upload/image", files=files, headers=H(admin_tok))
        assert r.status_code == 400


# ---------- /api/ai-waiter/transcribe ----------
class TestTranscribe:
    def test_transcribe_empty_returns_400(self, s, admin_tok):
        files = {"file": ("a.webm", io.BytesIO(b""), "audio/webm")}
        r = s.post(f"{API}/ai-waiter/transcribe", files=files, headers=H(admin_tok))
        assert r.status_code == 400


# ---------- /api/ai-waiter/speak ----------
class TestTTS:
    def test_speak_returns_audio(self, s, admin_tok):
        r = s.post(f"{API}/ai-waiter/speak", json={"text": "Hello from Mehfil", "voice": "nova"}, headers=H(admin_tok), timeout=30)
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "audio" in ct, f"content-type was {ct}"
        # MP3 frames typically start with ID3 or 0xFFFB / 0xFFFA / 0xFFE0 etc.
        assert len(r.content) > 1000, f"audio too small: {len(r.content)}"

    def test_speak_empty_text_rejected(self, s, admin_tok):
        r = s.post(f"{API}/ai-waiter/speak", json={"text": "  ", "voice": "nova"}, headers=H(admin_tok))
        assert r.status_code == 400
