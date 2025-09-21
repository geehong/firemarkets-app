import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardTitle,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CBadge,
  CListGroup,
  CListGroupItem,
  CAlert,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSettings,
  cilLockLocked,
  cilClock,
  cilDataTransferDown,
  cilGlobeAlt,
  cilList,
  cilMediaPlay,
  cilMediaStop,
  cilInfo,
  cilWarning,
  cilCheck,
} from '@coreui/icons'

const ConfigReadMe = () => {
  const configGroups = [
    {
      id: 'api_keys',
      title: 'API Keys',
      icon: cilLockLocked,
      color: 'danger',
      description: 'Third-party API keys for data collection services',
      configs: [
        {
          key: 'ALPHA_VANTAGE_API_KEY_1',
          type: 'string',
          description: 'Alpha Vantage API Key (Primary)',
          sensitive: true,
        },
        {
          key: 'ALPHA_VANTAGE_API_KEY_2',
          type: 'string',
          description: 'Alpha Vantage API Key (Secondary)',
          sensitive: true,
        },
        {
          key: 'ALPHA_VANTAGE_API_KEY_3',
          type: 'string',
          description: 'Alpha Vantage API Key (Tertiary)',
          sensitive: true,
        },
        {
          key: 'FMP_API_KEY',
          type: 'string',
          description: 'Financial Modeling Prep API Key',
          sensitive: true,
        },
        {
          key: 'COINMARKETCAP_API_KEY',
          type: 'string',
          description: 'CoinMarketCap API Key',
          sensitive: true,
        },
        {
          key: 'TIINGO_API_KEY',
          type: 'string',
          description: 'Tiingo API Key for stock data collection',
          sensitive: true,
        },
        {
          key: 'TWELVEDATA_API_KEY',
          type: 'string',
          description: 'TwelveData API Key for market data',
          sensitive: true,
        },
        {
          key: 'EODHD_API_KEY',
          type: 'string',
          description: 'EODHD API Key for fundamental data',
          sensitive: true,
        },
        {
          key: 'COIN_GECKO_API_KEY',
          type: 'string',
          description: 'CoinGecko API Key for crypto data',
          sensitive: true,
        },
      ],
    },
    {
      id: 'scheduler_settings',
      title: 'Scheduler Settings',
      icon: cilClock,
      color: 'primary',
      description: 'Data collection scheduler and execution settings',
      configs: [
        {
          key: 'DATA_COLLECTION_INTERVAL_MINUTES',
          type: 'int',
          description: 'Data collection scheduler execution interval (minutes)',
          sensitive: false,
        },
        {
          key: 'OHLCV_DATA_INTERVAL',
          type: 'string',
          description: 'OHLCV data collection interval (1d, 1h, 4h, 1w, 1m)',
          sensitive: false,
        },
        {
          key: 'OHLCV_DATA_INTERVALS',
          type: 'json',
          description: 'Multiple OHLCV data collection intervals to collect',
          sensitive: false,
        },
        {
          key: 'ENABLE_MULTIPLE_INTERVALS',
          type: 'boolean',
          description: 'Enable collection of multiple OHLCV intervals',
          sensitive: false,
        },
        {
          key: 'HISTORICAL_DATA_DAYS_PER_RUN',
          type: 'int',
          description: 'Number of historical data days to fetch per run (for pagination)',
          sensitive: false,
        },
        {
          key: 'MAX_HISTORICAL_DAYS',
          type: 'int',
          description: 'Maximum historical data days (30 years)',
          sensitive: false,
        },
        {
          key: 'ENABLE_HISTORICAL_BACKFILL',
          type: 'boolean',
          description: 'Enable historical data backfill (fetch missing historical data)',
          sensitive: false,
        },
        {
          key: 'MAX_API_RETRY_ATTEMPTS',
          type: 'int',
          description: 'Maximum API call retry attempts',
          sensitive: false,
        },
        {
          key: 'API_REQUEST_TIMEOUT_SECONDS',
          type: 'int',
          description: 'API request timeout (seconds)',
          sensitive: false,
        },
        {
          key: 'ENABLE_IMMEDIATE_EXECUTION',
          type: 'boolean',
          description: 'Enable immediate execution of scheduler jobs on startup',
          sensitive: false,
        },
        {
          key: 'DATA_COLLECTION_INTERVAL_DAILY',
          type: 'int',
          description: 'Data collection interval for daily tasks (days)',
          sensitive: false,
        },
      ],
    },
    {
      id: 'onchain_metrics_toggles',
      title: 'On-chain Metrics Toggles',
      icon: cilDataTransferDown,
      color: 'success',
      description: 'Enable/disable collection of specific on-chain metrics',
      configs: [
        {
          key: 'ONCHAIN_COLLECT_MVRV_ZSCORE',
          type: 'boolean',
          description: 'Collect MVRV Z-Score',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_SOPR',
          type: 'boolean',
          description: 'Collect SOPR',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_NUPL',
          type: 'boolean',
          description: 'Collect NUPL',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_REALIZED_PRICE',
          type: 'boolean',
          description: 'Collect Realized Price',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_HASHRATE',
          type: 'boolean',
          description: 'Collect Hashrate',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_DIFFICULTY_BTC',
          type: 'boolean',
          description: 'Collect Difficulty (BTC)',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_MINER_RESERVES',
          type: 'boolean',
          description: 'Collect Miner Reserves',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_ETF_BTC_TOTAL',
          type: 'boolean',
          description: 'Collect ETF BTC Total',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_OPEN_INTEREST_FUTURES',
          type: 'boolean',
          description: 'Collect Open Interest Futures',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_CAP_REAL_USD',
          type: 'boolean',
          description: 'Collect Realized Cap (USD)',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_CDD_90DMA',
          type: 'boolean',
          description: 'Collect CDD 90dma',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_TRUE_MARKET_MEAN',
          type: 'boolean',
          description: 'Collect True Market Mean',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_NRPL_BTC',
          type: 'boolean',
          description: 'Collect NRPL (BTC)',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_AVIV',
          type: 'boolean',
          description: 'Collect AVIV',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_THERMO_CAP',
          type: 'boolean',
          description: 'Collect Thermo Cap',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_HODL_WAVES_SUPPLY',
          type: 'boolean',
          description: 'Collect HODL Waves Supply',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECT_ETF_BTC_FLOW',
          type: 'boolean',
          description: 'Collect ETF BTC Flow',
          sensitive: false,
        },
      ],
    },
    {
      id: 'onchain_api_settings',
      title: 'On-chain API Settings',
      icon: cilGlobeAlt,
      color: 'info',
      description: 'Settings specific to on-chain data provider APIs',
      configs: [
        {
          key: 'BGEO_API_BASE_URL',
          type: 'string',
          description: 'Onchaindata API Base URL',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_API_DELAY_SECONDS',
          type: 'int',
          description: 'Delay between on-chain API calls (seconds)',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_SEMAPHORE_LIMIT',
          type: 'int',
          description: 'Concurrency limit for on-chain API calls',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_COLLECTION_INTERVAL_HOURS',
          type: 'int',
          description: 'On-chain data collection interval (hours)',
          sensitive: false,
        },
        {
          key: 'ONCHAIN_API_PRIORITY',
          type: 'string',
          description: 'Priority order of on-chain data sources',
          sensitive: false,
        },
      ],
    },
    {
      id: 'realtime_settings',
      title: 'Realtime Settings',
      icon: cilList,
      color: 'warning',
      description: 'Real-time data processing and Redis streams settings',
      configs: [
        {
          key: 'REALTIME_PROCESSING_INTERVAL_SECONDS',
          type: 'float',
          description: '실시간 데이터 처리 주기 (초)',
          sensitive: false,
        },
        {
          key: 'REALTIME_BATCH_SIZE',
          type: 'int',
          description: '실시간 데이터 배치 처리 크기',
          sensitive: false,
        },
        {
          key: 'REALTIME_QUOTE_RETENTION_HOURS',
          type: 'int',
          description: '실시간 인용 데이터 보관 시간 (시간)',
          sensitive: false,
        },
        {
          key: 'REALTIME_STREAM_BLOCK_MS',
          type: 'int',
          description: 'Redis 스트림 읽기 블록 시간 (밀리초)',
          sensitive: false,
        },
        {
          key: 'REALTIME_DISPLAY_INTERVAL_SECONDS',
          type: 'float',
          description: '실시간 데이터 표시 주기 (초)',
          sensitive: false,
        },
        {
          key: 'REALTIME_DATA_FRESHNESS_THRESHOLD_SECONDS',
          type: 'int',
          description: '실시간 데이터 신선도 임계값 (초)',
          sensitive: false,
        },
      ],
    },
    {
      id: 'websocket_config',
      title: 'WebSocket Configuration',
      icon: cilList,
      color: 'secondary',
      description: 'WebSocket consumers and their behavior settings',
      configs: [
        {
          key: 'WEBSOCKET_TIME_WINDOW_MINUTES',
          type: 'int',
          description: '웹소켓 누적 저장 시간 윈도우 (분)',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_CONSUMER_GROUP_PREFIX',
          type: 'string',
          description: '웹소켓 컨슈머 그룹 접두사',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_RECONNECT_DELAY_SECONDS',
          type: 'int',
          description: '웹소켓 재연결 지연 시간 (초)',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_HEALTH_CHECK_INTERVAL_SECONDS',
          type: 'int',
          description: '웹소켓 헬스체크 주기 (초)',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_CONSUMER_INTERVAL_SECONDS',
          type: 'int',
          description: '웹소켓 컨슈머 수신 주기 (초)',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_FINNHUB_ENABLED',
          type: 'boolean',
          description: 'Finnhub WebSocket Consumer 활성화 여부',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_BINANCE_ENABLED',
          type: 'boolean',
          description: 'Binance WebSocket Consumer 활성화 여부',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_ALPACA_ENABLED',
          type: 'boolean',
          description: 'Alpaca WebSocket Consumer 활성화 여부',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_TIINGO_ENABLED',
          type: 'boolean',
          description: 'Tiingo WebSocket Consumer 활성화 여부',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_TWELVEDATA_ENABLED',
          type: 'boolean',
          description: 'TwelveData WebSocket consumer enabled',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_SWISSQUOTE_ENABLED',
          type: 'boolean',
          description: 'Enable Swissquote WebSocket Consumer',
          sensitive: false,
        },
        {
          key: 'WEBSOCKET_COINBASE_ENABLED',
          type: 'boolean',
          description: 'Coinbase WebSocket Consumer 활성화 여부',
          sensitive: false,
        },
      ],
    },
    {
      id: 'data_collection_toggles',
      title: 'Data Collection Toggles',
      icon: cilMediaPlay,
      color: 'dark',
      description: 'Master toggles to enable or disable major data collection categories',
      configs: [
        {
          key: 'ENABLE_ETF_COLLECTION',
          type: 'boolean',
          description: 'Enable ETF data collection',
          sensitive: false,
        },
        {
          key: 'ENABLE_CRYPTO_COLLECTION',
          type: 'boolean',
          description: 'Enable crypto data collection',
          sensitive: false,
        },
        {
          key: 'ENABLE_OHLCV_COLLECTION',
          type: 'boolean',
          description: 'Enable OHLCV data collection',
          sensitive: false,
        },
        {
          key: 'ENABLE_STOCK_COLLECTION',
          type: 'boolean',
          description: 'Enable stock data collection',
          sensitive: false,
        },
        {
          key: 'ENABLE_ONCHAIN_COLLECTION',
          type: 'boolean',
          description: 'Enable on-chain data collection',
          sensitive: false,
        },
        {
          key: 'ENABLE_WORLD_ASSETS_COLLECTION',
          type: 'boolean',
          description: 'Enable world assets data collection',
          sensitive: false,
        },
      ],
    },
  ]

  const getTypeColor = (type) => {
    switch (type) {
      case 'string':
        return 'primary'
      case 'int':
        return 'success'
      case 'float':
        return 'info'
      case 'boolean':
        return 'warning'
      case 'json':
        return 'secondary'
      default:
        return 'light'
    }
  }

  const getSensitiveIcon = (sensitive) => {
    return sensitive ? (
      <CIcon icon={cilWarning} className="text-danger me-1" />
    ) : (
      <CIcon icon={cilCheck} className="text-success me-1" />
    )
  }

  return (
    <div>
      <CAlert color="info" className="mb-4">
        <CIcon icon={cilInfo} className="me-2" />
        <strong>Configuration Overview</strong>
        <br />
        This system uses grouped JSON configurations to organize related settings. Each group contains multiple configuration items with their values, types, and metadata.
      </CAlert>

      <CAccordion alwaysOpen>
        {configGroups.map((group) => (
          <CAccordionItem key={group.id} itemKey={group.id}>
            <CAccordionHeader>
              <div className="d-flex align-items-center w-100">
                <CIcon icon={group.icon} className={`me-2 text-${group.color}`} />
                <div className="flex-grow-1">
                  <strong>{group.title}</strong>
                  <div className="small text-muted">{group.description}</div>
                </div>
                <CBadge color={group.color} className="ms-2">
                  {group.configs.length} items
                </CBadge>
              </div>
            </CAccordionHeader>
            <CAccordionBody>
              <CListGroup flush>
                {group.configs.map((config) => (
                  <CListGroupItem key={config.key} className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        {getSensitiveIcon(config.sensitive)}
                        <code className="me-2">{config.key}</code>
                        <CBadge color={getTypeColor(config.type)} size="sm">
                          {config.type}
                        </CBadge>
                      </div>
                      <div className="small text-muted">{config.description}</div>
                    </div>
                  </CListGroupItem>
                ))}
              </CListGroup>
            </CAccordionBody>
          </CAccordionItem>
        ))}
      </CAccordion>

      <CCard className="mt-4">
        <CCardHeader>
          <CCardTitle>
            <CIcon icon={cilSettings} className="me-2" />
            Configuration Structure
          </CCardTitle>
        </CCardHeader>
        <CCardBody>
          <div className="mb-3">
            <h6>JSON Structure Example:</h6>
            <pre className="bg-light p-3 rounded">
{`{
  "config_key": "api_keys",
  "config_value": {
    "ALPHA_VANTAGE_API_KEY_1": {
      "value": "your_api_key_here",
      "type": "string",
      "description": "Alpha Vantage API Key (Primary)",
      "is_sensitive": true,
      "is_active": true
    }
  },
  "data_type": "json",
  "category": "grouped_configs"
}`}
            </pre>
          </div>
          
          <div className="mb-3">
            <h6>Data Types:</h6>
            <ul className="list-unstyled">
              <li><CBadge color="primary" className="me-2">string</CBadge> Text values</li>
              <li><CBadge color="success" className="me-2">int</CBadge> Integer numbers</li>
              <li><CBadge color="info" className="me-2">float</CBadge> Decimal numbers</li>
              <li><CBadge color="warning" className="me-2">boolean</CBadge> True/False values</li>
              <li><CBadge color="secondary" className="me-2">json</CBadge> Complex JSON objects</li>
            </ul>
          </div>

          <div>
            <h6>Security Notes:</h6>
            <ul className="list-unstyled">
              <li><CIcon icon={cilWarning} className="text-danger me-1" /> Sensitive configurations are marked and should be handled with care</li>
              <li><CIcon icon={cilCheck} className="text-success me-1" /> Non-sensitive configurations can be safely modified</li>
            </ul>
          </div>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default ConfigReadMe
