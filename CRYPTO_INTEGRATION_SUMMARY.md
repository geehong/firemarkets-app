# CryptoData Model and CoinMarketCap API Integration

## Overview

The `CryptoData` model is designed to store comprehensive cryptocurrency information from the CoinMarketCap API. It covers both the `/v1/cryptocurrency/info` and `/v1/cryptocurrency/quotes/latest` endpoints, providing a unified data structure for cryptocurrency market data.

## Database Schema

### crypto_data Table

The `crypto_data` table stores the following information:

#### Core Fields

- `id`: Primary key
- `asset_id`: Foreign key to assets table
- `symbol`: Crypto symbol (e.g., BTC, ETH)
- `name`: Crypto name

#### Market Data (from quotes endpoint)

- `market_cap`: Market capitalization in USD
- `current_price`: Current price in USD
- `price`: Alternative price field
- `volume_24h`: 24-hour trading volume
- `circulating_supply`: Circulating supply
- `total_supply`: Total supply
- `max_supply`: Maximum supply
- `percent_change_1h`: 1-hour price change percentage
- `percent_change_24h`: 24-hour price change percentage
- `percent_change_7d`: 7-day price change percentage
- `cmc_rank`: CoinMarketCap rank

#### Metadata (from info endpoint)

- `category`: Crypto category
- `description`: Crypto description
- `logo_url`: Logo URL
- `website_url`: Website URL
- `slug`: CoinMarketCap slug
- `date_added`: Date added to CoinMarketCap
- `platform`: Platform information
- `explorer`: Blockchain explorer URLs (JSON)
- `source_code`: Source code URLs (JSON)
- `tags`: Crypto tags (JSON)

#### Status Fields

- `is_active`: Active status
- `last_updated`: Last update timestamp
- `created_at`: Creation timestamp

## API Endpoints

### GET /api/v1/crypto/data/{symbol}

Get cryptocurrency data by symbol. Returns data from database or fetches from CoinMarketCap if not available.

### GET /api/v1/crypto/top?limit={limit}

Get top cryptocurrencies by market cap. Default limit is 100, maximum is 1000.

### GET /api/v1/crypto/metrics/{symbol}?days={days}

Get cryptocurrency metrics history. Default is 30 days, maximum is 365 days.

### POST /api/v1/crypto/update/{symbol}

Update cryptocurrency data from CoinMarketCap API.

### GET /api/v1/crypto/global-metrics

Get global cryptocurrency market metrics.

### GET /api/v1/crypto/bitcoin/halving-data/{period_number}

Get Bitcoin halving period data (1-4).

### GET /api/v1/crypto/bitcoin/halving-summary

Get summary of all Bitcoin halving periods.

### GET /api/v1/crypto/bitcoin/next-halving

Get information about the next Bitcoin halving.

## CoinMarketCap API Integration

### Supported Endpoints

1. **Crypto Quotes** (`/v1/cryptocurrency/quotes/latest`)

   - Real-time price and market data
   - Volume, market cap, supply information
   - Price change percentages

2. **Crypto Info** (`/v1/cryptocurrency/info`)

   - Metadata and descriptive information
   - Logo, website, explorer URLs
   - Category, tags, platform information

3. **Crypto Listings** (`/v1/cryptocurrency/listings/latest`)

   - Top cryptocurrencies by market cap
   - Used for bulk data collection

4. **Global Metrics** (`/v1/global-metrics/quotes/latest`)
   - Overall market statistics
   - Total market cap, volume, dominance

### Rate Limits

- **Free Tier**: 30 requests/minute, 10,000 requests/day
- **Basic Tier**: 60 requests/minute, 50,000 requests/day
- **Professional Tier**: 120 requests/minute, 100,000 requests/day

### Configuration

The CoinMarketCap API key is stored in the `app_configurations` table:

- Key: `COINMARKETCAP_API_KEY`
- Category: `api_keys`
- Sensitive: `true`

## Data Collection

### CryptoCollector

The `CryptoCollector` class handles automated data collection:

- Fetches data for all active cryptocurrency assets
- Processes data in batches to respect rate limits
- Stores both quotes and metadata information
- Implements retry logic with exponential backoff
- Handles API errors gracefully

### Data Flow

1. **Asset Discovery**: Query active cryptocurrency assets from database
2. **Batch Processing**: Process assets in batches of 10
3. **API Calls**: Fetch quotes and metadata concurrently
4. **Data Storage**: Upsert data into crypto_data table
5. **Rate Limiting**: Sleep between batches to respect API limits

## Service Layer

### CryptoService

The `CryptoService` provides high-level operations:

- **get_crypto_data()**: Get data by symbol (database first, then API)
- **get_top_cryptos()**: Get top cryptocurrencies by market cap
- **get_crypto_metrics()**: Get historical metrics
- **update_crypto_data()**: Update data from CoinMarketCap
- **get_global_crypto_metrics()**: Get global market statistics

### Features

- **Caching**: Database-first approach with API fallback
- **Error Handling**: Comprehensive error handling and logging
- **Data Formatting**: Consistent data formatting for API responses
- **Validation**: Input validation and sanitization

## CRUD Operations

### CRUDCryptoData

Provides database operations for the CryptoData model:

- **get_latest_data()**: Get latest data for an asset
- **get_data_by_rank()**: Get data by CoinMarketCap rank
- **get_top_cryptos()**: Get top cryptocurrencies
- **get_cryptos_by_category()**: Get cryptos by category
- **search_cryptos()**: Search by name
- **upsert_crypto_data()**: Insert or update data

## Pydantic Schemas

### CryptoDataBase

Base schema with all cryptocurrency fields.

### CryptoDataResponse

Response schema for API endpoints.

### CryptoDataUpdate

Update schema for modifying data.

## Usage Examples

### Get Bitcoin Data

```bash
curl "http://localhost:8000/api/v1/crypto/data/BTC"
```

### Get Top 50 Cryptocurrencies

```bash
curl "http://localhost:8000/api/v1/crypto/top?limit=50"
```

### Update Ethereum Data

```bash
curl -X POST "http://localhost:8000/api/v1/crypto/update/ETH"
```

### Get Global Metrics

```bash
curl "http://localhost:8000/api/v1/crypto/global-metrics"
```

## Error Handling

The system handles various error scenarios:

- **API Key Missing**: Returns appropriate error message
- **Rate Limit Exceeded**: Implements retry logic with backoff
- **Asset Not Found**: Returns 404 with descriptive message
- **API Errors**: Logs errors and returns fallback data when possible
- **Database Errors**: Handles connection issues and rollback

## Monitoring

### Logging

- API call logs with response times
- Error logging with stack traces
- Progress logging for batch operations

### Metrics

- Number of assets processed
- Success/failure rates
- API response times
- Data freshness indicators

## Future Enhancements

1. **Historical Data**: Add support for historical price data
2. **WebSocket Integration**: Real-time price updates
3. **Multiple Sources**: Integrate additional data sources
4. **Analytics**: Add technical indicators and analysis
5. **Caching**: Implement Redis caching for frequently accessed data
6. **Webhooks**: Real-time notifications for price changes

## Configuration

### Environment Variables

- `COINMARKETCAP_API_KEY`: API key for CoinMarketCap
- `API_REQUEST_TIMEOUT_SECONDS`: Request timeout (default: 30)
- `ENABLE_CRYPTO_DATA_COLLECTION`: Enable/disable collection

### Database Configuration

- Connection pooling settings
- Retry logic configuration
- Batch size settings

This integration provides a comprehensive solution for cryptocurrency data management, combining the power of CoinMarketCap's API with efficient database storage and retrieval.
