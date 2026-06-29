import requests
import json
import sys

# Read token
try:
    token = open("token.txt").read().strip()
except Exception as e:
    print("Error reading token:", e)
    sys.exit(1)

BASE = "https://smartdineai.co.in"
HEADERS = {"Authorization": f"Bearer {token}"}
MOBILE_HEADERS = {"Authorization": f"Bearer {token}", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"}

endpoints_to_test = [
    ("Dashboard Stats", "GET", "/api/super-admin/stats"),
    ("Restaurants List", "GET", "/api/super-admin/restaurants"),
    ("Audit Logs", "GET", "/api/super-admin/audit"),
    ("System Health", "GET", "/api/super-admin/health"),
    ("AI Usage", "GET", "/api/super-admin/ai-usage"),
    ("Support Tickets", "GET", "/api/super-admin/tickets"),
]

print("="*60)
print("SUPER ADMIN DASHBOARD ENDPOINT TESTS")
print("="*60)

report = {}

for env_name, headers in [("Desktop", HEADERS), ("Mobile", MOBILE_HEADERS)]:
    print(f"\n=== Testing {env_name} Environment ===")
    for name, method, path in endpoints_to_test:
        url = f"{BASE}{path}"
        try:
            response = requests.request(method, url, headers=headers, timeout=15)
            status = response.status_code
            if status == 200:
                result = "PASS"
            else:
                result = f"FAIL (Status: {status})"
            
            try:
                data = response.json()
                output = json.dumps(data)[:150] + ("..." if len(json.dumps(data)) > 150 else "")
            except:
                output = response.text[:150]
                
            print(f"{name:20s} | {result:15s} | {path}")
            print(f"  Response: {output}\n")
            
            report[f"{env_name}_{name}"] = {"status": result, "response": data if status == 200 else response.text, "path": path}
                
        except Exception as e:
            print(f"{name:20s} | ERROR           | {path}")
            print(f"  Exception: {e}\n")
            report[f"{env_name}_{name}"] = {"status": "ERROR", "response": str(e), "path": path}

print("="*60)
print("SUPER ADMIN ACTION TESTS")
print("="*60)

restaurant_id = "rest_mehfil_001"

# Test Impersonate
action_name = "Impersonate Rest."
path = f"/api/super-admin/restaurants/{restaurant_id}/impersonate"
url = f"{BASE}{path}"
try:
    response = requests.post(url, headers=HEADERS, timeout=15)
    status = response.status_code
    if status == 200:
        result = "PASS"
        impersonate_token = response.json().get("token", "No token found")[:20] + "..."
        output = f"Token received: {impersonate_token}"
    else:
        result = f"FAIL (Status: {status})"
        output = response.text[:150]
        
    print(f"{action_name:20s} | {result:15s} | {path}")
    print(f"  Response: {output}\n")
    report[action_name] = {"status": result, "response": output, "path": path}
except Exception as e:
    print(f"{action_name:20s} | ERROR           | {path}")
    print(f"  Exception: {e}\n")
    report[action_name] = {"status": "ERROR", "response": str(e), "path": path}

# Test Suspend Toggle (Run twice to restore original state)
action_name = "Suspend Toggle 1"
path = f"/api/super-admin/restaurants/{restaurant_id}/suspend"
url = f"{BASE}{path}"
try:
    response = requests.post(url, headers=HEADERS, timeout=15)
    status = response.status_code
    if status == 200:
        result = "PASS"
        output = json.dumps(response.json())
        
        # Second toggle
        response2 = requests.post(url, headers=HEADERS, timeout=15)
        if response2.status_code == 200:
            output += " | Reverted: " + json.dumps(response2.json())
        else:
            output += " | Revert FAIL: " + response2.text[:50]
    else:
        result = f"FAIL (Status: {status})"
        output = response.text[:150]
        
    print(f"{action_name:20s} | {result:15s} | {path}")
    print(f"  Response: {output}\n")
    report[action_name] = {"status": result, "response": output, "path": path}
except Exception as e:
    print(f"{action_name:20s} | ERROR           | {path}")
    print(f"  Exception: {e}\n")
    report[action_name] = {"status": "ERROR", "response": str(e), "path": path}

with open("super_admin_test_report.json", "w") as f:
    json.dump(report, f, indent=2)
print("Test completed. Full report saved to super_admin_test_report.json")
