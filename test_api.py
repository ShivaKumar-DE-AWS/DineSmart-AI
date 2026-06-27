import requests

try:
    print("Health:", requests.get("https://dine-smart-ai.vercel.app/api/health").text)
    print("Config List:", requests.get("https://dine-smart-ai.vercel.app/api/config/list").text)
    print("Config Mehfil:", requests.get("https://dine-smart-ai.vercel.app/api/config/mehfil").text)
    
    config = requests.get("https://dine-smart-ai.vercel.app/api/config/mehfil").json()
    rid = config.get("id")
    print("Menu:", len(requests.get(f"https://dine-smart-ai.vercel.app/api/menu?restaurant_id={rid}").json().get("items", [])))
except Exception as e:
    print("Error:", e)
