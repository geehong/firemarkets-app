
import sys
import os
sys.path.append(os.getcwd())
from app.main import app

print("--- Registered Routes ---")
for route in app.routes:
    if hasattr(route, "path") and "metrics" in route.path:
        print(f"Path: {route.path}, Methods: {route.methods}")
print("--- End Routes ---")
