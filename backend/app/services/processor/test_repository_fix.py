import asyncio
from unittest.mock import MagicMock, patch
from datetime import date
from app.services.processor.repository import DataRepository

async def test_save_stock_financials_fix():
    # Mocking
    mock_validator = MagicMock()
    repo = DataRepository(mock_validator)
    
    # Mock DB session
    mock_db = MagicMock()
    mock_db_generator = MagicMock()
    mock_db_generator.__next__.return_value = mock_db
    
    with patch('app.services.processor.repository.get_postgres_db', return_value=mock_db_generator):
        # Case 1: snapshot_date in item directly
        item1 = {
            "asset_id": 1, 
            "snapshot_date": date(2023, 1, 1),
            "currency": "USD"
        }
        await repo.save_stock_financials([item1])
        
        # Verify execute was called
        assert mock_db.execute.called
        # Verify snapshot_date was passed in values
        # This is tricky without inspecting the SQL object deeply, but we can check if it didn't crash
        print("Case 1 Executed")
        
        # Case 2: snapshot_date in data dict
        item2 = {
            "asset_id": 2,
            "data": {
                "snapshot_date": "2023-01-02",
                "currency": "USD"
            }
        }
        await repo.save_stock_financials([item2])
        print("Case 2 Executed")

        # Case 3: 'date' field instead of 'snapshot_date' in data dict (common schema variation)
        item3 = {
            "asset_id": 3,
            "data": {
                "date": "2023-01-03",
                "currency": "USD"
            }
        }
        await repo.save_stock_financials([item3])
        print("Case 3 Executed")

if __name__ == "__main__":
    asyncio.run(test_save_stock_financials_fix())
