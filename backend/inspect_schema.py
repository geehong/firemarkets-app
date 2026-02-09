
import sys
import os
# Add parent directory to path to find 'app' module if running from backend
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, inspect, text
from app.core.config_manager import ConfigManager
from app.core.database import SessionLocal

def inspect_schema():
    print("Connecting to database...")
    db = SessionLocal()
    try:
        engine = db.get_bind()
        inspector = inspect(engine)
        
        if not inspector.has_table('crypto_metrics'):
            print("Table 'crypto_metrics' does not exist!")
            return

        columns = inspector.get_columns('crypto_metrics')
        print("\nTable: crypto_metrics")
        print("-" * 50)
        for column in columns:
            print(f"Column: {column['name']:20} | Type: {str(column['type']):15} | PK: {str(column.get('primary_key', False)):5} | Nullable: {str(column.get('nullable', True)):5} | Default: {column.get('default')}")
            if column['name'] == 'metric_id':
                print(f"  -> Autoincrement Detail: {column.get('autoincrement')}")

        pk_constraint = inspector.get_pk_constraint('crypto_metrics')
        print(f"\nPK Constraint: {pk_constraint}")

        # Check for sequences specifically related to metric_id
        with engine.connect() as conn:
            # Query pg_class directly for associated sequences
            query = text("""
                SELECT s.relname as sequence_name
                FROM pg_class s
                JOIN pg_depend d ON d.objid = s.oid
                JOIN pg_class t ON d.refobjid = t.oid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
                WHERE s.relkind = 'S' 
                  AND t.relname = 'crypto_metrics' 
                  AND a.attname = 'metric_id';
            """)
            sequences = result.fetchall()
            print(f"\nAssociated Sequences for metric_id: {sequences}")

        unique_constraints = inspector.get_unique_constraints('crypto_metrics')
        print(f"\nUnique Constraints: {unique_constraints}")


    except Exception as e:
        print(f"Error inspecting schema: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_schema()
