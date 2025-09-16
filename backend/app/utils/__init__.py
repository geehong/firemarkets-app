"""
Utility functions for the application.
"""

from .formatters import *
from .helpers import *
from .logger import *
from .validators import *

__all__ = [
    # Formatters
    "format_currency",
    "format_percentage",
    "format_number",
    "format_market_cap",
    "format_volume",
    "format_timestamp",
    "format_duration",
    "truncate_text",
    
    # Helpers
    "safe_float",
    "safe_int",
    "safe_string",
    "safe_boolean",
    "safe_date_parse",
    "safe_datetime_parse",
    "generate_uuid",
    "generate_random_string",
    "calculate_percentage_change",
    "calculate_compound_growth",
    "calculate_volatility",
    "calculate_correlation",
    "calculate_sharpe_ratio",
    "calculate_max_drawdown",
    "get_time_period_days",
    "is_market_open",
    "get_next_market_open",
    "get_previous_market_close",
    
    # Logger
    "setup_logger",
    "get_logger",
    "log_function_call",
    "log_performance",
    "log_error_with_context",
    
    # Validators
    "validate_email",
    "validate_url",
    "validate_phone",
    "validate_ticker",
    "validate_currency",
    "validate_date_range",
    "validate_market_cap_range",
    "validate_price_range",
    "validate_percentage_range",
    "validate_pagination_params",
    "validate_sort_params",
]






