"""
General helper utility functions.
"""
import uuid
import random
import string
import math
import statistics
from datetime import datetime, timedelta, time
from typing import Optional, Union, List, Tuple, Any
from decimal import Decimal


def safe_float(value: Any, default: Optional[float] = None) -> Optional[float]:
    """
    Safely convert value to float.
    
    Args:
        value: Value to convert
        default: Default value if conversion fails
    
    Returns:
        Float value or default
    """
    if value is None:
        return default
    
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    """
    Safely convert value to integer.
    
    Args:
        value: Value to convert
        default: Default value if conversion fails
    
    Returns:
        Integer value or default
    """
    if value is None:
        return default
    
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default


def safe_string(value: Any, default: str = "") -> str:
    """
    Safely convert value to string.
    
    Args:
        value: Value to convert
        default: Default value if conversion fails
    
    Returns:
        String value or default
    """
    if value is None:
        return default
    
    try:
        return str(value)
    except Exception:
        return default


def safe_boolean(value: Any, default: bool = False) -> bool:
    """
    Safely convert value to boolean.
    
    Args:
        value: Value to convert
        default: Default value if conversion fails
    
    Returns:
        Boolean value or default
    """
    if value is None:
        return default
    
    if isinstance(value, bool):
        return value
    
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on', 't', 'y')
    
    if isinstance(value, (int, float)):
        return value != 0
    
    return default


def safe_date_parse(
    date_str: str, 
    fmt: str = '%Y-%m-%d', 
    default: Optional[datetime] = None
) -> Optional[datetime]:
    """
    Safely parse date string.
    
    Args:
        date_str: Date string to parse
        fmt: Date format string
        default: Default value if parsing fails
    
    Returns:
        Datetime object or default
    """
    if not date_str:
        return default
    
    try:
        return datetime.strptime(date_str, fmt)
    except ValueError:
        return default


def safe_datetime_parse(
    datetime_str: Any, 
    fmt: str = '%Y-%m-%d %H:%M:%S', 
    default: Optional[datetime] = None
) -> Optional[datetime]:
    """
    Safely parse datetime string.
    
    Args:
        datetime_str: Datetime string to parse
        fmt: Datetime format string
        default: Default value if parsing fails
    
    Returns:
        Datetime object or default
    """
    if not datetime_str:
        return default
    
    try:
        if isinstance(datetime_str, datetime):
            return datetime_str
        return datetime.strptime(str(datetime_str), fmt)
    except ValueError:
        return default


def generate_uuid() -> str:
    """
    Generate a UUID string.
    
    Returns:
        UUID string
    """
    return str(uuid.uuid4())


def generate_random_string(length: int = 8, include_digits: bool = True) -> str:
    """
    Generate a random string.
    
    Args:
        length: Length of the string
        include_digits: Whether to include digits
    
    Returns:
        Random string
    """
    chars = string.ascii_letters
    if include_digits:
        chars += string.digits
    
    return ''.join(random.choice(chars) for _ in range(length))


def calculate_percentage_change(old_value: float, new_value: float) -> float:
    """
    Calculate percentage change between two values.
    
    Args:
        old_value: Old value
        new_value: New value
    
    Returns:
        Percentage change as decimal (e.g., 0.05 for 5%)
    """
    if old_value == 0:
        return 0.0
    
    return (new_value - old_value) / old_value


def calculate_compound_growth(
    initial_value: float, 
    final_value: float, 
    periods: int
) -> float:
    """
    Calculate compound annual growth rate (CAGR).
    
    Args:
        initial_value: Initial value
        final_value: Final value
        periods: Number of periods
    
    Returns:
        CAGR as decimal
    """
    if initial_value <= 0 or periods <= 0:
        return 0.0
    
    return (final_value / initial_value) ** (1 / periods) - 1


def calculate_volatility(prices: List[float]) -> float:
    """
    Calculate price volatility (standard deviation of returns).
    
    Args:
        prices: List of prices
    
    Returns:
        Volatility as decimal
    """
    if len(prices) < 2:
        return 0.0
    
    # Calculate returns
    returns = []
    for i in range(1, len(prices)):
        if prices[i-1] != 0:
            returns.append((prices[i] - prices[i-1]) / prices[i-1])
    
    if len(returns) < 2:
        return 0.0
    
    return statistics.stdev(returns)


def calculate_correlation(x_values: List[float], y_values: List[float]) -> float:
    """
    Calculate correlation coefficient between two lists.
    
    Args:
        x_values: First list of values
        y_values: Second list of values
    
    Returns:
        Correlation coefficient (-1 to 1)
    """
    if len(x_values) != len(y_values) or len(x_values) < 2:
        return 0.0
    
    try:
        return statistics.correlation(x_values, y_values)
    except statistics.StatisticsError:
        return 0.0


def calculate_sharpe_ratio(
    returns: List[float], 
    risk_free_rate: float = 0.02
) -> float:
    """
    Calculate Sharpe ratio.
    
    Args:
        returns: List of returns
        risk_free_rate: Risk-free rate (annual)
    
    Returns:
        Sharpe ratio
    """
    if len(returns) < 2:
        return 0.0
    
    try:
        avg_return = statistics.mean(returns)
        std_return = statistics.stdev(returns)
        
        if std_return == 0:
            return 0.0
        
        # Annualize (assuming daily returns)
        annualized_return = avg_return * 252
        annualized_volatility = std_return * math.sqrt(252)
        
        return (annualized_return - risk_free_rate) / annualized_volatility
    except statistics.StatisticsError:
        return 0.0


def calculate_max_drawdown(prices: List[float]) -> float:
    """
    Calculate maximum drawdown.
    
    Args:
        prices: List of prices
    
    Returns:
        Maximum drawdown as decimal
    """
    if len(prices) < 2:
        return 0.0
    
    max_dd = 0.0
    peak = prices[0]
    
    for price in prices:
        if price > peak:
            peak = price
        else:
            dd = (peak - price) / peak
            max_dd = max(max_dd, dd)
    
    return max_dd


def get_time_period_days(period: str) -> int:
    """
    Get number of days for a time period.
    
    Args:
        period: Time period string (1d, 1w, 1m, 3m, 6m, 1y, 5y)
    
    Returns:
        Number of days
    """
    period_map = {
        '1d': 1,
        '1w': 7,
        '1m': 30,
        '3m': 90,
        '6m': 180,
        '1y': 365,
        '5y': 1825
    }
    
    return period_map.get(period.lower(), 30)


def is_market_open() -> bool:
    """
    Check if US stock market is currently open.
    
    Returns:
        True if market is open, False otherwise
    """
    now = datetime.now()
    
    # Check if it's a weekday
    if now.weekday() >= 5:  # Saturday = 5, Sunday = 6
        return False
    
    # Check if it's within market hours (9:30 AM - 4:00 PM ET)
    # Note: This is a simplified check. In production, you'd want to account for:
    # - Timezone differences
    # - Market holidays
    # - Early close days
    # - Pre-market and after-hours trading
    
    market_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close = now.replace(hour=16, minute=0, second=0, microsecond=0)
    
    return market_open <= now <= market_close


def get_next_market_open() -> datetime:
    """
    Get the next market open time.
    
    Returns:
        Next market open datetime
    """
    now = datetime.now()
    
    # If it's currently a weekend, move to next Monday
    while now.weekday() >= 5:
        now += timedelta(days=1)
        now = now.replace(hour=9, minute=30, second=0, microsecond=0)
    
    # If it's currently before market open today
    market_open_today = now.replace(hour=9, minute=30, second=0, microsecond=0)
    if now < market_open_today:
        return market_open_today
    
    # Otherwise, move to next business day
    next_day = now + timedelta(days=1)
    while next_day.weekday() >= 5:
        next_day += timedelta(days=1)
    
    return next_day.replace(hour=9, minute=30, second=0, microsecond=0)


def get_previous_market_close() -> datetime:
    """
    Get the previous market close time.
    
    Returns:
        Previous market close datetime
    """
    now = datetime.now()
    
    # If it's currently a weekend, move to previous Friday
    while now.weekday() >= 5:
        now -= timedelta(days=1)
        now = now.replace(hour=16, minute=0, second=0, microsecond=0)
    
    # If it's currently after market close today
    market_close_today = now.replace(hour=16, minute=0, second=0, microsecond=0)
    if now > market_close_today:
        return market_close_today
    
    # Otherwise, move to previous business day
    prev_day = now - timedelta(days=1)
    while prev_day.weekday() >= 5:
        prev_day -= timedelta(days=1)
    
    return prev_day.replace(hour=16, minute=0, second=0, microsecond=0)


def normalize_timestamp_to_date(ts: datetime) -> datetime:
    """
    Removes the time component from a datetime object, normalizing it to midnight UTC.
    
    This function is used to ensure that all daily OHLCV data for the same date
    has the same timestamp, preventing duplicate records for the same trading day.
    
    Args:
        ts: Datetime object to normalize
        
    Returns:
        Datetime object with time set to 00:00:00
        
    Example:
        >>> original_ts = datetime(2025, 9, 5, 15, 30, 0)
        >>> normalized_ts = normalize_timestamp_to_date(original_ts)
        >>> print(normalized_ts)
        2025-09-05 00:00:00
    """
    if not isinstance(ts, datetime):
        raise ValueError("Input must be a datetime object")
    
    return datetime.combine(ts.date(), time(0, 0, 0))


def normalize_timestamp_to_trading_hour(ts: datetime, hour: int = 9) -> datetime:
    """
    Normalizes a datetime object to a specific hour (default 9 AM) for trading day consistency.
    
    This function is used when you want to maintain a consistent time for daily data
    but not necessarily midnight. Useful for aligning with market opening hours.
    
    Args:
        ts: Datetime object to normalize
        hour: Hour to set (0-23, default 9 for 9 AM)
        
    Returns:
        Datetime object with time set to specified hour
        
    Example:
        >>> original_ts = datetime(2025, 9, 5, 15, 30, 0)
        >>> normalized_ts = normalize_timestamp_to_trading_hour(original_ts, 9)
        >>> print(normalized_ts)
        2025-09-05 09:00:00
    """
    if not isinstance(ts, datetime):
        raise ValueError("Input must be a datetime object")
    
    if not 0 <= hour <= 23:
        raise ValueError("Hour must be between 0 and 23")
    
    return datetime.combine(ts.date(), time(hour, 0, 0))




