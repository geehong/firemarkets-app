jQuery(document).ready(function($) {
    const coinSettings = {
      BTC: {
        id: 'BTCUSDT',
        localFile: cryptoChartData.localFile,
        events: [
          { name: 'BTC Halving 1 (2012)', date: '2012-11-28' },
          { name: 'BTC Halving 2 (2016)', date: '2016-07-09' },
          { name: 'BTC Halving 3 (2020)', date: '2020-05-11' },
          { name: 'BTC Halving 4 (2024)', date: '2024-04-01' }
        ]
      },
      ETH: {
        id: 'ETHUSDT',
        events: [
          { name: 'ETH Merge (2022)', date: '2022-09-15' }
        ]
      }
    };
    let currentCoin = 'BTC';
    let cachedData = {};
    const loadingPromises = {};
    const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
    const conversionRates = { USD: 1, KRW: 1300, EUR: 0.9 };
    const maCache = {};
  
    function showLoading() { $('#loading-overlay').css('display', 'flex'); }
    function hideLoading() { $('#loading-overlay').css('display', 'none'); }
    function showError(message) {
      $('#error-message').css('display', 'block').text(message);
      $('#retry-button').css('display', 'inline-block');
    }
    function hideError() {
      $('#error-message').css('display', 'none').text('');
      $('#retry-button').css('display', 'none');
    }
    function updateRealTimePrice(price) {
      const currency = $('#currency-select').val();
      const convertedPrice = (price * conversionRates[currency]).toFixed(2);
      $('#realtime-price').text(`Live: ${convertedPrice} ${currency}`);
    }
    function hideRealTimePrice() {
      $('#realtime-price').text('');
    }
  
    function downsampleData(data, maxPoints = 1000) {
      if (data.length <= maxPoints) return data;
      const step = Math.ceil(data.length / maxPoints);
      return data.filter((_, i) => i % step === 0);
    }
  
    async function fetchWithRetry(url, retries = 3, timeout = 10000) {
      for (let i = 0; i < retries; i++) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
          return response;
        } catch (error) {
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    }
  
    async function fetchLocalData() {
      try {
        const response = await fetchWithRetry(coinSettings.BTC.localFile);
        const data = await response.json();
        return data.map(item => ({
          Date: new Date(item.Start).getTime(),
          Open: parseFloat(item.Open),
          High: parseFloat(item.High),
          Low: parseFloat(item.Low),
          Close: parseFloat(item.Close),
          Volume: parseFloat(item.Volume),
          Cap: parseFloat(item['Market Cap'] || 0)
        })).sort((a, b) => a.Date - b.Date);
      } catch (error) {
        console.error('Error loading local data:', error);
        throw error;
      }
    }
  
    async function fetchBinanceData(symbol, startTime, endTime) {
      try {
        const response = await fetchWithRetry(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${startTime}&endTime=${endTime}`);
        const data = await response.json();
        return data.map(item => ({
          Date: item[0],
          Open: parseFloat(item[1]),
          High: parseFloat(item[2]),
          Low: parseFloat(item[3]),
          Close: parseFloat(item[4]),
          Volume: parseFloat(item[5]),
          Cap: 0
        }));
      } catch (error) {
        console.error('Error fetching Binance data:', error);
        return await fetchCoinGeckoData(symbol, startTime, endTime);
      }
    }
  
    async function fetchCoinGeckoData(symbol, startTime, endTime) {
      try {
        const coinId = symbol.startsWith('BTC') ? 'bitcoin' : 'ethereum';
        const days = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
        const response = await fetchWithRetry(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
        const data = await response.json();
        return data.prices.map(item => ({
          Date: item[0],
          Open: item[1],
          High: item[1],
          Low: item[1],
          Close: item[1],
          Volume: 0,
          Cap: 0
        }));
      } catch (error) {
        console.error('Error fetching CoinGecko data:', error);
        throw error;
      }
    }
  
    async function loadCoinData(coinKey) {
      if (loadingPromises[coinKey]) return loadingPromises[coinKey];
      showLoading();
      loadingPromises[coinKey] = (async () => {
        const cacheKey = `coinData_${coinKey}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            cachedData[coinKey] = parsed.data;
            delete loadingPromises[coinKey];
            hideLoading();
            return parsed.data;
          }
        }
        try {
          let localData = coinKey === 'BTC' ? await fetchLocalData() : [];
          const mostRecentDate = localData.length > 0 ? new Date(localData[localData.length - 1].Date) : new Date(coinSettings[coinKey].events[0].date);
          const today = new Date();
          let binanceData = [];
          if (mostRecentDate < today || localData.length === 0) {
            const startTime = mostRecentDate.getTime();
            const endTime = today.getTime();
            binanceData = await fetchBinanceData(coinSettings[coinKey].id, startTime, endTime);
          }
          const combinedData = [...localData, ...binanceData]
            .filter((item, index, self) => self.findIndex(t => t.Date === item.Date) === index)
            .sort((a, b) => a.Date - b.Date);
          cachedData[coinKey] = combinedData;
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: combinedData }));
          delete loadingPromises[coinKey];
          hideLoading();
          return combinedData;
        } catch (error) {
          delete loadingPromises[coinKey];
          hideLoading();
          throw error;
        }
      })();
      return loadingPromises[coinKey];
    }
  
    function buildEventCheckboxes(coinKey) {
      const container = $('#halving-checkboxes');
      container.empty();
      coinSettings[coinKey].events.forEach((ev, idx) => {
        const label = $('<label>').css('margin-right', '12px');
        const checkbox = $('<input>').attr({
          type: 'checkbox',
          id: `event-${idx}`,
          checked: true
        }).on('change', debouncedRedrawChart);
        label.append(checkbox).append(ev.name);
        container.append(label);
      });
    }
  
    function getSelectedEvents(coinKey) {
      return coinSettings[coinKey].events.filter((_, idx) => {
        const checkbox = $(`#event-${idx}`);
        return checkbox.length && checkbox.is(':checked');
      });
    }
  
    function calculateMovingAverage(data, period) {
      const cacheKey = `${period}_${data.length}`;
      if (maCache[cacheKey]) return maCache[cacheKey];
      const result = [];
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        if (i < period) {
          sum += data[i].Close;
          result.push({ Date: data[i].Date, MA: i === period - 1 ? sum / period : null });
        } else {
          sum = sum - data[i - period].Close + data[i].Close;
          result.push({ Date: data[i].Date, MA: sum / period });
        }
      }
      maCache[cacheKey] = result;
      return result;
    }
  
    function calculateRSI(data, period = 14) {
      const rsi = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period) {
          rsi.push({ Date: data[i].Date, RSI: null });
        } else {
          let gains = 0, losses = 0;
          for (let j = i - period + 1; j <= i; j++) {
            const change = data[j].Close - data[j - 1].Close;
            if (change >= 0) gains += change;
            else losses -= change;
          }
          const rs = gains / (losses || 1);
          rsi.push({ Date: data[i].Date, RSI: 100 - (100 / (1 + rs)) });
        }
      }
      return rsi;
    }
  
    function getClosestDataForDate(targetTime, dataArray) {
      if (!dataArray.length) return null;
      let left = 0, right = dataArray.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (dataArray[mid].Date === targetTime) return dataArray[mid];
        if (dataArray[mid].Date < targetTime) left = mid + 1;
        else right = mid - 1;
      }
      const leftItem = dataArray[right] || dataArray[0];
      const rightItem = dataArray[left] || dataArray[dataArray.length - 1];
      return Math.abs(leftItem.Date - targetTime) < Math.abs(rightItem.Date - targetTime) ? leftItem : rightItem;
    }
  
    function addMATrace(traces, maArr, period, ev, evTime, startPrice, baseClose, minDays, maxDays, color, currency) {
      const maData = maArr.map(maItem => {
        const dDays = (maItem.Date - evTime) / (1000 * 60 * 60 * 24);
        return (maItem.MA !== null && dDays >= minDays && dDays <= maxDays)
          ? { x: Math.round(dDays), y: maItem.MA * (startPrice / baseClose) * conversionRates[currency], time: maItem.Date }
          : null;
      }).filter(d => d);
      traces.push({
        x: maData.map(d => d.x),
        y: maData.map(d => d.y),
        type: 'scattergl',
        mode: 'lines',
        name: `${ev.name} MA(${period})`,
        line: { dash: 'dot', color, width: 1 }
      });
    }
  
    function processChartData({ dataArray, events, maxDays, startPrice, showPreEvent, preEventDays, showMA60, showMA120, showVolume, showRSI, currency }) {
      if (!dataArray || !dataArray.length) return [];
      const sampledData = downsampleData(dataArray, 1000);
      const minDays = showPreEvent ? -Math.abs(preEventDays) : 0;
      const traces = [];
  
      events.forEach((ev) => {
        const evTime = new Date(ev.date).getTime();
        const evClosestItem = getClosestDataForDate(evTime, sampledData);
        if (!evClosestItem) return;
        const baseClose = evClosestItem.Close || 1;
        const lineData = [];
        sampledData.forEach(item => {
          const dDays = (item.Date - evTime) / (1000 * 60 * 60 * 24);
          if (dDays >= minDays && dDays <= maxDays) {
            const convertedPrice = item.Close * (startPrice / baseClose) * conversionRates[currency];
            lineData.push({ x: Math.round(dDays), y: convertedPrice, time: item.Date });
          }
        });
        if (lineData.length === 0 && showPreEvent) {
          showError("이벤트 이전 데이터가 부족합니다.");
        }
        traces.push({
          x: lineData.map(d => d.x),
          y: lineData.map(d => d.y),
          type: 'scattergl',
          mode: 'lines',
          name: ev.name,
          line: { width: 2 }
        });
  
        if (showMA60) {
          const ma60Arr = calculateMovingAverage(sampledData, 60);
          addMATrace(traces, ma60Arr, 60, ev, evTime, startPrice, baseClose, minDays, maxDays, 'blue', currency);
        }
        if (showMA120) {
          const ma120Arr = calculateMovingAverage(sampledData, 120);
          addMATrace(traces, ma120Arr, 120, ev, evTime, startPrice, baseClose, minDays, maxDays, 'red', currency);
        }
      });
  
      if (showVolume && events.length > 0) {
        const mainEventTime = new Date(events[0].date).getTime();
        const volData = sampledData.map(item => {
          const dDays = (item.Date - mainEventTime) / (1000 * 60 * 60 * 24);
          return (dDays >= minDays && dDays <= maxDays) ? { x: Math.round(dDays), y: item.Volume } : null;
        }).filter(d => d);
        traces.push({
          x: volData.map(d => d.x),
          y: volData.map(d => d.y),
          type: 'bar',
          name: 'Volume',
          yaxis: 'y2',
          opacity: 0.3
        });
      }
      if (showRSI && events.length > 0) {
        const rsiData = calculateRSI(sampledData);
        const rsiTrace = {
          x: rsiData.map(item => Math.round((item.Date - new Date(events[0].date).getTime()) / (1000 * 60 * 60 * 24))),
          y: rsiData.map(item => item.RSI),
          type: 'scattergl',
          mode: 'lines',
          name: 'RSI',
          yaxis: 'y3'
        };
        traces.push(rsiTrace);
      }
      return traces;
    }
  
    function updateChart(dataArray, events, maxDays, startPrice, showPreEvent, preEventDays, scale, showMA60, showMA120, showVolume, showRSI, currency) {
      const traces = processChartData({ dataArray, events, maxDays, startPrice, showPreEvent, preEventDays, showMA60, showMA120, showVolume, showRSI, currency });
      if (!traces.length) {
        $('#chart').html('<div style="text-align:center; padding:20px;">No data available to plot.</div>');
        return;
      }
      const referenceDate = new Date(coinSettings['BTC'].events[3].date);
      traces.forEach(trace => {
        if (trace.type === 'scattergl') {
          trace.customdata = trace.x.map(xVal => {
            const hoverDate = new Date(referenceDate.getTime() + xVal * 24 * 3600 * 1000);
            return `${hoverDate.getFullYear().toString().slice(-2)}/${('0' + (hoverDate.getMonth() + 1)).slice(-2)}/${('0' + hoverDate.getDate()).slice(-2)}`;
          });
          trace.hovertemplate = 'Date: %{customdata}<br>Value: %{y}<extra></extra>';
        }
      });
      const layout = {
        title: 'Enhanced Multi-Coin Event Alignment',
        xaxis: { title: 'Days Since Event', range: [showPreEvent ? -preEventDays : 0, maxDays] },
        yaxis: { title: `Price (${currency})`, type: scale },
        yaxis2: { title: 'Volume', overlaying: 'y', side: 'right', showgrid: false },
        yaxis3: { title: 'RSI', overlaying: 'y', side: 'left', position: 0.05, showgrid: false },
        hovermode: 'closest'
      };
      const config = {
        responsive: true,
        displayModeBar: true
      };
      Plotly.newPlot('chart', traces, layout, config);
    }
  
    function populateTable(coinData, currency) {
      if ($.fn.DataTable.isDataTable('#data-table')) $('#data-table').DataTable().destroy();
      const tableData = coinData.map((item, index) => ({
        ID: index + 1,
        Day: new Date(item.Date).toISOString().split('T')[0],
        Price: (item.Close * conversionRates[currency]).toFixed(2),
        Open: (item.Open * conversionRates[currency]).toFixed(2),
        High: (item.High * conversionRates[currency]).toFixed(2),
        Low: (item.Low * conversionRates[currency]).toFixed(2),
        Volume: (item.Volume / 1e6).toFixed(2) + 'M',
        Cap: item.Cap ? (item.Cap / 1e6).toFixed(2) + 'M' : 'N/A'
      }));
      $('#data-table').DataTable({
        data: tableData,
        columns: [
          { title: 'ID', data: 'ID' },
          { title: 'Day', data: 'Day' },
          { title: 'Price', data: 'Price' },
          { title: 'Open', data: 'Open' },
          { title: 'High', data: 'High' },
          { title: 'Low', data: 'Low' },
          { title: 'Volume', data: 'Volume' },
          { title: 'Cap', data: 'Cap' }
        ],
        order: [[1, 'desc']]
      });
    }
  
    const debounce = (func, wait) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    };
    const debouncedRedrawChart = debounce(redrawChart, 300);
  
    async function redrawChart() {
      hideError();
      const coinKey = $('#coin-select').val();
      const selectedEvents = getSelectedEvents(coinKey);
      if (!selectedEvents.length) {
        $('#event-modal').css('display', 'flex');
        return;
      }
      try {
        const coinData = await loadCoinData(coinKey);
        if (!coinData || !coinData.length) {
          $('#chart').html('<div style="text-align:center; padding:20px;">No data available for ' + coinKey + '.</div>');
          return;
        }
        const startPrice = parseFloat($('#start-price-input').val()) || 1;
        const daysAfter = parseInt($('#day-slider').val(), 10) || 0;
        const showPreEvent = $('#show-pre-halving-checkbox').is(':checked');
        const preEventDays = parseInt($('#pre-halving-days').val(), 10) || 0;
        const scale = $('#scale-log').is(':checked') ? 'log' : 'linear';
        const showMA60 = $('#ma60-checkbox').is(':checked');
        const showMA120 = $('#ma120-checkbox').is(':checked');
        const showVolume = $('#show-volume-checkbox').is(':checked');
        const showRSI = $('#rsi-checkbox').is(':checked');
        const currency = $('#currency-select').val();
        updateChart(coinData, selectedEvents, daysAfter, startPrice, showPreEvent, preEventDays, scale, showMA60, showMA120, showVolume, showRSI, currency);
        populateTable(coinData, currency);
      } catch (error) {
        showError(`Failed to redraw chart: ${error.message}`);
      }
    }
  
    $('#coin-select').on('change', async function() {
      currentCoin = this.value;
      buildEventCheckboxes(currentCoin);
      setupRealTime(currentCoin);
      await debouncedRedrawChart();
    });
    $('#day-slider').on('input', function() {
      $('#day-value').text(`${this.value} days`);
    }).on('change', debouncedRedrawChart);
    $('#update-chart').on('click', debouncedRedrawChart);
    $('#retry-button').on('click', debouncedRedrawChart);
    $('#show-pre-halving-checkbox').on('change', debouncedRedrawChart);
    $('#pre-halving-days').on('change', debouncedRedrawChart);
    $('#scale-linear').on('change', debouncedRedrawChart);
    $('#scale-log').on('change', debouncedRedrawChart);
    $('#ma60-checkbox').on('change', debouncedRedrawChart);
    $('#ma120-checkbox').on('change', debouncedRedrawChart);
    $('#show-volume-checkbox').on('change', debouncedRedrawChart);
    $('#currency-select').on('change', debouncedRedrawChart);
    $('#rsi-checkbox').on('change', debouncedRedrawChart);
    $('#modal-ok').on('click', function() {
      $('#event-modal').css('display', 'none');
    });
  
    let ws;
    function setupRealTime(coinKey) {
      if (ws) ws.close();
      if (!$('#realtime-toggle').is(':checked')) {
        hideRealTimePrice();
        return;
      }
      const symbol = coinSettings[coinKey].id.toLowerCase();
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_1d`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const latestPrice = parseFloat(data.k.c);
        if (cachedData[coinKey] && cachedData[coinKey].length) {
          const latest = cachedData[coinKey][cachedData[coinKey].length - 1];
          latest.Close = latestPrice;
          latest.Open = parseFloat(data.k.o);
          latest.High = parseFloat(data.k.h);
          latest.Low = parseFloat(data.k.l);
          latest.Volume = parseFloat(data.k.v);
          updateRealTimePrice(latestPrice);
          debouncedRedrawChart();
        }
      };
      ws.onerror = (err) => console.error('WebSocket error:', err);
      ws.onclose = () => {
        console.log('WebSocket closed, reconnecting...');
        setTimeout(() => setupRealTime(coinKey), 1000);
      };
    }
    $('#realtime-toggle').on('change', () => {
      setupRealTime(currentCoin);
    });
  
    async function initialize() {
      buildEventCheckboxes(currentCoin);
      try {
        const btcData = await loadCoinData('BTC');
        const fourthEvent = coinSettings['BTC'].events[3];
        const eventTime = new Date(fourthEvent.date).getTime();
        const eventItem = getClosestDataForDate(eventTime, btcData);
        if (eventItem) {
          $('#start-price-input').val(eventItem.Close.toFixed(2));
        }
        await redrawChart();
        setupRealTime(currentCoin);
        const chartContainer = $('#chart')[0];
        const resizeObserver = new ResizeObserver(() => Plotly.Plots.resize('chart'));
        resizeObserver.observe(chartContainer);
      } catch (error) {
        showError(`Initialization failed: ${error.message}`);
      }
    }
    // 실시간 가격 업데이트 함수
    function updateRealTimePrice(price, animate = false) {
        const currency = $('#currency-select').val();
        const convertedPrice = (price * conversionRates[currency]).toFixed(2);
        const priceElement = $('#realtime-price');
    
        if (animate) {
          // 애니메이션 실행 (첫 로드 또는 새로고침 시)
          priceElement
            .removeClass('digital-clock')
            .addClass('neon-animating')
            .text(`Live: ${convertedPrice} ${currency}`);
    
          setTimeout(() => {
            priceElement
              .removeClass('neon-animating')
              .addClass('digital-clock');
          }, 1000); // 애니메이션 지속 시간과 일치
        } else {
          // 실시간 업데이트 시 애니메이션 없이 디지털 시계 스타일만 적용
          priceElement
            .removeClass('neon-animating')
            .addClass('digital-clock')
            .text(`Live: ${convertedPrice} ${currency}`);
        }
      }

  // 실시간 가격 숨김 함수 (기존 유지)
  function hideRealTimePrice() {
    $('#realtime-price').text('').removeClass('neon-animating digital-clock');
  }

  // 실시간 업데이트 설정 함수 (일부 수정)
  function setupRealTime(coinKey) {
    if (ws) ws.close();
    if (!$('#realtime-toggle').is(':checked')) {
      hideRealTimePrice();
      return;
    }
    const symbol = coinSettings[coinKey].id.toLowerCase();
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_1d`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const latestPrice = parseFloat(data.k.c);
      if (cachedData[coinKey] && cachedData[coinKey].length) {
        const latest = cachedData[coinKey][cachedData[coinKey].length - 1];
        latest.Close = latestPrice;
        latest.Open = parseFloat(data.k.o);
        latest.High = parseFloat(data.k.h);
        latest.Low = parseFloat(data.k.l);
        latest.Volume = parseFloat(data.k.v);
        updateRealTimePrice(latestPrice); // 애니메이션 없이 호출
        debouncedRedrawChart();
      }
    };
    ws.onerror = (err) => console.error('WebSocket error:', err);
    ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      setTimeout(() => setupRealTime(coinKey), 1000);
    };
  }
  async function initialize() {
    buildEventCheckboxes(currentCoin);
    try {
      const btcData = await loadCoinData('BTC');
      const fourthEvent = coinSettings['BTC'].events[3];
      const eventTime = new Date(fourthEvent.date).getTime();
      const eventItem = getClosestDataForDate(eventTime, btcData);
      if (eventItem) {
        $('#start-price-input').val(eventItem.Close.toFixed(2));
        updateRealTimePrice(eventItem.Close, true); // 첫 로드 시 애니메이션 실행
      }
      await redrawChart();
      setupRealTime(currentCoin); // 실시간 업데이트 시작
      const chartContainer = $('#chart')[0];
      const resizeObserver = new ResizeObserver(() => Plotly.Plots.resize('chart'));
      resizeObserver.observe(chartContainer);
    } catch (error) {
      showError(`Initialization failed: ${error.message}`);
    }
  }
    initialize();
  });