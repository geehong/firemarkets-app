import { api } from 'src/lib/api'

export const realtimeAPI = {
  getQuotesPricePg: (symbolOrId) => api.get('/realtime/pg/quotes-price', { params: { asset_identifier: symbolOrId } }),
  getQuotesDelayPricePg: (symbolOrId, dataInterval = '15m', days = 1) =>
    api.get('/realtime/pg/quotes-delay-price', { params: { asset_identifier: symbolOrId, data_interval: dataInterval, days } }),
  getIntradayOhlcv: (assetIdentifier, dataInterval = '4h', ohlcv = true, days = 1) =>
    api.get('/realtime/intraday-ohlcv', { params: { asset_identifier: assetIdentifier, data_interval: dataInterval, ohlcv, days } }),
  getAssetsTable: (params) => api.get('/realtime/table', { params }),
}

export default realtimeAPI
