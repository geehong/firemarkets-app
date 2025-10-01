import { create } from 'zustand'
import io from 'socket.io-client'

const useWebSocketStore = create((set, get) => ({
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

  // --- Actions ---

  // WebSocket 연결 초기화 및 이벤트 리스너 설정
  connect: () => {
    if (get().socket) return; // 이미 연결 프로세스가 시작되었으면 중복 실행 방지

    const url = 'https://backend.firemarkets.net';
    const newSocket = io(url, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      // console.log('[Zustand Store] ✅ WebSocket Connected:', newSocket.id);
      set({ connected: true, error: null });
      
      // 재연결 시 기존 구독 복원
      const allSymbols = Object.keys(get().symbolSubscribers);
      if (allSymbols.length > 0) {
        // console.log('[Zustand Store] 🔄 Re-subscribing to symbols on reconnect:', allSymbols);
        newSocket.emit('subscribe_prices', { symbols: allSymbols });
      }
    });

    newSocket.on('disconnect', (reason) => {
      // console.log('[Zustand Store] ❌ WebSocket Disconnected:', reason);
      set({ connected: false });
    });

    newSocket.on('connect_error', (err) => {
      // console.error('[Zustand Store] ❌ Connection Error:', err.message);
      set({ error: err.message, connected: false });
    });

    newSocket.on('price_update', (data) => {
      if (data.symbol) {
        // console.log('[Zustand Store] 📊 Price Update:', data.symbol, data.price);
        const state = get();
        const existingPrice = state.prices[data.symbol];
        
        // 기존 가격과 동일하면 업데이트하지 않음
        if (existingPrice && existingPrice.price === data.price) {
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
          lastUpdate: Date.now(),
          backupMode: false,
          dataSource: 'websocket'
        });
      }
    });

    newSocket.on('realtime_quote', (data) => {
      if (data.ticker) {
        // console.log('[Zustand Store] 📊 Realtime Quote:', data.ticker, data.price);
        const state = get();
        const existingPrice = state.prices[data.ticker];
        
        // 기존 가격과 동일하면 업데이트하지 않음
        if (existingPrice && existingPrice.price === data.price) {
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
          lastUpdate: Date.now(),
          backupMode: false,
          dataSource: 'websocket'
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
      console.log('[Zustand Store] ➕ Subscribing to new symbols:', newSymbolsToSubscribe);
      socket.emit('subscribe_prices', { symbols: newSymbolsToSubscribe });
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
      socket.emit('unsubscribe_prices', { symbols: symbolsToUnsubscribe });
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
      symbolSubscribers: {}
    });
  }
}));

export default useWebSocketStore;