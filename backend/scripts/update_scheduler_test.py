import json
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models import AppConfiguration

def update_scheduler():
    db = SessionLocal()
    try:
        config_entry = db.query(AppConfiguration).filter(
            AppConfiguration.config_key == 'SCHEDULER_CONFIG'
        ).first()
        
        if not config_entry:
            print("SCHEDULER_CONFIG not found")
            return

        config = json.loads(config_entry.config_value)
        
        # Target time: 8:50
        target_hour = 8
        target_minute = 50
        
        print(f"Updating crypto_ohlcv_clients schedule to {target_hour}:{target_minute}")
        
        updated = False
        for schedule in config['schedules']:
            if 'crypto_ohlcv_clients' in schedule['collectors']:
                schedule['hour'] = target_hour
                schedule['minute'] = target_minute
                updated = True
                print("Found and updated crypto_ohlcv_clients")
                
        if updated:
            config_entry.config_value = json.dumps(config)
            db.commit()
            print("Database updated successfully.")
        else:
            print("crypto_ohlcv_clients schedule not found in config.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_scheduler()
