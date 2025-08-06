"""
Data formatting utility functions.
"""
import re
from datetime import datetime, timedelta
from typing import Optional, Union
from decimal import Decimal, ROUND_HALF_UP


def format_currency(
    value: Union[float, Decimal, int, str], 
    currency: str = "USD", 
    decimal_places: int = 2,
    show_symbol: bool = True
) -> str:
    """
    Format a number as currency.
    
    Args:
        value: The value to format
        currency: Currency code (USD, EUR, KRW, etc.)
        decimal_places: Number of decimal places
        show_symbol: Whether to show currency symbol
    
    Returns:
        Formatted currency string
    """
    if value is None:
        return "N/A"
    
    try:
        # Convert to Decimal for precise formatting
        decimal_value = Decimal(str(value))
        
        # Round to specified decimal places
        rounded_value = decimal_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Format based on currency
        if currency.upper() == "USD":
            if show_symbol:
                return f"${rounded_value:,.{decimal_places}f}"
            else:
                return f"{rounded_value:,.{decimal_places}f}"
        elif currency.upper() == "KRW":
            if show_symbol:
                return f"₩{rounded_value:,.0f}"
            else:
                return f"{rounded_value:,.0f}"
        elif currency.upper() == "EUR":
            if show_symbol:
                return f"€{rounded_value:,.{decimal_places}f}"
            else:
                return f"{rounded_value:,.{decimal_places}f}"
        else:
            if show_symbol:
                return f"{currency} {rounded_value:,.{decimal_places}f}"
            else:
                return f"{rounded_value:,.{decimal_places}f}"
    except (ValueError, TypeError):
        return "N/A"


def format_percentage(
    value: Union[float, Decimal, int, str], 
    decimal_places: int = 2,
    show_sign: bool = True
) -> str:
    """
    Format a number as percentage.
    
    Args:
        value: The value to format (as decimal, e.g., 0.05 for 5%)
        decimal_places: Number of decimal places
        show_sign: Whether to show + sign for positive values
    
    Returns:
        Formatted percentage string
    """
    if value is None:
        return "N/A"
    
    try:
        decimal_value = Decimal(str(value))
        percentage = decimal_value * 100
        
        if show_sign and percentage > 0:
            return f"+{percentage:.{decimal_places}f}%"
        else:
            return f"{percentage:.{decimal_places}f}%"
    except (ValueError, TypeError):
        return "N/A"


def format_number(
    value: Union[float, Decimal, int, str], 
    decimal_places: int = 2,
    use_commas: bool = True
) -> str:
    """
    Format a number with optional commas and decimal places.
    
    Args:
        value: The value to format
        decimal_places: Number of decimal places
        use_commas: Whether to use comma separators
    
    Returns:
        Formatted number string
    """
    if value is None:
        return "N/A"
    
    try:
        decimal_value = Decimal(str(value))
        
        if use_commas:
            return f"{decimal_value:,.{decimal_places}f}"
        else:
            return f"{decimal_value:.{decimal_places}f}"
    except (ValueError, TypeError):
        return "N/A"


def format_market_cap(value: Union[float, Decimal, int, str]) -> str:
    """
    Format market capitalization with appropriate suffix.
    
    Args:
        value: Market cap value
    
    Returns:
        Formatted market cap string (e.g., "1.5T", "750B", "500M")
    """
    if value is None or value == 0:
        return "N/A"
    
    try:
        decimal_value = Decimal(str(value))
        
        if decimal_value >= 1e12:
            return f"${decimal_value / 1e12:.1f}T"
        elif decimal_value >= 1e9:
            return f"${decimal_value / 1e9:.1f}B"
        elif decimal_value >= 1e6:
            return f"${decimal_value / 1e6:.1f}M"
        elif decimal_value >= 1e3:
            return f"${decimal_value / 1e3:.1f}K"
        else:
            return f"${decimal_value:.0f}"
    except (ValueError, TypeError):
        return "N/A"


def format_volume(value: Union[float, Decimal, int, str]) -> str:
    """
    Format trading volume with appropriate suffix.
    
    Args:
        value: Volume value
    
    Returns:
        Formatted volume string (e.g., "1.5B", "750M", "500K")
    """
    if value is None or value == 0:
        return "N/A"
    
    try:
        decimal_value = Decimal(str(value))
        
        if decimal_value >= 1e9:
            return f"{decimal_value / 1e9:.1f}B"
        elif decimal_value >= 1e6:
            return f"{decimal_value / 1e6:.1f}M"
        elif decimal_value >= 1e3:
            return f"{decimal_value / 1e3:.1f}K"
        else:
            return f"{decimal_value:.0f}"
    except (ValueError, TypeError):
        return "N/A"


def format_timestamp(
    timestamp: Union[datetime, str], 
    format_str: str = "%Y-%m-%d %H:%M:%S",
    timezone: Optional[str] = None
) -> str:
    """
    Format timestamp to string.
    
    Args:
        timestamp: Datetime object or string
        format_str: Format string
        timezone: Timezone string (optional)
    
    Returns:
        Formatted timestamp string
    """
    if timestamp is None:
        return "N/A"
    
    try:
        if isinstance(timestamp, str):
            # Try to parse common formats
            for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"]:
                try:
                    timestamp = datetime.strptime(timestamp, fmt)
                    break
                except ValueError:
                    continue
            else:
                return "Invalid Date"
        
        if isinstance(timestamp, datetime):
            return timestamp.strftime(format_str)
        else:
            return "Invalid Date"
    except Exception:
        return "Invalid Date"


def format_duration(seconds: Union[int, float]) -> str:
    """
    Format duration in seconds to human readable string.
    
    Args:
        seconds: Duration in seconds
    
    Returns:
        Formatted duration string (e.g., "2h 30m 15s")
    """
    if seconds is None or seconds < 0:
        return "N/A"
    
    try:
        seconds = int(seconds)
        
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            minutes = seconds // 60
            remaining_seconds = seconds % 60
            return f"{minutes}m {remaining_seconds}s"
        elif seconds < 86400:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}h {minutes}m"
        else:
            days = seconds // 86400
            hours = (seconds % 86400) // 3600
            return f"{days}d {hours}h"
    except (ValueError, TypeError):
        return "N/A"


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text to specified length with suffix.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add when truncated
    
    Returns:
        Truncated text
    """
    if text is None:
        return ""
    
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix






