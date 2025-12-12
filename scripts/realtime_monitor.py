import time
import os
import hashlib
import logging
from datetime import datetime

# Configuration
MONITOR_DIR = "/home/geehong/firemarkets-app"
LOG_FILE = os.path.join(MONITOR_DIR, "logs", "realtime_monitor.log")

# Target files to monitor and their expected clean content
# using content matching is safer than hash if we know exactly what it should be
TARGETS = {
    "frontend/postcss.config.js": """module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
}
""",
    "frontend/prettier.config.js": """module.exports = {
    plugins: ['prettier-plugin-tailwindcss'],
}
"""
}

# Setup logging
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def get_file_content(filepath):
    try:
        with open(filepath, 'r') as f:
            return f.read()
    except FileNotFoundError:
        return None
    except Exception as e:
        logging.error(f"Error reading {filepath}: {e}")
        return None

def restore_file(filepath, content):
    try:
        with open(filepath, 'w') as f:
            f.write(content)
        logging.info(f"RESTORED: {filepath} was recovered to healthy state.")
        print(f"[{datetime.now()}] ALERT: Malicious change detected and BLOCKED in {filepath}")
    except Exception as e:
        logging.error(f"Failed to restore {filepath}: {e}")

def monitor():
    print("Starting Real-time File Integrity Monitor...")
    print(f"Monitoring {len(TARGETS)} critical files.")
    logging.info("Monitor started.")

    while True:
        for rel_path, expected_content in TARGETS.items():
            full_path = os.path.join(MONITOR_DIR, rel_path)
            current_content = get_file_content(full_path)

            if current_content is None:
                logging.warning(f"File missing: {full_path}. Restoring...")
                restore_file(full_path, expected_content)
                continue

            # Normalize line endings for comparison just in case
            if current_content.strip() != expected_content.strip():
                logging.warning(f"Integrity violation detected in {full_path}")
                restore_file(full_path, expected_content)
        
        time.sleep(1)

if __name__ == "__main__":
    try:
        monitor()
    except KeyboardInterrupt:
        print("Monitor stopped by user.")
        logging.info("Monitor stopped by user.")
