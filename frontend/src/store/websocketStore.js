import { create } from 'zustand'
import io from 'socket.io-client'

const useWebSocketStore = create((set, get) => ({
  // 심볼 정규화: 백엔드가 기대하는 룸 키에 맞춤 (예: SOL -> SOLUSDT, SOL-USD -> SOLUSD)
  _normalizeSymbols: (symbols) => {
    if (!Array.isArray(symbols)) return [];
    return symbols.map((raw) => {
      if (!raw) return raw;
      const s = String(raw).toUpperCase();
      // 이미 USDT로 끝나면 그대로 유지
      if (s.endsWith('USDT')) return s;
      // 코인베이스 형태 SOL-USD -> SOLUSD
      if (s.includes('-USD')) return s.replace('-USD', 'USD');
      // 명시적 USD 현물 페어는 그대로 두되, 코인 심볼 단일 토큰은 USDT로 보정
      const isSingleToken = /^[A-Z]{2,10}$/.test(s);
      const knownStocksEtfs = ['AAPL','MSFT','NVDA','GOOG','AMZN','META','NFLX','AVGO','SPY','QQQ','DIA','IWM'];
      if (knownStocksEtfs.includes(s)) return s;
      // 단일 토큰이면서 주식/ETF가 아니면 크립토로 간주하여 USDT 부착
      if (isSingleToken) return `${s}USDT`;
      return s;
    });
  },
  // --- State ---
  socket: null,
  connected: false,
  prices: {},
  loading: true,
  error: null,
  backupMode: false,
  dataSource: 'websocket',
  lastUpdate: null,
  symbolSubscribers: {},
  // 디바운싱을 위한 마지막 업데이트 시간 추적
  lastUpdateTimes: {},

  // --- Actions ---

  // WebSocket 연결 초기화 및 이벤트 리스너 설정
  connect: () => {
    const currentState = get();
    if (currentState.socket && currentState.connected) {
      console.log('[WebSocketStore] Already connected, skipping connection attempt');
      return;
    }
    
    // 기존 소켓이 있으면 정리
    if (currentState.socket) {
      currentState.socket.disconnect();
    }

    const url = 'https://backend.firemarkets.net';
    const newSocket = io(url, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      timeout: 30000,
      forceNew: true, // 새로운 연결 강제 생성
    });

    newSocket.on('connect', () => {
      set({ connected: true, error: null });
      
      // 재연결 시 기존 구독 복원
      const allSymbols = Object.keys(get().symbolSubscribers);
      if (allSymbols.length > 0) {
        const normalized = get()._normalizeSymbols(allSymbols);
        newSocket.emit('subscribe_prices', { symbols: normalized });
      }
    });

    newSocket.on('disconnect', (reason) => {
      // console.log('[Zustand Store] ❌ WebSocket Disconnected:', reason);
      set({ connected: false });
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Zustand Store] ❌ Connection Error:', err.message);
      set({ error: err.message, connected: false });
      
      // 연결 실패 시 백업 모드로 전환
      setTimeout(() => {
        const state = get();
        if (!state.connected) {
          console.log('[Zustand Store] 🔄 Switching to backup mode due to connection failure');
          set({ backupMode: true, dataSource: 'api_fallback' });
        }
      }, 5000); // 5초 후 백업 모드 전환
    });

    newSocket.on('price_update', (data) => {
      if (data.symbol) {
        const now = Date.now();
        const state = get();
        
        // 디바운싱: 같은 심볼에 대해 100ms 이내 중복 업데이트 방지
        const lastUpdateTime = state.lastUpdateTimes[data.symbol] || 0;
        if (now - lastUpdateTime < 100) {
          return;
        }
        
        const existingPrice = state.prices[data.symbol];
        
        // 기존 가격과 동일하면 업데이트하지 않음 (무한 루프 방지)
        if (existingPrice && 
            existingPrice.price === data.price && 
            existingPrice.change_amount === data.change_amount &&
            existingPrice.change_percent === data.change_percent) {
          return;
        }

        set({
          prices: {
            ...state.prices,
            [data.symbol]: {
              price: data.price,
              change_amount: data.change_amount,
              change_percent: data.change_percent,
              timestamp_utc: data.timestamp_utc,
              data_source: data.data_source
            }
          },
          loading: false,
          lastUpdate: now,
          backupMode: false,
          dataSource: 'websocket',
          lastUpdateTimes: {
            ...state.lastUpdateTimes,
            [data.symbol]: now
          }
        });
      }
    });

    newSocket.on('realtime_quote', (data) => {
      if (data.ticker) {
        const now = Date.now();
        const state = get();
        
        // 디바운싱: 같은 심볼에 대해 100ms 이내 중복 업데이트 방지
        const lastUpdateTime = state.lastUpdateTimes[data.ticker] || 0;
        if (now - lastUpdateTime < 100) {
          return;
        }
        
        const existingPrice = state.prices[data.ticker];
        
        // 기존 가격과 동일하면 업데이트하지 않음 (무한 루프 방지)
        if (existingPrice && 
            existingPrice.price === data.price && 
            existingPrice.change_amount === data.change_amount &&
            existingPrice.change_percent === data.change_percent) {
          return;
        }

        set({
          prices: {
            ...state.prices,
            [data.ticker]: {
              price: data.price,
              change_amount: data.change_amount,
              change_percent: data.change_percent,
              timestamp_utc: data.timestamp_utc,
              data_source: data.data_source
            }
          },
          loading: false,
          lastUpdate: now,
          backupMode: false,
          dataSource: 'websocket',
          lastUpdateTimes: {
            ...state.lastUpdateTimes,
            [data.ticker]: now
          }
        });
      }
    });

    set({ socket: newSocket });
  },

  // 컴포넌트가 심볼 구독을 요청할 때 호출
  subscribeSymbols: (symbols) => {
    const { socket, connected, symbolSubscribers } = get();
    if (!socket) {
      get().connect(); // 소켓이 없으면 연결 시작
      return;
    }

    const newSymbolsToSubscribe = [];
    const updatedSubscribers = { ...symbolSubscribers };
    
    symbols.forEach(symbol => {
      if (!updatedSubscribers[symbol]) {
        updatedSubscribers[symbol] = 1;
        newSymbolsToSubscribe.push(symbol);
      } else {
        updatedSubscribers[symbol]++;
      }
    });

    if (newSymbolsToSubscribe.length > 0 && connected) {
      const normalized = get()._normalizeSymbols(newSymbolsToSubscribe);
      socket.emit('subscribe_prices', { symbols: normalized });
    }
    
    set({ symbolSubscribers: updatedSubscribers });
  },

  // 컴포넌트가 언마운트될 때 구독 해제를 요청
  unsubscribeSymbols: (symbols) => {
    const { socket, connected, symbolSubscribers } = get();
    const symbolsToUnsubscribe = [];
    const updatedSubscribers = { ...symbolSubscribers };

    symbols.forEach(symbol => {
      if (updatedSubscribers[symbol]) {
        updatedSubscribers[symbol]--;
        if (updatedSubscribers[symbol] === 0) {
          delete updatedSubscribers[symbol];
          symbolsToUnsubscribe.push(symbol);
        }
      }
    });

    if (symbolsToUnsubscribe.length > 0 && connected) {
      // console.log('[Zustand Store] ➖ Unsubscribing from symbols:', symbolsToUnsubscribe);
      const normalized = get()._normalizeSymbols(symbolsToUnsubscribe);
      socket.emit('unsubscribe_prices', { symbols: normalized });
    }
    
    set({ symbolSubscribers: updatedSubscribers });
  },

  // 백업 데이터 요청
  requestBackupData: () => {
    const { socket, connected } = get();
    if (socket && connected) {
      const allSymbols = Object.keys(get().symbolSubscribers);
      if (allSymbols.length > 0) {
        // console.log('[Zustand Store] 🔄 Requesting backup data for symbols:', allSymbols);
        socket.emit('request_backup_data', { symbols: allSymbols });
        set({ backupMode: true, dataSource: 'api_fallback' });
      }
    }
  },

  // WebSocket 연결 해제
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  // 연결 상태 초기화 (필요시)
  reset: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({
      socket: null,
      connected: false,
      prices: {},
      loading: true,
      error: null,
      backupMode: false,
      dataSource: 'websocket',
      lastUpdate: null,
      symbolSubscribers: {},
      lastUpdateTimes: {}
    });
  }
}));

export default useWebSocketStore;