import logging
import traceback
from ..core.database import SessionLocal
from ..models.asset import SystemLog

class DBLogHandler(logging.Handler):
    """
    Custom logging handler that writes logs to the database.
    """
    def __init__(self, level=logging.NOTSET):
        super().__init__(level)

    def emit(self, record):
        # Skip logs from sqlalchemy engine to prevent infinite recursion or noise
        if record.name.startswith('sqlalchemy.engine'):
            return

        try:
            msg = self.format(record)
            
            # Create a new session for logging
            db = SessionLocal()
            try:
                log_entry = SystemLog(
                    level=record.levelname,
                    module=record.name,
                    message=msg
                )
                db.add(log_entry)
                db.commit()
            except Exception:
                db.rollback()
                # Fallback to stderr if DB logging fails
                self.handleError(record)
            finally:
                db.close()
        except Exception:
            self.handleError(record)

def setup_db_logging(level=logging.WARNING):
    """
    Sets up database logging handler.
    
    Args:
        level: Logging level for DB handler (default: WARNING)
    """
    root_logger = logging.getLogger()
    
    # Check if handler already exists
    for handler in root_logger.handlers:
        if isinstance(handler, DBLogHandler):
            return

    db_handler = DBLogHandler()
    db_handler.setLevel(level)
    
    # Create a formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    db_handler.setFormatter(formatter)
    
    root_logger.addHandler(db_handler)
