import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Set

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.external_apis.implementations.macrotrends_client import MacrotrendsClient
from app.models import MacrotrendsFinancial


log = logging.getLogger(__name__)


def _index_by_field_name(rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {str(r.get("field_name", "")).strip(): r for r in rows}


def _collect_all_dates(rows_list: List[List[Dict[str, Any]]]) -> Set[str]:
    dates: Set[str] = set()
    for rows in rows_list:
        for r in rows or []:
            for k in r.keys():
                if len(k) == 10 and k[4] == '-' and k[7] == '-':
                    dates.add(k)
    return dates


def _get_value(rec: Optional[Dict[str, Any]], date_key: str) -> Optional[float]:
    if not rec:
        return None
    v = rec.get(date_key)
    if v is None:
        return None
    try:
        return float(v)
    except Exception:
        return None


async def ingest_stock_financials(db: Session, asset_id: int, ticker: str) -> int:
    """
    Scrape Macrotrends sections and insert mapped rows into stock_financials.
    Returns number of rows inserted.
    """
    client = MacrotrendsClient()

    income = await client.get_income_statement(ticker.upper(), ticker.lower()) or []
    balance = await client.get_balance_sheet(ticker.upper(), ticker.lower()) or []
    cash = await client.get_cash_flow(ticker.upper(), ticker.lower()) or []
    ratios = await client.get_financial_ratios(ticker.upper(), ticker.lower()) or []

    income_idx = _index_by_field_name(income)
    ratios_idx = _index_by_field_name(ratios)

    all_dates = sorted(_collect_all_dates([income, balance, cash, ratios]))
    inserted = 0

    for d in all_dates:
        try:
            snapshot_date = datetime.strptime(d, "%Y-%m-%d").date()

            def insert_section(section_name: str, rows: List[Dict[str, Any]]):
                nonlocal inserted
                for r in rows:
                    fname = str(r.get("field_name", "")).strip()
                    raw = r.get(d)
                    if raw is None or raw == "":
                        value_numeric = None
                        value_text = None if raw is None else ""
                    else:
                        try:
                            value_numeric = float(raw)
                            value_text = None
                        except Exception:
                            value_numeric = None
                            value_text = str(raw)

                    # skip if both None and empty text
                    if value_numeric is None and (value_text is None or value_text == ""):
                        continue

                    exists = db.query(MacrotrendsFinancial).filter(
                        and_(
                            MacrotrendsFinancial.asset_id == asset_id,
                            MacrotrendsFinancial.section == section_name,
                            MacrotrendsFinancial.field_name == fname,
                            MacrotrendsFinancial.snapshot_date == snapshot_date,
                        )
                    ).first()
                    if exists:
                        return

                    db.add(MacrotrendsFinancial(
                        asset_id=asset_id,
                        section=section_name,
                        field_name=fname,
                        snapshot_date=snapshot_date,
                        value_numeric=value_numeric,
                        value_text=value_text,
                        unit=None,
                        currency=None,
                        source_url=None,
                    ))
                    inserted += 1

            insert_section("income", income)
            insert_section("balance", balance)
            insert_section("cash-flow", cash)
            insert_section("ratios", ratios)
        except Exception as e:
            log.error(f"Insert failed for {ticker} {d}: {e}")
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        log.error(f"DB commit failed: {e}")
        return 0
    return inserted


