
import asyncio
from sqlalchemy import create_engine, inspect, text
from app.core.config_manager import ConfigManager
from app.core.database import SessionLocal

def inspect_schema():
    db = SessionLocal()
    try:
        engine = db.get_bind()
        inspector = inspect(engine)
        columns = inspector.get_columns('crypto_metrics')
        print("Table: crypto_metrics")
        for column in columns:
            print(f"Column: {column['name']}, Type: {column['type']}, PK: {column.get('primary_key')}, Nullable: {column.get('nullable')}, Default: {column.get('default')}, Autoincrement: {column.get('autoincrement')}")
            
        # Also check constraints to see if metric_id is truly PK
        pk_constraint = inspector.get_pk_constraint('crypto_metrics')
        print(f"PK Constraint: {pk_constraint}")

        # Check for sequences
        with engine.connect() as conn:
            result = conn.execute(text("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'S' AND c.relname LIKE 'crypto_metrics_metric_id_seq%';"))
            sequences = result.fetchall()
            print(f"Sequences related to crypto_metrics_metric_id: {sequences}")

    except Exception as e:
        print(f"Error inspecting schema: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_schema()
