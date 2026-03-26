"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BoltIcon, 
  DollarLineIcon, 
  PieChartIcon, 
  UserCircleIcon,
  GridIcon,
  BoxCubeIcon
} from "../../icons/index";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { TrendingUp, TrendingDown, Info, Shield, Wallet, Zap, X, Minus, Plus } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuthNew";
import { useTreemapLive } from "@/hooks/assets/useAssets";
import { useRealtimePrices } from "@/hooks/data/useSocket";
import { 
  useVirtualWallet, 
  useVirtualPositions, 
  useCreateVirtualOrder,
  VirtualPosition 
} from "@/hooks/virtual-trading/useVirtualTrading";

interface AssetData {
  ticker: string;
  name: string;
  logo_url?: string;
  current_price: number;
  price_change_percentage_24h: number;
}

// 개별 행 컴포넌트 - 실시간 가격 구독 최적화
const VirtualTradingRow = ({ 
  asset, 
  settings,
  onOpenLeverage, 
  onOpenSize,
  onUpdateSettings,
  onOrder
}: { 
  asset: AssetData, 
  settings: { leverage: number, size: number },
  onOpenLeverage: (asset: AssetData) => void, 
  onOpenSize: (asset: AssetData) => void,
  onUpdateSettings: (ticker: string, newSettings: Partial<{ leverage: number, size: number }>) => void,
  onOrder: (ticker: string, side: 'BUY' | 'SELL', usdtAmount: number, leverage: number) => void
}) => {
  const { latestPrice } = useRealtimePrices(asset.ticker);
  const currentPrice = latestPrice?.price || asset.current_price;
  const change24h = latestPrice?.changePercent || asset.price_change_percentage_24h;

  const rowLeverage = settings.leverage;
  const rowSize = settings.size;

  return (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-4">
        <Link href={`/virtual-trading/${asset.ticker}`} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
            {asset.logo_url ? (
              <Image src={asset.logo_url} alt={asset.ticker} width={32} height={32} className="object-cover" />
            ) : (
              <span className="font-bold text-[10px]">{asset.ticker.substring(0, 3)}</span>
            )}
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">{asset.ticker}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-400 transition-colors truncate max-w-[120px]">{asset.name}</div>
          </div>
        </Link>
      </td>
      
      <td className="px-4 py-4">
        <div className="font-mono font-bold text-gray-900 dark:text-white">
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`text-xs flex items-center gap-1 ${change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change24h).toFixed(2)}%
        </div>
      </td>

      <td className="px-4 py-4 min-w-[380px]">
        <div className="flex items-center gap-2">
           <div className="relative flex-1">
             <input 
                type="text" 
                placeholder="시장가" 
                readOnly
                className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-sm focus:ring-0 font-mono text-gray-400 cursor-default"
             />
             <span className="absolute right-2 top-2 text-[10px] text-gray-400 uppercase">Market</span>
           </div>
           
           <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
             <button className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
               Isolated
             </button>
             <div className="w-px h-3 bg-gray-300 dark:bg-gray-700 mx-0.5" />
             <button 
               onClick={() => onOpenLeverage(asset)}
               className="px-2 py-1 text-[10px] font-bold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all"
             >
               {rowLeverage}x
             </button>
           </div>

           <div className="relative flex-1 group">
             <input 
                type="number" 
                placeholder="USDT" 
                value={rowSize || ''}
                onChange={(e) => onUpdateSettings(asset.ticker, { size: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono text-gray-900 dark:text-white pr-12"
             />
             <button 
               onClick={() => onOpenSize(asset)}
               className="absolute right-1 top-1 bottom-1 px-2 flex flex-col items-center justify-center gap-0 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md border border-gray-200 dark:border-gray-600 transition-all shadow-sm"
             >
               <span className="text-[8px] leading-none text-gray-400">▲</span>
               <span className="text-[10px] font-bold text-blue-500 leading-none">SIZE</span>
               <span className="text-[8px] leading-none text-gray-400">▼</span>
             </button>
           </div>
        </div>
      </td>

      <td className="px-4 py-4 min-w-[200px]">
        <div className="flex flex-col gap-1">
          <input type="text" placeholder="TP (개발중)" disabled className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-lg px-2 py-1.5 text-[10px] font-mono text-gray-400" />
          <input type="text" placeholder="SL (개발중)" disabled className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-lg px-2 py-1.5 text-[10px] font-mono text-gray-400" />
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2 justify-center">
          <button 
            onClick={() => onOrder(asset.ticker, 'BUY', rowSize, rowLeverage)}
            className="flex-1 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-green-500/20"
          >
            LONG
          </button>
          <button 
            onClick={() => onOrder(asset.ticker, 'SELL', rowSize, rowLeverage)}
            className="flex-1 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-red-500/20"
          >
            SHORT
          </button>
        </div>
      </td>
    </tr>
  );
};

const VirtualTradingDemo: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  
  const maxRows = useMemo(() => {
    if (!isAuthenticated) return 2;
    if (user?.role === 'admin' || user?.role === 'super_admin') return 10;
    return 5;
  }, [isAuthenticated, user]);

  const { data: treemapData, isLoading } = useTreemapLive({
    type_name: "Crypto",
    sort_by: "market_cap",
    sort_order: "desc",
  });

  const displayAssets = useMemo(() => {
    const assetsArray = (treemapData as any)?.data;
    if (!Array.isArray(assetsArray)) return [];
    
    return assetsArray.slice(0, maxRows).map((a: any) => ({
      ticker: a.ticker || a.asset_identifier,
      name: a.name,
      logo_url: a.logo_url,
      current_price: parseFloat(a.current_price) || 0,
      price_change_percentage_24h: parseFloat(a.price_change_percentage_24h) || 0
    }));
  }, [treemapData, maxRows]);

  const { data: walletData } = useVirtualWallet({ enabled: isAuthenticated });
  const { data: positionsData } = useVirtualPositions({ enabled: isAuthenticated });
  const createOrderMutation = useCreateVirtualOrder();

  const [assetSettings, setAssetSettings] = useState<Record<string, { leverage: number, size: number }>>({});
  const [guestBalance, setGuestBalance] = useState(100000.00);
  const [guestPositions, setGuestPositions] = useState<any[]>([]);

  const updateAssetSetting = (ticker: string, newSettings: Partial<{ leverage: number, size: number }>) => {
    setAssetSettings(prev => ({
      ...prev,
      [ticker]: {
        ...(prev[ticker] || { leverage: 20, size: 0 }),
        ...newSettings
      }
    }));
  };

  const getAssetSetting = (ticker: string) => assetSettings[ticker] || { leverage: 20, size: 0 };

  const walletBalance = isAuthenticated ? (parseFloat(String(walletData?.balance)) || 0) : guestBalance;
  const positions = isAuthenticated ? (positionsData || []) : guestPositions;
  
  const marginUsed = useMemo(() => {
    return positions.reduce((acc: number, p: any) => acc + (p.entry_price * p.quantity) / p.leverage, 0);
  }, [positions]);

  const totalPnL = useMemo(() => {
    return positions.reduce((acc: number, p: any) => acc + (parseFloat(String(p.pnl)) || 0), 0);
  }, [positions]);

  const [editingPosition, setEditingPosition] = useState<any | null>(null);
  const [editingAsset, setEditingAsset] = useState<AssetData | null>(null);
  const [modalType, setModalType] = useState<'leverage' | 'size' | null>(null);
  const [tempLeverage, setTempLeverage] = useState(20);
  const [tempSize, setTempSize] = useState(0);
  const [tempPercent, setTempPercent] = useState(0);

  const handleOpenLeverageModal = (pOrA: any) => {
    if (pOrA.ticker) {
      setEditingAsset(pOrA);
      setEditingPosition(null);
      setTempLeverage(getAssetSetting(pOrA.ticker).leverage);
    } else {
      setEditingPosition(pOrA);
      setEditingAsset(null);
      setTempLeverage(pOrA.leverage);
    }
    setModalType('leverage');
  };

  const handleOpenSizeModal = (pOrA: any) => {
    const isAsset = !!pOrA.ticker;
    if (isAsset) {
      setEditingAsset(pOrA);
      setEditingPosition(null);
      const setting = getAssetSetting(pOrA.ticker);
      setTempLeverage(setting.leverage); // Sync leverage state for size calculation
      setTempSize(setting.size);
      
      const maxPower = walletBalance * setting.leverage;
      setTempPercent(maxPower > 0 ? (setting.size / maxPower) * 100 : 0);
    } else {
      setEditingPosition(pOrA);
      setEditingAsset(null);
      setTempLeverage(pOrA.leverage);
      const currentPrice = displayAssets.find(a => a.ticker === pOrA.symbol)?.current_price || pOrA.entry_price || 1;
      const notional = pOrA.quantity * currentPrice;
      setTempSize(Number(notional.toFixed(2)));
      setTempPercent(100);
    }
    setModalType('size');
  };

  const handleConfirmEdit = () => {
    if (editingPosition && modalType) {
      if (isAuthenticated) {
        alert('포지션 설정 변경 API가 아직 활성화되지 않았습니다.');
      } else {
        setGuestPositions(prev => prev.map(p => {
          if (p.id === editingPosition.id) {
            if (modalType === 'leverage') return { ...p, leverage: tempLeverage };
            if (modalType === 'size') {
               // Update quantity based on new USDT size
               const curPrice = displayAssets.find(a => a.ticker === p.symbol)?.current_price || p.entry_price || 1;
               return { ...p, quantity: Number((tempSize / curPrice).toFixed(6)) };
            }
          }
          return p;
        }));
      }
    } else if (editingAsset && modalType) {
      updateAssetSetting(editingAsset.ticker, {
        [modalType]: modalType === 'leverage' ? tempLeverage : tempSize
      });
    }
    setModalType(null);
  };

  const handleOrder = async (ticker: string, side: 'BUY' | 'SELL', usdtAmount: number, leverage: number) => {
    if (usdtAmount <= 0) {
      alert('주문 사이즈(USDT)를 입력해주세요.');
      return;
    }

    const asset = displayAssets.find(a => a.ticker === ticker);
    if (!asset) return;

    const quantity = Number((usdtAmount / asset.current_price).toFixed(6));

    if (isAuthenticated) {
      try {
        await createOrderMutation.mutateAsync({
          symbol: ticker,
          side,
          order_type: 'MARKET',
          quantity,
          leverage
        });
        alert('주문이 완료되었습니다.');
      } catch (err: any) {
        alert('주문 실패: ' + err.message);
      }
    } else {
      if (guestPositions.length >= 2) {
        alert('익명 모드에서는 최대 2개의 포지션만 유지할 수 있습니다. 랭킹 참여와 정식 이용을 위해 로그인을 해주세요!');
        return;
      }
      const marginReq = usdtAmount / leverage;
      if (marginReq > (walletBalance - marginUsed)) {
        alert('가용 잔액이 부족합니다.');
        return;
      }
      const newPos = {
        id: 'p' + Date.now(),
        symbol: ticker,
        side,
        entry_price: asset.current_price,
        quantity,
        leverage,
        pnl: 0,
        is_active: true
      };
      setGuestPositions(prev => [newPos, ...prev]);
      alert('익명 주문이 생성되었습니다.');
    }
  };

  useEffect(() => {
    if (!isAuthenticated && guestPositions.length > 0) {
      const interval = setInterval(() => {
        setGuestPositions(prev => prev.map(p => {
          const pnlValue = p.pnl + (Math.random() - 0.5) * 5;
          return { ...p, pnl: pnlValue };
        }));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, guestPositions.length]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="text-yellow-500 fill-yellow-500" />
            가상 선물 거래 데모 <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-full font-bold ml-2">BETA</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">실시간 시세를 활용한 가상 레버리지 거래를 체험해보세요.</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex items-center gap-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isAuthenticated ? '지갑 잔액' : '시뮬레이션 투자금'}</p>
              {isAuthenticated ? (
                <p className="font-bold text-gray-900 dark:text-white font-mono">{walletBalance.toLocaleString()} USDT</p>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="number" 
                    value={guestBalance}
                    onChange={(e) => setGuestBalance(parseFloat(e.target.value) || 0)}
                    className="w-32 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-sm font-bold font-mono text-gray-900 dark:text-white outline-none"
                  />
                  <span className="text-xs font-bold text-gray-400 font-mono">USDT</span>
                </div>
              )}
            </div>
          </div>
          <div className="h-10 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">총 미실현 손익</p>
              <p className={`font-bold font-mono ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USDT
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-500 text-xs uppercase">
                <th className="px-4 py-4">자산</th>
                <th className="px-4 py-4">현재가</th>
                <th className="px-4 py-4">주문 설정 (레버리지 / 사이즈)</th>
                <th className="px-4 py-4">TP/SL</th>
                <th className="px-4 py-4 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={5} className="py-20 text-center text-gray-400">Loading assets...</td></tr>
              ) : displayAssets.map((asset: AssetData) => (
                <VirtualTradingRow 
                  key={asset.ticker} 
                  asset={asset} 
                  settings={getAssetSetting(asset.ticker)}
                  onOpenLeverage={handleOpenLeverageModal}
                  onOpenSize={handleOpenSizeModal}
                  onUpdateSettings={updateAssetSetting}
                  onOrder={handleOrder}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BoltIcon className="w-5 h-5 text-blue-500" />
            내 포지션 {!isAuthenticated && <span className="text-[10px] text-orange-500 font-bold ml-1">(익명 제한: {positions.length}/2)</span>}
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left text-[11px] min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-400 uppercase">
                <th className="px-3 py-3">Symbol</th>
                <th className="px-3 py-3">Size (Asset)</th>
                <th className="px-3 py-3">Entry Price</th>
                <th className="px-3 py-3">Mark Price</th>
                <th className="px-3 py-3">Margin</th>
                <th className="px-3 py-3 text-right">PNL(ROI %)</th>
                <th className="px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {positions.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">보유한 포지션이 없습니다.</td></tr>
              ) : positions.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-3 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 dark:text-white text-xs">{p.symbol}</span>
                      <span className={`text-[9px] font-bold ${p.side === 'BUY' || p.side === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                        {p.side === 'BUY' || p.side === 'LONG' ? 'LONG' : 'SHORT'} {p.leverage}x
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 font-mono font-bold text-gray-700 dark:text-gray-300">{p.quantity}</td>
                  <td className="px-3 py-4 text-gray-500 font-mono">${(p.entry_price || 0).toLocaleString()}</td>
                  <td className="px-3 py-4 text-gray-900 dark:text-white font-mono">${(displayAssets.find(a => a.ticker === p.symbol)?.current_price || p.entry_price || 0).toLocaleString()}</td>
                  <td className="px-3 py-4 text-gray-500 font-mono font-bold">{(p.entry_price * p.quantity / p.leverage).toFixed(2)} USDT</td>
                  <td className="px-3 py-4 text-right">
                    <div className={`font-bold text-xs ${(p.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(p.pnl || 0) >= 0 ? '+' : ''}{(p.pnl || 0).toFixed(2)} USDT
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex justify-center gap-2">
                       <button onClick={() => setGuestPositions(prev => prev.filter(pos => pos.id !== p.id))} className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors underline underline-offset-4 decoration-dotted">Market Close</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-brand-500 rounded-2xl p-6 text-white shadow-xl shadow-brand-500/20 flex items-center gap-4">
        <Shield size={24} className="shrink-0" />
        <div>
           <p className="font-bold">계정 보호 및 랭킹 시스템</p>
           <p className="text-sm opacity-80">로그인하시면 실시간 랭킹에 참여하고 더 많은 포지션을 무제한으로 관리할 수 있습니다.</p>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between p-6 pb-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {modalType === 'leverage' ? '레버리지 설정' : '주문 사이즈 설정'}
              </h3>
              <button onClick={() => setModalType(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X/></button>
            </div>

            <div className="p-6 space-y-6">
              {modalType === 'leverage' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                    <button onClick={() => setTempLeverage(Math.max(1, tempLeverage - 1))} className="p-2"><Minus/></button>
                    <span className="text-2xl font-black font-mono text-gray-900 dark:text-white">{tempLeverage}x</span>
                    <button onClick={() => setTempLeverage(Math.min(150, tempLeverage + 1))} className="p-2"><Plus/></button>
                  </div>
                  <input 
                    type="range" min="1" max="150" value={tempLeverage} 
                    onChange={(e) => setTempLeverage(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-gray-400">
                    <span>1x</span><span>150x</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                       <input 
                         type="number" 
                         value={tempSize}
                         onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setTempSize(val);
                            const maxP = walletBalance * tempLeverage;
                            setTempPercent(maxP > 0 ? (val / maxP) * 100 : 0);
                         }}
                         className="bg-transparent text-2xl font-bold font-mono text-gray-900 dark:text-white outline-none w-full"
                       />
                       <span className="text-sm font-bold text-gray-400">USDT</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="range" min="0" max="100" value={tempPercent} 
                      onChange={(e) => {
                        const p = parseInt(e.target.value);
                        setTempPercent(p);
                        setTempSize(Number(((walletBalance * tempLeverage) * (p / 100)).toFixed(2)));
                      }}
                      className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between px-1">
                      {[0, 25, 50, 75, 100].map(v => (
                        <button key={v} onClick={() => {
                          setTempPercent(v);
                          setTempSize(Number(((walletBalance * tempLeverage) * (v / 100)).toFixed(2)));
                        }} className="text-[10px] font-bold text-gray-400 hover:text-blue-500">{v}%</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button onClick={() => setModalType(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 font-bold rounded-2xl">취소</button>
                <button onClick={handleConfirmEdit} className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl">확인</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualTradingDemo;
