"""
Data validation utility functions.
"""
import re
from datetime import datetime, timedelta
from typing import Optional, Union, List, Dict, Any
from decimal import Decimal


def validate_email(email: str) -> bool:
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not email:
        return False
    
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_url(url: str) -> bool:
    """
    Validate URL format.
    
    Args:
        url: URL to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not url:
        return False
    
    # Basic URL regex pattern
    pattern = r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?$'
    return bool(re.match(pattern, url))


def validate_phone(phone: str) -> bool:
    """
    Validate phone number format.
    
    Args:
        phone: Phone number to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not phone:
        return False
    
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    
    # Check if it's a valid length (7-15 digits)
    return 7 <= len(digits_only) <= 15


def validate_ticker(ticker: str) -> bool:
    """
    Validate stock/crypto ticker symbol.
    
    Args:
        ticker: Ticker symbol to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not ticker:
        return False
    
    # Ticker should be 1-10 characters, alphanumeric
    pattern = r'^[A-Z0-9]{1,10}$'
    return bool(re.match(pattern, ticker.upper()))


def validate_currency(currency: str) -> bool:
    """
    Validate currency code.
    
    Args:
        currency: Currency code to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not currency:
        return False
    
    # Currency should be 3 uppercase letters
    pattern = r'^[A-Z]{3}$'
    return bool(re.match(pattern, currency.upper()))


def validate_date_range(
    start_date: Union[datetime, str],
    end_date: Union[datetime, str],
    max_days: Optional[int] = None
) -> bool:
    """
    Validate date range.
    
    Args:
        start_date: Start date
        end_date: End date
        max_days: Maximum allowed days between dates
    
    Returns:
        True if valid, False otherwise
    """
    try:
        # Convert to datetime if strings
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Check if start_date is before end_date
        if start_date >= end_date:
            return False
        
        # Check maximum days if specified
        if max_days is not None:
            days_diff = (end_date - start_date).days
            if days_diff > max_days:
                return False
        
        return True
        
    except (ValueError, TypeError):
        return False


def validate_market_cap_range(
    min_market_cap: Optional[Union[float, Decimal]],
    max_market_cap: Optional[Union[float, Decimal]]
) -> bool:
    """
    Validate market cap range.
    
    Args:
        min_market_cap: Minimum market cap
        max_market_cap: Maximum market cap
    
    Returns:
        True if valid, False otherwise
    """
    # Convert to float for comparison
    min_val = float(min_market_cap) if min_market_cap is not None else None
    max_val = float(max_market_cap) if max_market_cap is not None else None
    
    # Check if values are positive
    if min_val is not None and min_val < 0:
        return False
    if max_val is not None and max_val < 0:
        return False
    
    # Check if min is less than max
    if min_val is not None and max_val is not None and min_val >= max_val:
        return False
    
    return True


def validate_price_range(
    min_price: Optional[Union[float, Decimal]],
    max_price: Optional[Union[float, Decimal]]
) -> bool:
    """
    Validate price range.
    
    Args:
        min_price: Minimum price
        max_price: Maximum price
    
    Returns:
        True if valid, False otherwise
    """
    # Convert to float for comparison
    min_val = float(min_price) if min_price is not None else None
    max_val = float(max_price) if max_price is not None else None
    
    # Check if values are positive
    if min_val is not None and min_val < 0:
        return False
    if max_val is not None and max_val < 0:
        return False
    
    # Check if min is less than max
    if min_val is not None and max_val is not None and min_val >= max_val:
        return False
    
    return True


def validate_percentage_range(
    min_percentage: Optional[Union[float, Decimal]],
    max_percentage: Optional[Union[float, Decimal]]
) -> bool:
    """
    Validate percentage range.
    
    Args:
        min_percentage: Minimum percentage
        max_percentage: Maximum percentage
    
    Returns:
        True if valid, False otherwise
    """
    # Convert to float for comparison
    min_val = float(min_percentage) if min_percentage is not None else None
    max_val = float(max_percentage) if max_percentage is not None else None
    
    # Check if values are within valid percentage range (-100 to 100)
    if min_val is not None and (min_val < -100 or min_val > 100):
        return False
    if max_val is not None and (max_val < -100 or max_val > 100):
        return False
    
    # Check if min is less than max
    if min_val is not None and max_val is not None and min_val >= max_val:
        return False
    
    return True


def validate_pagination_params(
    page: int,
    size: int,
    max_size: int = 100
) -> bool:
    """
    Validate pagination parameters.
    
    Args:
        page: Page number
        size: Page size
        max_size: Maximum allowed page size
    
    Returns:
        True if valid, False otherwise
    """
    # Check if page is positive
    if page < 1:
        return False
    
    # Check if size is within valid range
    if size < 1 or size > max_size:
        return False
    
    return True


def validate_sort_params(
    sort_by: Optional[str],
    sort_order: str,
    allowed_fields: Optional[List[str]] = None
) -> bool:
    """
    Validate sorting parameters.
    
    Args:
        sort_by: Field to sort by
        sort_order: Sort order (asc/desc)
        allowed_fields: List of allowed sort fields
    
    Returns:
        True if valid, False otherwise
    """
    # Check sort order
    if sort_order.lower() not in ['asc', 'desc']:
        return False
    
    # Check if sort_by is in allowed fields if specified
    if allowed_fields is not None and sort_by is not None:
        if sort_by not in allowed_fields:
            return False
    
    return True


def validate_uuid(uuid_str: str) -> bool:
    """
    Validate UUID format.
    
    Args:
        uuid_str: UUID string to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not uuid_str:
        return False
    
    # UUID regex pattern
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, uuid_str.lower()))


def validate_iso_date(date_str: str) -> bool:
    """
    Validate ISO date format (YYYY-MM-DD).
    
    Args:
        date_str: Date string to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not date_str:
        return False
    
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False


def validate_iso_datetime(datetime_str: str) -> bool:
    """
    Validate ISO datetime format.
    
    Args:
        datetime_str: Datetime string to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not datetime_str:
        return False
    
    # Try common ISO formats
    formats = [
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%Y-%m-%d %H:%M:%S'
    ]
    
    for fmt in formats:
        try:
            datetime.strptime(datetime_str, fmt)
            return True
        except ValueError:
            continue
    
    return False


def validate_asset_type(asset_type: str) -> bool:
    """
    Validate asset type.
    
    Args:
        asset_type: Asset type to validate
    
    Returns:
        True if valid, False otherwise
    """
    valid_types = ['stock', 'crypto', 'etf', 'bond', 'commodity', 'forex', 'real_estate']
    return asset_type.lower() in valid_types


def validate_exchange(exchange: str) -> bool:
    """
    Validate exchange name.
    
    Args:
        exchange: Exchange name to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not exchange:
        return False
    
    # Exchange should be 1-20 characters, alphanumeric and spaces
    pattern = r'^[A-Za-z0-9\s]{1,20}$'
    return bool(re.match(pattern, exchange))


def validate_sector(sector: str) -> bool:
    """
    Validate sector name.
    
    Args:
        sector: Sector name to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not sector:
        return False
    
    # Sector should be 1-50 characters, alphanumeric and spaces
    pattern = r'^[A-Za-z0-9\s]{1,50}$'
    return bool(re.match(pattern, sector))


def validate_country_code(country_code: str) -> bool:
    """
    Validate country code (ISO 3166-1 alpha-2).
    
    Args:
        country_code: Country code to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not country_code:
        return False
    
    # Country code should be 2 uppercase letters
    pattern = r'^[A-Z]{2}$'
    return bool(re.match(pattern, country_code.upper()))






