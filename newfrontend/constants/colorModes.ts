// 색상 모드 설정
export const colorModes = {
  dark: {
    coin: '#1a1a1a',      // 검정
    metric: '#ffd700',    // 골드
    halving_1: '#ffd700', // 골드
    halving_2: '#ff6b6b', // 빨강
    halving_3: '#4ecdc4', // 청록
    halving_4: '#1a1a1a', // 검정 (4차는 코인 색상)
    moving_average: '#ff6b6b', // 빨강 (이동평균선)
    plot_band: 'rgba(68, 170, 213, 0.1)', // 연한 파랑 (Plot Band)
    plot_line: '#ff0000',  // 빨강 (Plot Line)
    // 거래소별 컬러
    exchange_binance: '#f7931a',    // Binance 오렌지
    exchange_bitget: '#00d4aa',     // Bitget 그린
    exchange_bybit: '#f7b500',      // Bybit 옐로우
    exchange_okx: '#000000',        // OKX 블랙
    exchange_deribit: '#ff6b35',    // Deribit 오렌지
    exchange_bitfinex: '#87ceeb',   // Bitfinex 스카이블루
    exchange_huobi: '#ff6b6b',      // Huobi 레드
    exchange_kraken: '#4ecdc4',     // Kraken 청록
    exchange_coinbase: '#0052ff',   // Coinbase 블루
    exchange_other: '#95a5a6'       // 기타 거래소 그레이
  },
  vivid: {
    coin: '#1e3a8a',      // 진파랑
    metric: '#ff6b35',    // 주황
    halving_1: '#ff6b35', // 주황
    halving_2: '#e74c3c', // 빨강
    halving_3: '#3498db', // 파랑
    halving_4: '#1e3a8a', // 진파랑 (4차는 코인 색상)
    moving_average: '#e74c3c', // 빨강 (이동평균선)
    plot_band: 'rgba(52, 152, 219, 0.15)', // 연한 파랑 (Plot Band)
    plot_line: '#e74c3c',  // 빨강 (Plot Line)
    // 거래소별 컬러
    exchange_binance: '#ff6b35',    // Binance 주황
    exchange_bitget: '#00d4aa',     // Bitget 그린
    exchange_bybit: '#f7b500',      // Bybit 옐로우
    exchange_okx: '#2c3e50',        // OKX 다크그레이
    exchange_deribit: '#e74c3c',    // Deribit 레드
    exchange_bitfinex: '#3498db',   // Bitfinex 블루
    exchange_huobi: '#e74c3c',      // Huobi 레드
    exchange_kraken: '#9b59b6',     // Kraken 퍼플
    exchange_coinbase: '#0052ff',   // Coinbase 블루
    exchange_other: '#95a5a6'       // 기타 거래소 그레이
  },
  'high-contrast': {
    coin: '#000000',      // 순검정
    metric: '#ffff00',    // 노랑
    halving_1: '#ffff00', // 노랑
    halving_2: '#ff0000', // 빨강
    halving_3: '#00ff00', // 초록
    halving_4: '#000000', // 순검정 (4차는 코인 색상)
    moving_average: '#ff0000', // 빨강 (이동평균선)
    plot_band: 'rgba(255, 255, 0, 0.2)', // 연한 노랑 (Plot Band)
    plot_line: '#ff0000',  // 빨강 (Plot Line)
    // 거래소별 컬러
    exchange_binance: '#ffff00',    // Binance 노랑
    exchange_bitget: '#00ff00',     // Bitget 초록
    exchange_bybit: '#ff8000',      // Bybit 주황
    exchange_okx: '#000000',        // OKX 블랙
    exchange_deribit: '#ff0000',    // Deribit 레드
    exchange_bitfinex: '#0080ff',   // Bitfinex 블루
    exchange_huobi: '#ff0000',      // Huobi 레드
    exchange_kraken: '#8000ff',     // Kraken 퍼플
    exchange_coinbase: '#0052ff',   // Coinbase 블루
    exchange_other: '#808080'       // 기타 거래소 그레이
  },
  simple: {
    coin: '#374151',      // 회색
    metric: '#f39c12',    // 주황
    halving_1: '#f39c12', // 주황
    halving_2: '#e67e22', // 진주황
    halving_3: '#95a5a6', // 회색
    halving_4: '#374151', // 회색 (4차는 코인 색상)
    moving_average: '#e67e22', // 진주황 (이동평균선)
    plot_band: 'rgba(243, 156, 18, 0.1)', // 연한 주황 (Plot Band)
    plot_line: '#e67e22',  // 진주황 (Plot Line)
    // 거래소별 컬러
    exchange_binance: '#f39c12',    // Binance 주황
    exchange_bitget: '#27ae60',     // Bitget 그린
    exchange_bybit: '#f7b500',      // Bybit 옐로우
    exchange_okx: '#34495e',        // OKX 다크그레이
    exchange_deribit: '#e67e22',    // Deribit 진주황
    exchange_bitfinex: '#3498db',   // Bitfinex 블루
    exchange_huobi: '#e74c3c',      // Huobi 레드
    exchange_kraken: '#9b59b6',     // Kraken 퍼플
    exchange_coinbase: '#0052ff',   // Coinbase 블루
    exchange_other: '#95a5a6'       // 기타 거래소 그레이
  }
};

// 색상 모드 가져오기
export const getColorMode = (mode: 'dark' | 'vivid' | 'high-contrast' | 'simple') => {
  return colorModes[mode] || colorModes.dark;
};
