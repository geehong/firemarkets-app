'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useOhlcv, useIntraday, useDelayedQuotes } from '@/hooks'
import './OHLCVCustomGUIChart.css'

interface OHLCVData {
  timestamp_utc: string
  open_price: string | number
  high_price: string | number
  low_price: string | number
  close_price: string | number
  volume: string | number
}

interface OHLCVCustomGUIChartProps {
  assetIdentifier?: string
  dataInterval?: string
  dataUrl?: string
  seriesId?: string
  seriesName?: string
  height?: number
  externalOhlcvData?: OHLCVData[] | null
  useIntradayData?: boolean
}

const OHLCVCustomGUIChart: React.FC<OHLCVCustomGUIChartProps> = ({
  assetIdentifier,
  dataInterval = '1d',
  dataUrl,
  seriesId = 'aapl-ohlc',
  seriesName,
  height = 650,
  externalOhlcvData = null,
  useIntradayData = false
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [Highcharts, setHighcharts] = useState<any>(null)
  const [chartData, setChartData] = useState<number[][] | null>(null)
  const [volumeData, setVolumeData] = useState<number[][] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)

  // Highcharts CSS를 동적으로 추가
  useEffect(() => {
    if (typeof document === 'undefined') return

    // 이미 추가되어 있는지 확인
    const existingLink = document.querySelector(
      'link[href="https://code.highcharts.com/css/annotations/popup.css"]'
    )
    if (existingLink) return

    // CSS 링크 추가
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = 'https://code.highcharts.com/css/annotations/popup.css'
    document.head.appendChild(link)

    // Cleanup function
    return () => {
      const linkToRemove = document.querySelector(
        'link[href="https://code.highcharts.com/css/annotations/popup.css"]'
      )
      if (linkToRemove) {
        linkToRemove.remove()
      }
    }
  }, [])

  useEffect(() => {
    const loadHighcharts = async () => {
      if (typeof window === 'undefined') return

      try {
        // @ts-ignore
        const HighchartsCoreModule = await import('highcharts/highstock')
        const HighchartsCore = HighchartsCoreModule.default

        // 기본 모듈들 동적 로드
        const baseModules = [
          // @ts-ignore
          () => import('highcharts/modules/exporting'),
          // @ts-ignore
          () => import('highcharts/modules/accessibility'),
          // @ts-ignore
          () => import('highcharts/modules/drag-panes'),
          // @ts-ignore
          () => import('highcharts/modules/full-screen'),
          // @ts-ignore
          () => import('highcharts/modules/annotations-advanced'),
          // @ts-ignore
          () => import('highcharts/modules/price-indicator'),
          // @ts-ignore
          () => import('highcharts/modules/stock-tools'),
          // @ts-ignore
          () => import('highcharts/themes/adaptive')
        ]

        // 기본 모듈들 로드
        await Promise.all(
          baseModules.map(async loader => {
            try {
              const mod = await loader()
              if (typeof mod.default === 'function') {
                ;(mod.default as any)(HighchartsCore)
              }
            } catch (err) {
              // 일부 모듈이 없을 수 있으므로 에러 무시
              console.warn('Module load warning:', err)
            }
          })
        )

        // indicators 모듈을 먼저 로드 (bollinger-bands의 의존성)
        try {
          // @ts-ignore
          const indicatorsModule = await import('highcharts/indicators/indicators')
          if (typeof indicatorsModule.default === 'function') {
            ;(indicatorsModule.default as any)(HighchartsCore)
          }
        } catch (err) {
          console.warn('Indicators module load warning:', err)
        }

        // bollinger-bands 모듈 로드 (indicators 이후에 로드)
        try {
          // @ts-ignore
          const bollingerBandsModule = await import('highcharts/indicators/bollinger-bands')
          if (typeof bollingerBandsModule.default === 'function') {
            ;(bollingerBandsModule.default as any)(HighchartsCore)
          }
        } catch (err) {
          console.warn('Bollinger bands module load warning:', err)
        }

        setHighcharts(HighchartsCore)
        setIsClient(true)
      } catch (error) {
        console.error('Failed to load Highcharts:', error)
      }
    }

    loadHighcharts()
  }, [])

  // 모바일 감지
  useEffect(() => {
    if (!isClient) return
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isClient])

  // 데이터 소스 선택
  const isTimeData = useIntradayData
  const isDailyData = !useIntradayData

  const { data: timeData, isLoading: timeLoading, error: timeError } = useIntraday(
    assetIdentifier || '',
    { dataInterval, days: 1 },
    { enabled: !!assetIdentifier && isTimeData, staleTime: 60_000, retry: 3 }
  )

  const { data: delayedData, isLoading: delayedLoading, error: delayedError } = useDelayedQuotes(
    assetIdentifier ? [assetIdentifier] : [],
    {},
    { enabled: !!assetIdentifier && isTimeData && dataInterval === '15m', staleTime: 60_000, retry: 3 }
  )

  const { data: dailyData, isLoading: dailyLoading, error: dailyError } = useOhlcv(
    assetIdentifier || '',
    { dataInterval },
    { enabled: !!assetIdentifier && isDailyData, staleTime: 60_000, retry: 3 }
  )

  const apiData = isTimeData ? (dataInterval === '15m' ? delayedData : timeData) : dailyData
  const apiLoading = isTimeData ? (dataInterval === '15m' ? delayedLoading : timeLoading) : dailyLoading
  const apiError = isTimeData ? (dataInterval === '15m' ? delayedError : timeError) : dailyError

  // 데이터 변환 및 설정
  useEffect(() => {
    if (externalOhlcvData && Array.isArray(externalOhlcvData) && externalOhlcvData.length > 0) {
      const ohlc = externalOhlcvData
        .map((r: OHLCVData) => [
          new Date(r.timestamp_utc).getTime(),
          parseFloat(String(r.open_price)) || 0,
          parseFloat(String(r.high_price)) || 0,
          parseFloat(String(r.low_price)) || 0,
          parseFloat(String(r.close_price)) || 0
        ])
        .filter((p: number[]) => p[0] > 0)
        .sort((a: number[], b: number[]) => a[0] - b[0])

      const vol = externalOhlcvData
        .map((r: OHLCVData) => [new Date(r.timestamp_utc).getTime(), parseFloat(String(r.volume)) || 0])
        .filter((p: number[]) => p[0] > 0 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] >= 0)
        .sort((a: number[], b: number[]) => a[0] - b[0])

      setChartData(ohlc)
      setVolumeData(vol)
      setError(null)
      return
    }

    if (apiError) {
      const message = `차트 데이터를 불러오는데 실패했습니다: ${(apiError as Error)?.message || apiError}`
      setError(message)
      return
    }

    if (!assetIdentifier) {
      // assetIdentifier가 없으면 dataUrl 사용 (fallback)
      if (dataUrl) {
        fetch(dataUrl)
          .then(response => response.json())
          .then(data => {
            const ohlc: number[][] = []
            const volume: number[][] = []
            const dataLength = data.length

            for (let i = 0; i < dataLength; i += 1) {
              ohlc.push([
                data[i][0], // the date
                data[i][1], // open
                data[i][2], // high
                data[i][3], // low
                data[i][4] // close
              ])

              volume.push([
                data[i][0], // the date
                data[i][5] // the volume
              ])
            }

            setChartData(ohlc)
            setVolumeData(volume)
            setError(null)
          })
          .catch(err => {
            setError(`데이터 로드 실패: ${err.message}`)
          })
      }
      return
    }

    let rows: any[] = []
    if (isTimeData && dataInterval === '15m' && delayedData) {
      rows = delayedData.quotes || []
    } else {
      rows = apiData?.data || apiData || []
    }

    if (rows && rows.length > 0) {
      const ohlc = rows
        .map((item: any) => {
          let timestamp: number
          let open: number, high: number, low: number, close: number
          if (isTimeData && dataInterval === '15m') {
            timestamp = new Date(String(item.timestamp_utc)).getTime()
            const price = parseFloat(String(item.price)) || 0
            open = high = low = close = price
          } else if (isTimeData) {
            timestamp = new Date(String(item.timestamp || item.timestamp_utc)).getTime()
            open = parseFloat(String(item.open || item.open_price)) || 0
            high = parseFloat(String(item.high || item.high_price)) || 0
            low = parseFloat(String(item.low || item.low_price)) || 0
            close = parseFloat(String(item.close || item.close_price)) || 0
          } else {
            timestamp = new Date(String(item.timestamp_utc)).getTime()
            open = parseFloat(String(item.open_price)) || 0
            high = parseFloat(String(item.high_price)) || 0
            low = parseFloat(String(item.low_price)) || 0
            close = parseFloat(String(item.close_price)) || 0
          }
          return [timestamp, open, high, low, close]
        })
        .filter((p) => p[0] > 0)
        .sort((a, b) => a[0] - b[0])

      const vol = rows
        .map((item: any) => {
          const ts = isTimeData
            ? (dataInterval === '15m'
              ? new Date(String(item.timestamp_utc)).getTime()
              : new Date(String(item.timestamp || item.timestamp_utc)).getTime())
            : new Date(String(item.timestamp_utc)).getTime()
          const v = parseFloat(String(item.volume)) || 0
          return [ts, v]
        })
        .filter((p) => p[0] > 0 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] >= 0)
        .sort((a, b) => a[0] - b[0])

      setChartData(ohlc)
      setVolumeData(vol)
      setError(null)
    } else if (!apiLoading) {
      setError('차트 데이터가 없습니다.')
    }
  }, [assetIdentifier, dataInterval, externalOhlcvData, apiData, apiLoading, apiError, isTimeData, isDailyData, delayedData, useIntradayData, dataUrl])

  useEffect(() => {
    if (!isClient || !Highcharts || !chartContainerRef.current) return
    if (!chartData || chartData.length === 0) return

    // 이미 차트가 있으면 제거
    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const initializeChart = () => {
      try {
        const ohlc = chartData
        const volume = volumeData || []

        // Popup 이벤트 추가 함수
        const addPopupEvents = (chart: any) => {
        const closePopupButtons = document.getElementsByClassName(
            'highcharts-close-popup'
          )

          // Close popup buttons
          if (closePopupButtons[0]) {
        Highcharts.addEvent(
            closePopupButtons[0],
            'click',
              function (this: HTMLElement) {
                this.parentElement!.style.display = 'none'
            }
            )
          }

          if (closePopupButtons[1]) {
        Highcharts.addEvent(
            closePopupButtons[1],
            'click',
              function (this: HTMLElement) {
                this.parentElement!.style.display = 'none'
            }
            )
          }

        // Add an indicator from popup
          const indicatorButton = document.querySelector(
            '.highcharts-popup-indicators button'
          )
          if (indicatorButton) {
            Highcharts.addEvent(indicatorButton, 'click', function () {
              const typeSelect = document.querySelector(
                        '.highcharts-popup-indicators select'
              ) as HTMLSelectElement
              const periodInput = document.querySelector(
                        '.highcharts-popup-indicators input'
              ) as HTMLInputElement

              if (typeSelect && periodInput) {
                const type = typeSelect.options[typeSelect.selectedIndex].value
                const period = periodInput.value || '14'

                chart.addSeries({
                  linkedTo: seriesId,
                    type: type,
                    params: {
                        period: parseInt(period, 10)
                    }
                })

                if (chart.stockToolbar?.indicatorsPopupContainer) {
                chart.stockToolbar.indicatorsPopupContainer.style.display =
                    'none'
            }
              }
            })
            }

        // Update an annotation from popup
          const annotationButton = document.querySelector(
            '.highcharts-popup-annotations button'
          )
          if (annotationButton) {
            Highcharts.addEvent(annotationButton, 'click', function () {
              const strokeWidthInput = document.querySelector(
                '.highcharts-popup-annotations input[name="stroke-width"]'
              ) as HTMLInputElement
              const strokeColorInput = document.querySelector(
                        '.highcharts-popup-annotations input[name="stroke"]'
              ) as HTMLInputElement

              if (strokeWidthInput && strokeColorInput && chart.currentAnnotation) {
                const strokeWidth = parseInt(strokeWidthInput.value, 10)
                const strokeColor = strokeColorInput.value

                // Stock/advanced annotations have common options under typeOptions
                if (chart.currentAnnotation.options.typeOptions) {
                    chart.currentAnnotation.update({
                        typeOptions: {
                            lineColor: strokeColor,
                            lineWidth: strokeWidth,
                            line: {
                                strokeWidth: strokeWidth,
                                stroke: strokeColor
                            },
                            background: {
                                strokeWidth: strokeWidth,
                                stroke: strokeColor
                            },
                            innerBackground: {
                                strokeWidth: strokeWidth,
                                stroke: strokeColor
                            },
                            outerBackground: {
                                strokeWidth: strokeWidth,
                                stroke: strokeColor
                            },
                            connector: {
                                strokeWidth: strokeWidth,
                                stroke: strokeColor
                            }
                        }
                  })
                } else {
                // Basic annotations:
                    chart.currentAnnotation.update({
                    shapes: [
                      {
                            'stroke-width': strokeWidth,
                            stroke: strokeColor
                      }
                    ],
                    labels: [
                      {
                            borderWidth: strokeWidth,
                            borderColor: strokeColor
                }
                    ]
                  })
                }

                if (chart.stockToolbar?.annotationsPopupContainer) {
                chart.stockToolbar.annotationsPopupContainer.style.display =
                    'none'
                }
              }
            })
          }
        }

        // 차트 생성
        const chart = Highcharts.stockChart(chartContainerRef.current, {
        chart: {
            height: height,
            width: null, // 부모 컨테이너 크기에 맞춤
            events: {
                load: function () {
                addPopupEvents(this)
                }
            }
        },
        rangeSelector: {
            selected: 2
        },
          yAxis: [
            {
            labels: {
                align: 'left'
            },
            height: '80%',
            resize: {
                enabled: true
            }
            },
            {
            labels: {
                align: 'left'
            },
            top: '80%',
            height: '20%',
            offset: 0
            }
          ],
        navigationBindings: {
            events: {
              selectButton: function (this: any, event: any) {
                let newClassName = event.button.className + ' highcharts-active'
                const topButton = event.button.parentNode.parentNode

                    if (topButton.classList.contains('right')) {
                  newClassName += ' right'
                    }

                    // If this is a button with sub buttons,
                    // change main icon to the current one:
                if (!topButton.classList.contains('highcharts-menu-wrapper')) {
                  topButton.className = newClassName
                    }

                    // Store info about active button:
                this.chart.activeButton = event.button
                },
              deselectButton: function (this: any, event: any) {
                    event.button.parentNode.parentNode.classList.remove(
                        'highcharts-active'
                )

                    // Remove info about active button:
                this.chart.activeButton = null
                },
              showPopup: function (this: any, event: any) {
                    if (!this.indicatorsPopupContainer) {
                  this.indicatorsPopupContainer = document.getElementsByClassName(
                                'highcharts-popup-indicators'
                  )[0]
                    }

                    if (!this.annotationsPopupContainer) {
                  this.annotationsPopupContainer = document.getElementsByClassName(
                                'highcharts-popup-annotations'
                  )[0]
                    }

                    if (event.formType === 'indicators') {
                  if (this.indicatorsPopupContainer) {
                    ;(this.indicatorsPopupContainer as HTMLElement).style.display =
                      'block'
                  }
                    } else if (event.formType === 'annotation-toolbar') {
                  // If user is still adding an annotation, don't show popup:
                        if (!this.chart.activeButton) {
                    this.chart.currentAnnotation = event.annotation
                    if (this.annotationsPopupContainer) {
                      ;(this.annotationsPopupContainer as HTMLElement).style.display =
                        'block'
                    }
                  }
                }
              },
              closePopup: function (this: any) {
                if (this.indicatorsPopupContainer) {
                  ;(this.indicatorsPopupContainer as HTMLElement).style.display =
                    'none'
                }
                if (this.annotationsPopupContainer) {
                  ;(this.annotationsPopupContainer as HTMLElement).style.display =
                    'none'
                }
                }
            }
        },
        stockTools: {
            gui: {
                enabled: false
            }
        },
          series: [
            {
            type: 'candlestick',
              id: seriesId,
              name: seriesName || `${assetIdentifier || 'Price'} Price`,
            data: ohlc
            },
            ...(volume && volume.length > 0 ? [{
            type: 'column',
            id: `${seriesId}-volume`,
            name: `${assetIdentifier || 'Volume'} Volume`,
            data: volume,
            yAxis: 1
            }] : [])
          ],
        responsive: {
            rules: [
              {
                condition: {
                    maxWidth: 800
                },
                chartOptions: {
                    rangeSelector: {
                        inputEnabled: false
                    }
                }
              }
            ]
          }
        })

        chartRef.current = chart
      } catch (error) {
        console.error('Failed to initialize chart:', error)
        setError(`차트 초기화 실패: ${(error as Error)?.message || error}`)
      }
    }

    initializeChart()

    // Cleanup function
    return () => {
      if (chartRef.current && chartRef.current.destroy) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [isClient, Highcharts, chartData, volumeData, seriesId, seriesName, assetIdentifier])

  if (!isClient) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-sm text-gray-600">Loading chart library...</div>
        </div>
      </div>
    )
  }

  if (apiLoading || (assetIdentifier && !chartData)) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-sm text-gray-600">Loading chart data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4" style={{ minHeight: `${height}px` }}>
        <h5 className="text-red-800 font-medium">Chart Error</h5>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="text-gray-500 mb-2">📊</div>
          <div className="text-gray-700">데이터가 없습니다.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-wrapper" style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
        {/* Indicators Popup */}
        <div className="highcharts-popup highcharts-popup-indicators" style={{ display: 'none' }}>
          <span className="highcharts-close-popup">×</span>
          <div className="highcharts-popup-wrapper">
            <label htmlFor="indicator-list">Indicator</label>
            <select name="indicator-list">
              <option value="sma">SMA</option>
              <option value="ema">EMA</option>
              <option value="bb">Bollinger bands</option>
            </select>
            <label htmlFor="period">Period</label>
            <input type="text" name="period" defaultValue="14" />
          </div>
          <button>Add</button>
        </div>

        {/* Annotations Popup */}
        <div className="highcharts-popup highcharts-popup-annotations" style={{ display: 'none' }}>
          <span className="highcharts-close-popup">×</span>
          <div className="highcharts-popup-wrapper">
            <label htmlFor="stroke">Color</label>
            <input type="text" name="stroke" />
            <label htmlFor="stroke-width">Width</label>
            <input type="text" name="stroke-width" />
          </div>
          <button>Save</button>
        </div>

        {/* Stock Tools Toolbar */}
        <div className="highcharts-stocktools-wrapper highcharts-bindings-container highcharts-bindings-wrapper">
          <div className="highcharts-menu-wrapper">
            <ul className="highcharts-stocktools-toolbar stocktools-toolbar">
              <li className="highcharts-indicators" title="Indicators">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">IC</span>
              </li>
              <li className="highcharts-label-annotation" title="Simple shapes">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">SH</span>
                <span className="highcharts-submenu-item-arrow highcharts-arrow-right"></span>
                <ul className="highcharts-submenu-wrapper">
                  <li className="highcharts-label-annotation" title="Label">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Label</span>
                  </li>
                  <li className="highcharts-circle-annotation" title="Circle">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Circle</span>
                  </li>
                  <li className="highcharts-rectangle-annotation" title="Rectangle">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Rectangle</span>
                  </li>
                  <li className="highcharts-ellipse-annotation" title="Ellipse">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Ellipse</span>
                  </li>
                </ul>
              </li>
              <li className="highcharts-segment" title="Lines">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">LN</span>
                <span className="highcharts-submenu-item-arrow highcharts-arrow-right"></span>
                <ul className="highcharts-submenu-wrapper">
                  <li className="highcharts-segment" title="Segment">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Segment</span>
                  </li>
                  <li className="highcharts-arrow-segment" title="Arrow segment">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Arrow segment</span>
                  </li>
                  <li className="highcharts-ray" title="Ray">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Ray</span>
                  </li>
                  <li className="highcharts-arrow-ray" title="Arrow ray">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Arrow ray</span>
                  </li>
                  <li className="highcharts-infinity-line" title="Line">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Line</span>
                  </li>
                  <li className="highcharts-arrow-infinity-line" title="Arrow line">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Arrow</span>
                  </li>
                  <li className="highcharts-horizontal-line" title="Horizontal line">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Horizontal</span>
                  </li>
                  <li className="highcharts-vertical-line" title="Vertical line">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Vertical</span>
                  </li>
                </ul>
              </li>
              <li className="highcharts-elliott3" title="Crooked lines">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">CL</span>
                <span className="highcharts-submenu-item-arrow highcharts-arrow-right"></span>
                <ul className="highcharts-submenu-wrapper">
                  <li className="highcharts-elliott3" title="Elliott 3 line">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Elliot 3</span>
                  </li>
                  <li className="highcharts-elliott5" title="Elliott 5 line">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Elliot 5</span>
                  </li>
                  <li className="highcharts-crooked3" title="Crooked 3 line">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Crooked 3</span>
                  </li>
                  <li className="highcharts-crooked5" title="Crooked 5 line">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Crooked 5</span>
                  </li>
                </ul>
              </li>
              <li className="highcharts-measure-xy" title="Measure">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">MS</span>
                <span className="highcharts-submenu-item-arrow highcharts-arrow-right"></span>
                <ul className="highcharts-submenu-wrapper">
                  <li className="highcharts-measure-xy" title="Measure XY">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Measure XY</span>
                  </li>
                  <li className="highcharts-measure-x" title="Measure X">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Measure X</span>
                  </li>
                  <li className="highcharts-measure-y" title="Measure Y">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Measure Y</span>
                  </li>
                </ul>
              </li>
              <li className="highcharts-fibonacci" title="Advanced">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">AD</span>
                <span className="highcharts-submenu-item-arrow highcharts-arrow-right"></span>
                <ul className="highcharts-submenu-wrapper">
                  <li className="highcharts-fibonacci" title="Fibonacci">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Fibonacci</span>
                  </li>
                  <li className="highcharts-pitchfork" title="Pitchfork">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Pitchfork</span>
                  </li>
                  <li className="highcharts-parallel-channel" title="Parallel channel">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Parallel channel</span>
                  </li>
                </ul>
              </li>
              <li className="highcharts-vertical-counter" title="Vertical labels">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">CT</span>
                <span className="highcharts-submenu-item-arrow highcharts-arrow-right"></span>
                <ul className="highcharts-submenu-wrapper">
                  <li className="highcharts-vertical-counter" title="Vertical counter">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Counter</span>
                  </li>
                  <li className="highcharts-vertical-label" title="Vertical label">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Label</span>
                  </li>
                  <li className="highcharts-vertical-arrow" title="Vertical arrow">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Arrow</span>
                  </li>
                </ul>
              </li>
              <li className="highcharts-flag-circlepin" title="Flags">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">FL</span>
                <span className="highcharts-submenu-item-arrow highcharts-arrow-right"></span>
                <ul className="highcharts-submenu-wrapper">
                  <li className="highcharts-flag-circlepin" title="Flag circle">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Circle</span>
                  </li>
                  <li className="highcharts-flag-diamondpin" title="Flag diamond">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Diamond</span>
                  </li>
                  <li className="highcharts-flag-squarepin" title="Flag square">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Square</span>
                  </li>
                  <li className="highcharts-flag-simplepin" title="Flag simple">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Simple</span>
                  </li>
                </ul>
              </li>
              <li className="highcharts-series-type-ohlc" title="Type change">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">ST</span>
                <span className="highcharts-submenu-item-arrow highcharts-arrow-right"></span>
                <ul className="highcharts-submenu-wrapper">
                  <li className="highcharts-series-type-ohlc" title="OHLC">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">OHLC</span>
                  </li>
                  <li className="highcharts-series-type-line" title="Line">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Line</span>
                  </li>
                  <li className="highcharts-series-type-candlestick" title="Candlestick">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Candlestick</span>
                  </li>
                </ul>
              </li>
              <li className="highcharts-save-chart right" title="Save chart">
                <span className="highcharts-menu-item-btn"></span>
              </li>
              <li className="highcharts-full-screen right" title="Fullscreen">
                <span className="highcharts-menu-item-btn"></span>
              </li>
              <li className="highcharts-zoom-x right" title="Zoom change">
                <span className="highcharts-menu-item-btn"></span>
                <span className="highcharts-menu-item-title">ZM</span>
                <span className="highcharts-submenu-item-arrow highcharts-arrow-right"></span>
                <ul className="highcharts-submenu-wrapper">
                  <li className="highcharts-zoom-x" title="Zoom X">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Zoom X</span>
                  </li>
                  <li className="highcharts-zoom-y" title="Zoom Y">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Zoom Y</span>
                  </li>
                  <li className="highcharts-zoom-xy" title="Zoom XY">
                    <span className="highcharts-menu-item-btn"></span>
                    <span className="highcharts-menu-item-title">Zoom XY</span>
                  </li>
                </ul>
              </li>
              <li className="highcharts-current-price-indicator right" title="Current Price Indicators">
                <span className="highcharts-menu-item-btn"></span>
              </li>
              <li className="highcharts-toggle-annotations right" title="Toggle annotations">
                <span className="highcharts-menu-item-btn"></span>
              </li>
            </ul>
          </div>
        </div>

        {/* Chart Container */}
        <div 
          ref={chartContainerRef} 
          id={`chart-container-${seriesId}`}
          className="chart" 
          style={{ height: `${height}px`, width: '100%' }}
        ></div>
      </div>
  )
}

export default OHLCVCustomGUIChart
