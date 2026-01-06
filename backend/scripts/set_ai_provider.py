import sys
import os
import json
from dotenv import load_dotenv

# Load .env from project root
# Assuming script is in backend/scripts/
project_root = os.path.join(os.path.dirname(__file__), '..', '..')
load_dotenv(os.path.join(project_root, '.env'))

from sqlalchemy.orm import Session
from sqlalchemy import create_engine, func

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.database import SessionLocal, engine
from app.models.asset import AppConfiguration

def set_ai_config(collection="gemini", schedule="groq", merge="groq"):
    db = SessionLocal()
    try:
        config_key = "ai_provider_config"
        config_value = json.dumps({
            "collection": collection,
            "schedule": schedule,
            "merge": merge,
            "default": "gemini"
        })
        
        # Check if exists
        config = db.query(AppConfiguration).filter(
            AppConfiguration.config_key == config_key
        ).first()
        
        if config:
            config.config_value = config_value
            print(f"Updated {config_key}: {config_value}")
        else:
            # Workaround for NULL identity key / missing sequence
            max_id = db.query(func.max(AppConfiguration.config_id)).scalar() or 0
            new_id = max_id + 1
            
            new_config = AppConfiguration(
                config_id=new_id,
                config_key=config_key,
                config_value=config_value,
                data_type='json',
                description="AI Provider Configuration (gemini, groq)",
                is_active=True
            )
            db.add(new_config)
            print(f"Created {config_key}: {config_value} (ID: {new_id})")
            
        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    coll = sys.argv[1] if len(sys.argv) > 1 else "gemini"
    merg = sys.argv[2] if len(sys.argv) > 2 else "groq"
    set_ai_config(collection=coll, schedule=merg, merge=merg)
