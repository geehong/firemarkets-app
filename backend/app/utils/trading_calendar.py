"""
Trading Calendar Utilities
거래일 관련 유틸리티 함수들
"""
from datetime import datetime, timedelta
from typing import List, Tuple
import holidays


def is_trading_day(date: datetime, country: str = 'US') -> bool:
    """
    주어진 날짜가 거래일인지 확인
    
    Args:
        date: 확인할 날짜
        country: 국가 코드 (기본값: 'US')
    
    Returns:
        bool: 거래일이면 True, 휴일이면 False
    """
    # 주말 체크 (토요일=5, 일요일=6)
    if date.weekday() >= 5:
        return False
    
    # 공휴일 체크
    try:
        if country == 'US':
            us_holidays = holidays.US()
            if date.date() in us_holidays:
                return False
        # 다른 국가 추가 가능
    except Exception:
        # holidays 라이브러리가 없으면 주말만 체크
        pass
    
    return True


def get_last_trading_day(date: datetime, country: str = 'US') -> datetime:
    """
    주어진 날짜 이전의 마지막 거래일을 반환
    
    Args:
        date: 기준 날짜
        country: 국가 코드
    
    Returns:
        datetime: 마지막 거래일
    """
    current_date = date
    while not is_trading_day(current_date, country):
        current_date -= timedelta(days=1)
    return current_date


def get_next_trading_day(date: datetime, country: str = 'US') -> datetime:
    """
    주어진 날짜 이후의 다음 거래일을 반환
    
    Args:
        date: 기준 날짜
        country: 국가 코드
    
    Returns:
        datetime: 다음 거래일
    """
    current_date = date + timedelta(days=1)
    while not is_trading_day(current_date, country):
        current_date += timedelta(days=1)
    return current_date


def get_trading_days_in_range(start_date: datetime, end_date: datetime, country: str = 'US') -> List[datetime]:
    """
    주어진 날짜 범위 내의 모든 거래일을 반환
    
    Args:
        start_date: 시작 날짜
        end_date: 종료 날짜
        country: 국가 코드
    
    Returns:
        List[datetime]: 거래일 목록
    """
    trading_days = []
    current_date = start_date
    
    while current_date <= end_date:
        if is_trading_day(current_date, country):
            trading_days.append(current_date)
        current_date += timedelta(days=1)
    
    return trading_days


def get_optimal_date_range_for_collection(end_date: datetime, days_back: int = 3, country: str = 'US') -> Tuple[datetime, datetime]:
    """
    데이터 수집에 최적화된 날짜 범위를 반환
    
    Args:
        end_date: 종료 날짜
        days_back: 몇 일 전까지 수집할지
        country: 국가 코드
    
    Returns:
        Tuple[datetime, datetime]: (시작일, 종료일)
    """
    # 종료일이 거래일이 아니면 마지막 거래일로 조정
    if not is_trading_day(end_date, country):
        end_date = get_last_trading_day(end_date, country)
    
    # 시작일 계산 (거래일 기준으로 days_back만큼)
    start_date = end_date
    trading_days_count = 0
    
    while trading_days_count < days_back:
        start_date -= timedelta(days=1)
        if is_trading_day(start_date, country):
            trading_days_count += 1
    
    return start_date, end_date


def format_trading_status_message(date: datetime, country: str = 'US') -> str:
    """
    거래일 상태에 따른 메시지를 반환
    
    Args:
        date: 확인할 날짜
        country: 국가 코드
    
    Returns:
        str: 상태 메시지
    """
    if not is_trading_day(date, country):
        if date.weekday() >= 5:
            return f"주말입니다 ({date.strftime('%Y-%m-%d %A')})"
        else:
            return f"공휴일입니다 ({date.strftime('%Y-%m-%d')})"
    else:
        return f"거래일입니다 ({date.strftime('%Y-%m-%d %A')})"
















