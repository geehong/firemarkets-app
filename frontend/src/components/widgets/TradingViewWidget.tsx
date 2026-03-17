"use client";

import React, { useEffect, useRef, useState } from 'react';

interface TradingViewWidgetProps {
    symbol?: string;
    width?: string | number;
    height?: string | number;
    interval?: string;
    timezone?: string;
    theme?: 'light' | 'dark';
    style?: string;
    locale?: string;
    toolbar_bg?: string;
    enable_publishing?: boolean;
    hide_side_toolbar?: boolean;
    allow_symbol_change?: boolean;
    container_id?: string;
    isHeatmap?: boolean;
    isTickerTape?: boolean;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
    symbol = 'NASDAQ:QQQ',
    width = '100%',
    height = 400,
    interval = '1',
    timezone = 'Etc/UTC',
    theme = 'light',
    style = '1',
    locale = 'en',
    toolbar_bg = '#f1f3f6',
    enable_publishing = false,
    hide_side_toolbar = true,
    allow_symbol_change = true,
    container_id,
    isHeatmap = false,
    isTickerTape = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const uniqueId = useRef(`tv-widget-${Math.random().toString(36).substr(2, 9)}`);
    const [mounted, setMounted] = useState(false);
    const [id, setId] = useState<string | undefined>(undefined);

    useEffect(() => {
        setMounted(true);
        setId(container_id || uniqueId.current);
    }, [container_id]);

    useEffect(() => {
        if (!mounted || !id || !containerRef.current) return;

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;

        if (isHeatmap) {
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
            script.innerHTML = JSON.stringify({
                "exchanges": [],
                "dataSource": "S&P500",
                "grouping": "sector",
                "blockSize": "market_cap_basic",
                "blockColor": "change",
                "locale": locale,
                "symbolEdit": true,
                "colorTheme": theme,
                "hasTopBar": false,
                "isDatasetEnabled": false,
                "isIdentifySignificant": false,
                "excludeFrozenSymbols": false,
                "width": "100%",
                "height": height
            });
        } else if (isTickerTape) {
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
            script.innerHTML = JSON.stringify({
                "symbols": [
                    { "description": "S&P 500", "proName": "FOREXCOM:SPX500" },
                    { "description": "US Tech 100", "proName": "FOREXCOM:NSXUSD" },
                    { "description": "Gold", "proName": "FX_IDC:XAUUSD" },
                    { "description": "Silver", "proName": "FX_IDC:XAGUSD" },
                    { "description": "Bitcoin", "proName": "BITSTAMP:BTCUSD" },
                    { "description": "Ethereum", "proName": "BITSTAMP:ETHUSD" }
                ],
                "showSymbolLogo": true,
                "colorTheme": theme,
                "isTransparent": false,
                "displayMode": "adaptive",
                "locale": locale
            });
        } else {
            script.src = 'https://s3.tradingview.com/tv.js';
            script.onload = () => {
                if ((window as any).TradingView) {
                    new (window as any).TradingView.widget({
                        "width": width,
                        "height": height,
                        "symbol": symbol,
                        "interval": interval,
                        "timezone": timezone,
                        "theme": theme,
                        "style": style,
                        "locale": locale,
                        "toolbar_bg": toolbar_bg,
                        "enable_publishing": enable_publishing,
                        "hide_side_toolbar": hide_side_toolbar,
                        "allow_symbol_change": allow_symbol_change,
                        "container_id": id
                    });
                }
            };
        }

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [mounted, id, symbol, width, height, interval, theme, locale, isHeatmap, isTickerTape]);

    return (
        <div id={id} ref={containerRef} className="tradingview-widget-container" style={{ width: '100%', height }}>
            <div className="tradingview-widget-container__widget"></div>
        </div>
    );
};

export default TradingViewWidget;
