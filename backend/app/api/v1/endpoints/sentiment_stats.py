from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Any, Optional
from datetime import datetime, timedelta

from app.api import deps
from app.models.blog import Post

router = APIRouter()

@router.get("/history", response_model=Any)
def get_sentiment_history(
    period: str = Query("24h", description="Time period (24h, 7d, 30d, 1y)"),
    interval: str = Query("1h", description="Grouping interval (1h, 4h, 1d)"),
    db: Session = Depends(deps.get_current_db)
):
    """
    Get aggregated news sentiment history.
    """
    # 1. Calculate Start Date
    now = datetime.utcnow()
    if period == "1h":
        start_date = now - timedelta(hours=1)
    elif period == "4h":
        start_date = now - timedelta(hours=4)
    elif period == "8h":
        start_date = now - timedelta(hours=8)
    elif period == "24h":
        start_date = now - timedelta(hours=24)
    elif period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    elif period == "1y":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(hours=24)

    # 2. Determine Time Bucket for SQL
    # Postgres date_trunc format
    # For 4h, 8h, we fetch 'hour' data and aggregate in Python to avoid complex SQL
    
    sql_interval = 'hour'
    needs_aggregation = False
    agg_hours = 1

    if interval == '1h':
        sql_interval = 'hour'
    elif interval == '4h':
        sql_interval = 'hour'
        needs_aggregation = True
        agg_hours = 4
    elif interval == '8h':
        sql_interval = 'hour'
        needs_aggregation = True
        agg_hours = 8
    elif interval == '1d' or interval == '24h':
        sql_interval = 'day'
    elif interval == '1w' or interval == '7d':
        sql_interval = 'week'
    elif interval == '1M' or interval == '30d':
        sql_interval = 'month'

    # 3. Query
    query = text(f"""
        SELECT 
            date_trunc(:interval, published_at) as time_bucket,
            AVG(CAST(post_info->'sentiment'->>'score' AS FLOAT)) as avg_score,
            COUNT(*) as total_count,
            SUM(CASE WHEN post_info->'sentiment'->>'label' = 'positive' THEN 1 ELSE 0 END) as pos_count,
            SUM(CASE WHEN post_info->'sentiment'->>'label' = 'negative' THEN 1 ELSE 0 END) as neg_count,
            SUM(CASE WHEN post_info->'sentiment'->>'label' = 'neutral' THEN 1 ELSE 0 END) as neu_count
        FROM posts
        WHERE post_type = 'raw_news'
          AND published_at >= :start_date
          AND post_info->'sentiment' IS NOT NULL
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
    """)
    
    rows = db.execute(query, {"interval": sql_interval, "start_date": start_date}).fetchall()
    
    # 4. Process Results
    results = []
    
    if needs_aggregation:
        # Dictionary to hold aggregated buckets: key=timestamp_start
        buckets = {}
        
        for r in rows:
            dt: datetime = r[0]
            if not dt: continue
            
            # Round down to nearest agg_hours
            # total hours since epoch or just trim query hour?
            # Easiest: (dt.hour // agg_hours) * agg_hours
            base_hour = (dt.hour // agg_hours) * agg_hours
            bucket_dt = dt.replace(hour=base_hour, minute=0, second=0, microsecond=0)
            
            key = bucket_dt.isoformat()
            
            if key not in buckets:
                buckets[key] = {
                    "score_sum": 0.0,
                    "total_count": 0,
                    "pos": 0, "neg": 0, "neu": 0
                }
            
            # Weighted average prep
            rows_count = r[2]
            avg_s = r[1] or 0.5
            
            buckets[key]["score_sum"] += avg_s * rows_count
            buckets[key]["total_count"] += rows_count
            buckets[key]["pos"] += r[3]
            buckets[key]["neg"] += r[4]
            buckets[key]["neu"] += r[5]
            
        # Convert buckets to result list
        for time_key in sorted(buckets.keys()):
            b = buckets[time_key]
            
            # Weighted Avg Score
            final_avg = b["score_sum"] / b["total_count"] if b["total_count"] > 0 else 0.5
            
            results.append({
                "time": time_key,
                "avg_score": final_avg,
                "total_count": b["total_count"],
                "sentiment_counts": {
                    "positive": b["pos"],
                    "negative": b["neg"],
                    "neutral": b["neu"]
                }
            })
            
    else:
        # Direct Mapping
        for r in rows:
            results.append({
                "time": r[0].isoformat() if r[0] else None,
                "avg_score": r[1],
                "total_count": r[2],
                "sentiment_counts": {
                    "positive": r[3],
                    "negative": r[4],
                    "neutral": r[5]
                }
            })
        
    return results
