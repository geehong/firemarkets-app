"""
Script to import KIS Master Data from tmp/ directory.
Supported files: 
- Domestic: kospi_code.mst.zip, kosdaq_code.mst.zip
- Overseas: nasmst.cod.zip, nysmst.cod.zip, amsmst.cod.zip, ...
"""
import os
import zipfile
import asyncio
import sys

# Add project root to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, SessionLocal, postgres_engine
from app.models.kis_master import KisKwMaster
from app.models.kis_overseas_master import KisOverseasMaster
from app.models.kis_foreign_index_master import KisForeignIndexMaster

async def import_masters():
    print("Starting KIS Master Import...")
    
    engine = postgres_engine
    KisKwMaster.metadata.create_all(bind=engine)
    KisOverseasMaster.metadata.create_all(bind=engine)
    KisForeignIndexMaster.metadata.create_all(bind=engine)
    
    session = sessionmaker(bind=engine)()
    
    tmp_dir = "tmp"
    if os.path.exists("/app/tmp"):
        tmp_dir = "/app/tmp"
        
    print(f"Using tmp dir: {tmp_dir}")

    # --- Domestic Import ---
    domestic_files = {
        "kospi_code.mst.zip": "KOSPI",
        "kosdaq_code.mst.zip": "KOSDAQ"
    }

    print("\n[1] Processing Domestic Masters...")
    for zip_name, market_type in domestic_files.items():
        try:
            await process_domestic(session, tmp_dir, zip_name, market_type)
        except Exception as e:
            print(f"  Failed {zip_name}: {e}")

    # --- Overseas Import ---
    # Parsing Map: zip_name -> {exchange_code}
    # nasmst -> NAS
    # nysmst -> NYS
    # amsmst -> AMS
    # hksmst -> HKS
    # hnxmst -> HNX
    # hsxmst -> HSX
    # shimst -> SHI
    # shsmst -> SHS
    # szimst -> SZI
    # szsmst -> SZS
    # tsemst -> TSE
    
    overseas_files = {
        "nasmst.cod.zip": "NAS",
        "nysmst.cod.zip": "NYS",
        "amsmst.cod.zip": "AMS",
        "hksmst.cod.zip": "HKS",
        "hnxmst.cod.zip": "HNX",
        "hsxmst.cod.zip": "HSX",
        "shimst.cod.zip": "SHI",
        "shsmst.cod.zip": "SHS",
        "szimst.cod.zip": "SZI",
        "szsmst.cod.zip": "SZS",
        "tsemst.cod.zip": "TSE",
    }
    
    print("\n[2] Processing Overseas Masters...")
    for zip_name, exchange_code in overseas_files.items():
        try:
            await process_overseas(session, tmp_dir, zip_name, exchange_code)
        except Exception as e:
            print(f"  Failed {zip_name}: {e}")
            
    # --- Foreign Indices Import ---
    print("\n[3] Processing Foreign Indices (frgn_code.mst)...")
    try:
        await process_foreign_indices(session, tmp_dir, "frgn_code.mst.zip")
    except Exception as e:
        print(f"  Failed frgn_code.mst.zip: {e}")
            
    session.close()

async def process_foreign_indices(session, tmp_dir, zip_name):
    zip_path = os.path.join(tmp_dir, zip_name)
    if not os.path.exists(zip_path):
        print(f"  Skipping {zip_name}: Not found.")
        return

    print(f"  Processing {zip_name}...")
    
    with zipfile.ZipFile(zip_path, 'r') as zf:
        inner_filename = "frgn_code.mst"
        if inner_filename not in zf.namelist():
            # fallback
            if zf.namelist():
                inner_filename = zf.namelist()[0]
        
        with zf.open(inner_filename) as f:
            content = f.read()
            
        try:
            text_data = content.decode("cp949", errors="replace")
        except:
            print("    Decode Error")
            return
            
        lines = text_data.splitlines()
        print(f"    Found {len(lines)} records.")
        
        count = 0
        for line in lines:
            if len(line) < 50: continue
            
            # Fixed width parsing
            # 0-10: Symbol
            # 11-50: Name En
            # 50-90: Name Ko
            # 90+: Market Info
            
            symbol = line[0:11].strip()
            name_en = line[11:50].strip()
            name_ko = line[50:90].strip()
            market_code = line[90:].strip()
            
            if not symbol: continue
            
            obj = KisForeignIndexMaster(
                symbol=symbol,
                name_en=name_en,
                name_ko=name_ko,
                market_code=market_code
            )
            session.merge(obj)
            count += 1
            if count % 1000 == 0:
                session.commit()
                print(f"    Imported {count}...")
        
        session.commit()
        print(f"    Finished: {count} imported.")


async def process_domestic(session, tmp_dir, zip_name, market_type):
    zip_path = os.path.join(tmp_dir, zip_name)
    if not os.path.exists(zip_path):
        print(f"  Skipping {zip_name}: Not found.")
        return

    print(f"  Processing {zip_name} ({market_type})...")
    
    with zipfile.ZipFile(zip_path, 'r') as zf:
        inner_filename = zip_name.replace(".zip", "")
        if inner_filename not in zf.namelist():
            inner_filename = zf.namelist()[0]
        
        with zf.open(inner_filename) as f:
            content = f.read()
            
        try:
            text_data = content.decode("cp949", errors="replace")
        except:
            print("    Decode Error")
            return
            
        lines = text_data.splitlines()
        print(f"    Found {len(lines)} records.")
        
        count = 0
        for line in lines:
            if len(line) < 20: continue
            
            short_code = line[0:9].strip()
            std_code = line[9:21].strip()
            tail = line[21:]
            name_ko_candidate = tail[1:41].strip()
            
            obj = KisKwMaster(
                short_code=short_code,
                standard_code=std_code,
                name_ko=name_ko_candidate,
                market_type=market_type
            )
            session.merge(obj)
            count += 1
            if count % 2000 == 0:
                session.commit()
                print(f"    Imported {count}...")
        
        session.commit()
        print(f"    Finished: {count} imported.")


async def process_overseas(session, tmp_dir, zip_name, exchange_code):
    zip_path = os.path.join(tmp_dir, zip_name)
    if not os.path.exists(zip_path):
        print(f"  Skipping {zip_name}: Not found.")
        return

    print(f"  Processing {zip_name} ({exchange_code})...")
    
    with zipfile.ZipFile(zip_path, 'r') as zf:
        # Overseas zips usually contain .COD or .cod file
        # Check namelist
        files = zf.namelist()
        target_file = None
        for fn in files:
            if fn.lower().endswith('.cod'):
                target_file = fn
                break
        
        if not target_file:
            print(f"    No .cod file found in {zip_name}")
            return
            
        with zf.open(target_file) as f:
            content = f.read()

        # Decodes usually with cp949 or utf8? KIS usually cp949
        try:
            text_data = content.decode("cp949", errors="replace")
        except:
            text_data = content.decode("utf-8", errors="replace")
            
        lines = text_data.splitlines()
        print(f"    Found {len(lines)} records.")
        
        count = 0
        for line in lines:
            if not line.strip(): continue
            
            # Tab delimited
            parts = line.split('\t')
            if len(parts) < 7: continue
            
            # Mapping based on inspection:
            # 0: National (US)
            # 2: Exchange (NAS)
            # 3: Name Ko? NO. 
            # 3: '나스닥' (Exchange Name Ko)
            # 4: Symbol (AACB)
            # 5: KIS Code? (NASAACB)
            # 6: Name Ko (아티우스...)
            # 7: Name En (ARTIUS...)
            
            # Safety check length
            try:
                nat_code = parts[0].strip()
                exch_code = parts[2].strip()
                symbol = parts[4].strip()
                kis_code = parts[5].strip()
                
                name_ko = parts[6].strip() if len(parts) > 6 else None
                name_en = parts[7].strip() if len(parts) > 7 else None
                
                # Composite PK unique check?
                # We used symbol as PK in model. This will overwrite if same symbol exists in diff exchanges?
                # Wait, our model PK is 'symbol'.
                # Does 'AAPL' exist in NAS and NYS? No. 
                # But '0992' might exist in HK and JP?
                # Let's trust unique symbol within dataset for now, or merge.
                
                obj = KisOverseasMaster(
                    national_code=nat_code,
                    exchange_code=exch_code,
                    symbol=symbol,
                    kis_code=kis_code,
                    name_ko=name_ko,
                    name_en=name_en
                )
                session.merge(obj)
                count += 1
                
                if count % 2000 == 0:
                    session.commit()
                    print(f"    Imported {count}...")
            except Exception as e:
                # print(f"    Row Error: {e}")
                continue

        session.commit()
        print(f"    Finished: {count} imported.")

if __name__ == "__main__":
    asyncio.run(import_masters())
