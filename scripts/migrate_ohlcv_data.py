#!/usr/bin/env python3
import os
import sys
import math
import time
from typing import List, Optional

import mysql.connector
import psycopg2
from psycopg2.extras import execute_values


MYSQL_CFG = dict(
    host=os.getenv("DB_HOSTNAME", "db"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USERNAME", "geehong"),
    password=os.getenv("DB_PASSWORD", "Power6100"),
    database=os.getenv("DB_DATABASE", "markets"),
)

PG_CFG = dict(
    host=os.getenv("DB_HOSTNAME_PG", "db_postgres"),
    port=int(os.getenv("DB_PORT_PG", "5432")),
    user=os.getenv("DB_USERNAME_PG", "geehong"),
    password=os.getenv("DB_PASSWORD_PG", "Power6100"),
    dbname=os.getenv("DB_DATABASE_PG", "markets"),
)

BATCH_SIZE = int(os.getenv("MIGRATE_BATCH_SIZE", "10000"))


def log(msg: str) -> None:
    print(msg, flush=True)


def copy_table(
    cur_my,
    cur_pg,
    table: str,
    columns: List[str],
    order_by: str,
    conflict_cols: Optional[List[str]] = None,
    update_cols: Optional[List[str]] = None,
    row_transform: Optional[callable] = None,
    values_template: Optional[str] = None,
) -> None:
    cur_my.execute(f"SELECT COUNT(*) FROM {table}")
    total = cur_my.fetchone()[0]
    log(f"[{table}] 총 {total}건")
    if total == 0:
        return

    pages = math.ceil(total / BATCH_SIZE)
    select_cols = ", ".join(columns)
    insert_cols = ", ".join(columns)

    for page in range(pages):
        offset = page * BATCH_SIZE
        cur_my.execute(
            f"SELECT {select_cols} FROM {table} ORDER BY {order_by} LIMIT {BATCH_SIZE} OFFSET {offset}"
        )
        rows = cur_my.fetchall()
        if not rows:
            break
        if row_transform:
            rows = [row_transform(row) for row in rows]

        if conflict_cols and update_cols:
            update_clause = ", ".join([f"{c}=EXCLUDED.{c}" for c in update_cols])
            query = (
                f"INSERT INTO {table} ({insert_cols}) VALUES %s "
                f"ON CONFLICT ({', '.join(conflict_cols)}) DO UPDATE SET {update_clause}"
            )
        else:
            query = (
                f"INSERT INTO {table} ({insert_cols}) VALUES %s ON CONFLICT DO NOTHING"
            )

        if values_template:
            execute_values(cur_pg, query, rows, page_size=1000, template=values_template)
        else:
            execute_values(cur_pg, query, rows, page_size=1000)
        log(f"[{table}] 진행 {min(offset + len(rows), total)}/{total}")


def main() -> int:
    try:
        my = mysql.connector.connect(**MYSQL_CFG)
        pg = psycopg2.connect(**PG_CFG)
        myc = my.cursor()
        pgc = pg.cursor()

        # 1) 참조 테이블부터
        copy_table(
            myc,
            pgc,
            "asset_types",
            [
                "asset_type_id",
                "type_name",
                "description",
                "created_at",
                "updated_at",
            ],
            order_by="asset_type_id",
        )
        pg.commit()

        # 변환: is_active (0/1 → boolean)
        def _assets_transform(row):
            row = list(row)
            # columns index: 0.. -> is_active at index 6
            if row[6] is not None:
                try:
                    row[6] = bool(int(row[6]))
                except Exception:
                    row[6] = bool(row[6])
            return tuple(row)

        # assets: 7번째 컬럼 is_active를 명시 캐스팅
        assets_template = "(" + ", ".join([
            "%s",  # asset_id
            "%s",  # ticker
            "%s",  # asset_type_id
            "%s",  # name
            "%s",  # exchange
            "%s",  # currency
            "CAST(%s AS boolean)",  # is_active
            "%s",  # description
            "%s",  # created_at
            "%s",  # updated_at
            "%s",  # data_source
            "%s",  # collection_settings
            "%s",  # last_collections
        ]) + ")"

        copy_table(
            myc,
            pgc,
            "assets",
            [
                "asset_id",
                "ticker",
                "asset_type_id",
                "name",
                "exchange",
                "currency",
                "is_active",
                "description",
                "created_at",
                "updated_at",
                "data_source",
                "collection_settings",
                "last_collections",
            ],
            order_by="asset_id",
            row_transform=_assets_transform,
            values_template=assets_template,
        )
        pg.commit()

        # 2) 인트라데이 (UPSERT)
        copy_table(
            myc,
            pgc,
            "ohlcv_intraday_data",
            [
                "asset_id",
                "timestamp_utc",
                "data_interval",
                "open_price",
                "high_price",
                "low_price",
                "close_price",
                "volume",
                "NULL",
                "created_at",
                "updated_at",
            ],
            order_by="asset_id, timestamp_utc",
            conflict_cols=["asset_id", "timestamp_utc", "data_interval"],
            update_cols=[
                "open_price",
                "high_price",
                "low_price",
                "close_price",
                "volume",
                "adjusted_close",
                "updated_at",
            ],
        )
        pg.commit()

        log("✅ 마이그레이션 완료")
        return 0
    except Exception as e:
        log(f"오류: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())


