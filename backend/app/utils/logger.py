"""
Logging utility functions.
"""
import logging
import time
import functools
import traceback
from datetime import datetime
from typing import Optional, Any, Dict, Callable
import structlog


def setup_logger(
    name: str = "finance_app",
    level: str = "INFO",
    format_string: Optional[str] = None
) -> structlog.BoundLogger:
    """
    Setup structured logger.
    
    Args:
        name: Logger name
        level: Logging level
        format_string: Custom format string
    
    Returns:
        Configured logger
    """
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Get logger
    logger = structlog.get_logger(name)
    
    # Set level
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(numeric_level)
    
    return logger


def get_logger(name: str = "finance_app") -> structlog.BoundLogger:
    """
    Get a logger instance.
    
    Args:
        name: Logger name
    
    Returns:
        Logger instance
    """
    return structlog.get_logger(name)


def log_function_call(func: Callable) -> Callable:
    """
    Decorator to log function calls with parameters and execution time.
    
    Args:
        func: Function to decorate
    
    Returns:
        Decorated function
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = get_logger()
        
        # Log function entry
        logger.info(
            "Function called",
            function_name=func.__name__,
            module=func.__module__,
            args=args,
            kwargs=kwargs
        )
        
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            
            # Log successful completion
            execution_time = time.time() - start_time
            logger.info(
                "Function completed",
                function_name=func.__name__,
                execution_time=execution_time,
                success=True
            )
            
            return result
            
        except Exception as e:
            # Log error
            execution_time = time.time() - start_time
            logger.error(
                "Function failed",
                function_name=func.__name__,
                execution_time=execution_time,
                error=str(e),
                error_type=type(e).__name__,
                traceback=traceback.format_exc(),
                success=False
            )
            raise
    
    return wrapper


def log_performance(operation: str, start_time: Optional[float] = None):
    """
    Log performance metrics.
    
    Args:
        operation: Operation name
        start_time: Start time (if None, will use current time)
    """
    logger = get_logger()
    
    if start_time is None:
        start_time = time.time()
    
    execution_time = time.time() - start_time
    
    logger.info(
        "Performance metric",
        operation=operation,
        execution_time=execution_time,
        timestamp=datetime.now().isoformat()
    )


def log_error_with_context(
    error: Exception,
    context: Optional[Dict[str, Any]] = None,
    operation: Optional[str] = None
):
    """
    Log error with additional context.
    
    Args:
        error: Exception to log
        context: Additional context information
        operation: Operation that failed
    """
    logger = get_logger()
    
    log_data = {
        "error_message": str(error),
        "error_type": type(error).__name__,
        "traceback": traceback.format_exc(),
        "timestamp": datetime.now().isoformat()
    }
    
    if context:
        log_data["context"] = context
    
    if operation:
        log_data["operation"] = operation
    
    logger.error("Error occurred", **log_data)


def log_api_request(
    method: str,
    url: str,
    status_code: int,
    response_time: float,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None
):
    """
    Log API request details.
    
    Args:
        method: HTTP method
        url: Request URL
        status_code: HTTP status code
        response_time: Response time in seconds
        user_id: User ID (optional)
        request_id: Request ID (optional)
    """
    logger = get_logger()
    
    log_data = {
        "method": method,
        "url": url,
        "status_code": status_code,
        "response_time": response_time,
        "timestamp": datetime.now().isoformat()
    }
    
    if user_id:
        log_data["user_id"] = user_id
    
    if request_id:
        log_data["request_id"] = request_id
    
    # Determine log level based on status code
    if status_code >= 500:
        logger.error("API request failed", **log_data)
    elif status_code >= 400:
        logger.warning("API request client error", **log_data)
    else:
        logger.info("API request successful", **log_data)


def log_database_operation(
    operation: str,
    table: str,
    execution_time: float,
    rows_affected: Optional[int] = None,
    success: bool = True,
    error: Optional[str] = None
):
    """
    Log database operation details.
    
    Args:
        operation: Database operation (SELECT, INSERT, UPDATE, DELETE)
        table: Table name
        execution_time: Execution time in seconds
        rows_affected: Number of rows affected
        success: Whether operation was successful
        error: Error message if failed
    """
    logger = get_logger()
    
    log_data = {
        "operation": operation,
        "table": table,
        "execution_time": execution_time,
        "success": success,
        "timestamp": datetime.now().isoformat()
    }
    
    if rows_affected is not None:
        log_data["rows_affected"] = rows_affected
    
    if error:
        log_data["error"] = error
    
    if success:
        logger.info("Database operation completed", **log_data)
    else:
        logger.error("Database operation failed", **log_data)


def log_external_api_call(
    api_name: str,
    endpoint: str,
    status_code: int,
    response_time: float,
    success: bool = True,
    error: Optional[str] = None
):
    """
    Log external API call details.
    
    Args:
        api_name: Name of the external API
        endpoint: API endpoint
        status_code: HTTP status code
        response_time: Response time in seconds
        success: Whether call was successful
        error: Error message if failed
    """
    logger = get_logger()
    
    log_data = {
        "api_name": api_name,
        "endpoint": endpoint,
        "status_code": status_code,
        "response_time": response_time,
        "success": success,
        "timestamp": datetime.now().isoformat()
    }
    
    if error:
        log_data["error"] = error
    
    if success:
        logger.info("External API call successful", **log_data)
    else:
        logger.error("External API call failed", **log_data)


def log_business_event(
    event_type: str,
    event_data: Dict[str, Any],
    user_id: Optional[str] = None,
    severity: str = "INFO"
):
    """
    Log business events.
    
    Args:
        event_type: Type of business event
        event_data: Event data
        user_id: User ID (optional)
        severity: Log severity level
    """
    logger = get_logger()
    
    log_data = {
        "event_type": event_type,
        "event_data": event_data,
        "timestamp": datetime.now().isoformat()
    }
    
    if user_id:
        log_data["user_id"] = user_id
    
    if severity.upper() == "ERROR":
        logger.error("Business event", **log_data)
    elif severity.upper() == "WARNING":
        logger.warning("Business event", **log_data)
    else:
        logger.info("Business event", **log_data)


# Create a default logger instance for direct import
logger = get_logger("finance_app")






