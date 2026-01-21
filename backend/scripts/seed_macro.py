import os
import requests
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime

# DB Connection
DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL", "postgresql://geehong:Power6100@db_postgres:5432/markets")
engine = create_engine(DATABASE_URL)

# Alpha Vantage Key
API_KEY = "MJ965EHM5S48YVCV"

def fetch_and_save(function, name, unit, period="Annual"):
    print(f"Fetching {name}...")
    url = f"https://www.alphavantage.co/query?function={function}&apikey={API_KEY}"
    if "TREASURY" in function:
        url += "&interval=monthly&maturity=10year"
        if name == "Treasury2Y": url = url.replace("10year", "2year")
        if name == "Treasury1Y": url = url.replace("10year", "1year")
        if name == "Treasury3M": url = url.replace("10year", "3month")
        
    r = requests.get(url)
    data = r.json()
    
    if "data" in data:
        items = data["data"]
    elif "unit" in data: # GDP, etc
        items = data["data"]
    else:
        print(f"Error fetching {name}: {data}")
        return

    with engine.connect() as conn:
        for item in items[:50]: # Last 50 points
            date_str = item["date"]
            val = float(item["value"]) if item["value"] != "." else 0.0
            
            # Use name as code for simplicity
            code = name.upper() 
            
            # Check exist
            check = text(f"SELECT indicator_id FROM economic_indicators WHERE indicator_name=:name AND timestamp=:date")
            res = conn.execute(check, {"name":name, "date":date_str}).fetchone()
            
            if not res:
                # Get next ID
                max_id_res = conn.execute(text("SELECT COALESCE(MAX(indicator_id), 0) FROM economic_indicators")).scalar()
                next_id = max_id_res + 1
                
                ins = text("""
                    INSERT INTO economic_indicators (indicator_id, indicator_name, indicator_code, value, unit, timestamp, created_at, updated_at)
                    VALUES (:id, :name, :code, :val, :unit, :date, NOW(), NOW())
                """)
                conn.execute(ins, {"id":next_id, "name":name, "code":code, "val":val, "unit":unit, "date":date_str})
        conn.commit()
    print(f"Saved {name}.")

import time

if __name__ == "__main__":
    fetch_and_save("REAL_GDP", "GDP", "Billion USD", "Annual"); time.sleep(15)
    fetch_and_save("CPI", "CPI", "Index", "Monthly"); time.sleep(15)
    fetch_and_save("UNEMPLOYMENT", "unemploymentRate", "Percent", "Monthly"); time.sleep(15)
    fetch_and_save("TREASURY_YIELD", "Treasury10Y", "Percent", "Monthly"); time.sleep(15)
    fetch_and_save("TREASURY_YIELD", "Treasury2Y", "Percent", "Monthly"); time.sleep(15)
    fetch_and_save("TREASURY_YIELD", "Treasury1Y", "Percent", "Monthly"); time.sleep(15)
    fetch_and_save("TREASURY_YIELD", "Treasury3M", "Percent", "Monthly"); time.sleep(15)
    print("Done.")
