import React, { useEffect, useRef, useMemo } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import 'highcharts/modules/treemap'
import 'highcharts/modules/data'
import 'highcharts/modules/exporting'
import 'highcharts/modules/offline-exporting'
import 'highcharts/modules/accessibility'
import 'highcharts/modules/coloraxis'

// Highcharts 모듈 등록 확인
// console.log('Highcharts modules loaded:', {
//   treemap: !!Highcharts.seriesTypes.treemap,
//   coloraxis: !!Highcharts.ColorAxis,
// })

// Highcharts 모듈 등록
Highcharts.setOptions({
  chart: {
    backgroundColor: '#252931',
  },
  title: {
    style: {
      color: 'white',
    },
  },
  subtitle: {
    style: {
      color: 'silver',
    },
  },
  legend: {
    itemStyle: {
      color: 'white',
    },
  },
})

const TreeMapChart = ({ data, viewType, filters, searchTerm }) => {
  const chartRef = useRef(null)

  // 티커에서 회사명 추출하는 함수
  const extractCompanyName = (ticker) => {
    if (!ticker) return ''

    // 특별한 케이스들 먼저 처리
    const specialCases = {
      NVIDIANVDA: 'NVIDIA',
      MicrosoftMSFT: 'Microsoft',
      AppleAAPL: 'Apple',
      'Alphabet (Google)GOOG': 'Alphabet (Google)',
      'Meta Platforms (Facebook)META': 'Meta Platforms (Facebook)',
      'Saudi Aramco2222.SR': 'Saudi Aramco',
      BroadcomAVGO: 'Broadcom',
      TSMCTSM: 'TSMC',
      'Berkshire HathawayBRK-B': 'Berkshire Hathaway',
      TeslaTSLA: 'Tesla',
      'JPMorgan ChaseJPM': 'JPMorgan Chase',
      WalmartWMT: 'Walmart',
      'Eli LillyLLY': 'Eli Lilly',
      VisaV: 'Visa',
      OracleORCL: 'Oracle',
      TencentTCEHY: 'Tencent',
      NetflixNFLX: 'Netflix',
      MastercardMA: 'Mastercard',
      'Exxon MobilXOM': 'Exxon Mobil',
      CostcoCOST: 'Costco',
      'Johnson & JohnsonJNJ': 'Johnson & Johnson',
      'Procter & GamblePG': 'Procter & Gamble',
      'Home DepotHD': 'Home Depot',
      'ICBC1398.HK': 'ICBC',
      SAPSAP: 'SAP',
      'Bank of AmericaBAC': 'Bank of America',
      AbbVieABBV: 'AbbVie',
      PalantirPLTR: 'Palantir',
      ASMLASML: 'ASML',
      OTHER_STOCKS: 'Other Stocks',
      GOVERNMENTBONDS: 'Government Bonds',
      CORPORATEBONDS: 'Corporate Bonds',
    }

    // 특별한 케이스가 있으면 반환
    if (specialCases[ticker]) {
      return specialCases[ticker]
    }

    // 일반적인 패턴들 처리
    const patterns = [
      // NVIDIA NVDA -> NVIDIA
      /^([A-Za-z]+)[A-Z]{2,}$/,
      // Microsoft MSFT -> Microsoft
      /^([A-Za-z\s]+)[A-Z]{2,}$/,
      // Apple AAPL -> Apple
      /^([A-Za-z\s]+)\s[A-Z]{2,}$/,
      // Alphabet (Google) GOOG -> Alphabet (Google)
      /^([A-Za-z\s\(\)]+)\s[A-Z]{2,}$/,
      // Meta Platforms (Facebook) META -> Meta Platforms (Facebook)
      /^([A-Za-z\s\(\)]+)\s[A-Z]{2,}$/,
      // Saudi Aramco 2222.SR -> Saudi Aramco
      /^([A-Za-z\s]+)\s\d+\.SR$/,
      // ICBC 1398.HK -> ICBC
      /^([A-Za-z]+)\s\d+\.HK$/,
    ]

    for (const pattern of patterns) {
      const match = ticker.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    // 패턴에 맞지 않으면 원본 반환
    return ticker
  }

  // 시가총액 포맷팅 함수
  const formatMarketCap = (value) => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(3)}T`
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`
    }
    return `$${value.toFixed(0)}`
  }

  // props 디버깅
  // console.log('TreeMapChart props:', {
  //   dataLength: data?.length,
  //   viewType,
  //   filters,
  //   searchTerm,
  //   data: data,
  // })

  // 데이터 변환 함수
  const transformData = useMemo(() => {
    // console.log('transformData called with:', { data, viewType, filters, searchTerm })

    if (!data || !Array.isArray(data)) {
      // console.log('No data or data is not array')
      return []
    }

    let filteredData = data

    // 필터 적용
    if (filters.category !== 'all') {
      filteredData = filteredData.filter((item) => item.category === filters.category)
    }
    if (filters.country !== 'all') {
      filteredData = filteredData.filter((item) => item.country === filters.country)
    }
    if (filters.sector !== 'all') {
      filteredData = filteredData.filter((item) => item.sector === filters.sector)
    }

    // 검색어 필터
    if (searchTerm) {
      filteredData = filteredData.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.ticker.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // 채권 데이터 처리 - Government, Corporate Bonds를 Global Bonds 하위로 계층화
    const governmentBond = filteredData.find(
      (item) => item.category === 'Government Bonds' && item.is_bond,
    )
    const corporateBond = filteredData.find(
      (item) => item.category === 'Corporate Bonds' && item.is_bond,
    )
    const otherData = filteredData.filter(
      (item) =>
        !item.is_bond && // 채권이 아닌 데이터만
        item.name !== 'Global Bond Market', // Global Bond Market 제외
    )

    // Global Bonds 루트 노드 생성 (Government + Corporate만)
    const flatData = []
    if (governmentBond || corporateBond) {
      const globalBondValue =
        (governmentBond?.market_cap_usd || 0) + (corporateBond?.market_cap_usd || 0)

      flatData.push({
        id: 'Global Bonds',
        name: 'Global Bonds',
        value: globalBondValue,
        colorValue: 0,
        displayValue: globalBondValue,
        formattedMarketCap: formatMarketCap(globalBondValue),
      })

      if (governmentBond) {
        const totalMarketCap = data.reduce((sum, item) => sum + (item.market_cap_usd || 0), 0)
        const rawRatio =
          totalMarketCap > 0 ? (governmentBond.market_cap_usd || 0) / totalMarketCap : 0
        const colorValue = rawRatio > 0 ? Math.log(rawRatio * 1000 + 1) / Math.log(1000) : 0

        flatData.push({
          id: 'Government Bonds',
          name: 'Government Bonds',
          value: governmentBond.market_cap_usd || 0,
          parent: 'Global Bonds',
          colorValue: colorValue,
          displayValue: governmentBond.market_cap_usd || 0,
          formattedMarketCap: formatMarketCap(governmentBond.market_cap_usd || 0),
          custom: {
            ...governmentBond,
          },
        })
      }

      if (corporateBond) {
        const totalMarketCap = data.reduce((sum, item) => sum + (item.market_cap_usd || 0), 0)
        const rawRatio =
          totalMarketCap > 0 ? (corporateBond.market_cap_usd || 0) / totalMarketCap : 0
        const colorValue = rawRatio > 0 ? Math.log(rawRatio * 1000 + 1) / Math.log(1000) : 0

        flatData.push({
          id: 'Corporate Bonds',
          name: 'Corporate Bonds',
          value: corporateBond.market_cap_usd || 0,
          parent: 'Global Bonds',
          colorValue: colorValue,
          displayValue: corporateBond.market_cap_usd || 0,
          formattedMarketCap: formatMarketCap(corporateBond.market_cap_usd || 0),
          custom: {
            ...corporateBond,
          },
        })
      }
    }

    // 나머지 자산 카테고리별 그룹화
    if (viewType === 'category') {
      const categories = {}

      // 카테고리별로 데이터 그룹화
      otherData.forEach((item) => {
        const category = item.category || 'Unknown'
        if (!categories[category]) {
          categories[category] = {
            id: category,
            name: category,
            value: 0,
            colorValue: 0,
            displayValue: 0,
            total_market_cap: 0,
            top_assets: [],
            remaining_assets: [],
          }
        }

        if (item.is_remaining) {
          categories[category].remaining_assets.push(item)
        } else {
          categories[category].top_assets.push(item)
        }

        categories[category].value += item.market_cap_usd || 0
        categories[category].displayValue += item.market_cap_usd || 0
        categories[category].total_market_cap += item.market_cap_usd || 0
      })

      // 카테고리 루트 노드 추가
      Object.values(categories).forEach((category) => {
        flatData.push({
          ...category,
          formattedMarketCap: formatMarketCap(category.value),
        })
      })

      // 각 카테고리 내부에 자산들 추가
      Object.entries(categories).forEach(([categoryName, category]) => {
        const categoryTotal = category.value

        // Other Stocks 제거하고 상위 30개가 전체 카테고리 크기를 차지하도록 확대
        const topAssetsTotal = category.top_assets.reduce(
          (sum, item) => sum + (item.market_cap_usd || 0),
          0,
        )
        const expansionRatio = categoryTotal / topAssetsTotal // 전체 카테고리 / 상위 30개 합계

        // 상위 자산들의 값을 확대
        category.top_assets.forEach((item) => {
          const originalValue = item.market_cap_usd || 0
          const expandedValue = originalValue * expansionRatio

          // colorValue를 전체 시가총액 대비 비율로 설정 (큰 시가총액이 높은 값)
          const totalMarketCap = data.reduce((sum, item) => sum + (item.market_cap_usd || 0), 0)
          const rawRatio = totalMarketCap > 0 ? originalValue / totalMarketCap : 0
          // 로그 스케일로 변환하여 더 균형잡힌 색상 분포 생성
          const colorValue = rawRatio > 0 ? Math.log(rawRatio * 1000 + 1) / Math.log(1000) : 0

          // 회사명 추출
          const companyName = extractCompanyName(item.ticker)
          const displayName = companyName || item.name

          flatData.push({
            id: item.ticker || item.name,
            name: displayName,
            value: expandedValue,
            parent: categoryName,
            colorValue: colorValue,
            displayValue: originalValue,
            formattedMarketCap: formatMarketCap(originalValue),
            custom: {
              ticker: item.ticker,
              price: item.price_usd,
              change: item.daily_change_percent,
              country: item.country,
              sector: item.sector,
              fullName: displayName,
              ratio: ((originalValue / categoryTotal) * 100).toFixed(2) + '%',
              categoryTotal: categoryTotal,
              isTopAsset: item.is_top_asset,
              isRemaining: item.is_remaining,
              isBond: item.is_bond,
              expansionRatio: expansionRatio.toFixed(2),
            },
          })
        })
      })
    } else if (viewType === 'country') {
      // 국가별 그룹화
      const countries = {}
      otherData.forEach((item) => {
        const country = item.country || 'Unknown'
        if (!countries[country]) {
          countries[country] = {
            id: country,
            name: country,
            value: 0,
            colorValue: 0,
            displayValue: 0,
          }
        }
        countries[country].value += item.market_cap_usd || 0
        countries[country].displayValue += item.market_cap_usd || 0
      })

      // 국가 데이터 추가
      Object.values(countries).forEach((country) => {
        flatData.push({
          ...country,
          formattedMarketCap: formatMarketCap(country.value),
        })
      })

      // 개별 자산 데이터 추가 - 국가 내 비율로 색상 설정
      otherData.forEach((item) => {
        const country = item.country || 'Unknown'
        const countryTotal = countries[country]?.value || 0
        const itemValue = item.market_cap_usd || 0

        // colorValue를 전체 시가총액 대비 비율로 설정 (큰 시가총액이 높은 값)
        const totalMarketCap = data.reduce((sum, item) => sum + (item.market_cap_usd || 0), 0)
        const rawRatio = totalMarketCap > 0 ? itemValue / totalMarketCap : 0
        // 로그 스케일로 변환하여 더 균형잡힌 색상 분포 생성
        const colorValue = rawRatio > 0 ? Math.log(rawRatio * 1000 + 1) / Math.log(1000) : 0

        // 회사명 추출
        const companyName = extractCompanyName(item.ticker)
        const displayName = companyName || item.name

        flatData.push({
          id: item.ticker || item.name,
          name: displayName,
          value: itemValue,
          parent: country,
          colorValue: colorValue,
          displayValue: itemValue,
          formattedMarketCap: formatMarketCap(itemValue),
          custom: {
            ticker: item.ticker,
            price: item.price_usd,
            change: item.daily_change_percent,
            category: item.category,
            sector: item.sector,
            fullName: displayName,
            ratio: ((itemValue / countryTotal) * 100).toFixed(2) + '%',
            countryTotal: countryTotal,
          },
        })
      })
    } else if (viewType === 'sector') {
      // 섹터별 그룹화
      const sectors = {}
      otherData.forEach((item) => {
        const sector = item.sector || 'Unknown'
        if (!sectors[sector]) {
          sectors[sector] = {
            id: sector,
            name: sector,
            value: 0,
            colorValue: 0,
            displayValue: 0,
          }
        }
        sectors[sector].value += item.market_cap_usd || 0
        sectors[sector].displayValue += item.market_cap_usd || 0
      })

      // 섹터 데이터 추가
      Object.values(sectors).forEach((sector) => {
        flatData.push({
          ...sector,
          formattedMarketCap: formatMarketCap(sector.value),
        })
      })

      // 개별 자산 데이터 추가 - 섹터 내 비율로 색상 설정
      otherData.forEach((item) => {
        const sector = item.sector || 'Unknown'
        const sectorTotal = sectors[sector]?.value || 0
        const itemValue = item.market_cap_usd || 0

        // colorValue를 전체 시가총액 대비 비율로 설정 (큰 시가총액이 높은 값)
        const totalMarketCap = data.reduce((sum, item) => sum + (item.market_cap_usd || 0), 0)
        const rawRatio = totalMarketCap > 0 ? itemValue / totalMarketCap : 0
        // 로그 스케일로 변환하여 더 균형잡힌 색상 분포 생성
        const colorValue = rawRatio > 0 ? Math.log(rawRatio * 1000 + 1) / Math.log(1000) : 0

        // 회사명 추출
        const companyName = extractCompanyName(item.ticker)
        const displayName = companyName || item.name

        flatData.push({
          id: item.ticker || item.name,
          name: displayName,
          value: itemValue,
          parent: sector,
          colorValue: colorValue,
          displayValue: itemValue,
          formattedMarketCap: formatMarketCap(itemValue),
          custom: {
            ticker: item.ticker,
            price: item.price_usd,
            change: item.daily_change_percent,
            category: item.category,
            country: item.country,
            fullName: displayName,
            ratio: ((itemValue / sectorTotal) * 100).toFixed(2) + '%',
            sectorTotal: sectorTotal,
          },
        })
      })
    }

    // 디버깅: 데이터 구조 확인
    // console.log('=== TreeMap Data Debug ===')
    // console.log('Original data length:', data?.length)
    // console.log('Filtered data length:', filteredData?.length)
    // console.log('Government Bond:', governmentBond)
    // console.log('Corporate Bond:', corporateBond)
    // console.log('Other data length:', otherData?.length)
    // console.log('Flat TreeMap Data length:', flatData?.length)
    // console.log('Flat TreeMap Data:', flatData)

    // 색상 값이 있는 항목들만 확인
    const itemsWithColor = flatData.filter((item) => item.colorValue !== undefined)
    // console.log(
    //   '=== Items with colorValue ===',
    //   itemsWithColor.map((item) => ({
    //     name: item.name,
    //     colorValue: item.colorValue,
    //     parent: item.parent,
    //     ratio: item.custom?.ratio,
    //     marketCap: item.formattedMarketCap,
    //     hasFormattedMarketCap: !!item.formattedMarketCap,
    //     displayValue: item.displayValue,
    //     value: item.value,
    //   })),
    // )

    // colorValue 범위 확인
    const colorValues = itemsWithColor.map((item) => item.colorValue).filter((val) => val > 0)
    // if (colorValues.length > 0) {
    //   console.log('ColorValue range:', {
    //     min: Math.min(...colorValues),
    //     max: Math.max(...colorValues),
    //     avg: colorValues.reduce((a, b) => a + b, 0) / colorValues.length,
    //   })
    // }

    return flatData
  }, [data, viewType, filters, searchTerm])

  const chartOptions = useMemo(
    () => ({
      chart: {
        backgroundColor: '#252931',
        height: 600,
      },
      series: [
        {
          name: 'All',
          type: 'treemap',
          layoutAlgorithm: 'squarified',
          allowDrillToNode: true,
          animationLimit: 1000,
          borderColor: '#252931',
          color: '#252931',
          opacity: 0.01,
          nodeSizeBy: 'leaf',
          dataLabels: {
            enabled: true,
            allowOverlap: true,
            style: {
              fontSize: '0.9em',
              textOutline: 'none',
            },
          },
          levels: [
            {
              level: 1,
              dataLabels: {
                enabled: true,
                headers: true,
                align: 'left',
                style: {
                  color: 'white',
                  fontWeight: 'bold',
                  lineClamp: 1,
                  textTransform: 'uppercase',
                },
                padding: 3,
              },
              borderWidth: 3,
              levelIsConstant: false,
            },
            {
              level: 2,
              dataLabels: {
                enabled: true,
                headers: true,
                align: 'center',
                format: '{point.name}<br>{point.formattedMarketCap}',
                style: {
                  color: 'white',
                  fontWeight: 'normal',
                  lineClamp: 1,
                  textOutline: 'none',
                  textTransform: 'uppercase',
                },
              },
              groupPadding: 1,
            },
            {
              level: 3,
              dataLabels: {
                enabled: true,
                align: 'center',
                format: '{point.name}<br>{point.formattedMarketCap}',
                style: {
                  color: 'white',
                  fontSize: '10px',
                },
              },
            },
          ],
          accessibility: {
            exposeAsGroupOnly: true,
          },
          breadcrumbs: {
            buttonTheme: {
              style: {
                color: 'silver',
              },
              states: {
                hover: {
                  fill: '#333',
                },
                select: {
                  style: {
                    color: 'white',
                  },
                },
              },
            },
          },
          data: transformData,
          events: {
            afterDrawDataLabels: function () {
              // console.log('=== afterDrawDataLabels called ===')
              // console.log('Total points:', this.points.length)

              this.points.forEach((point, index) => {
                // console.log(`Point ${index}:`, {
                //   name: point.name,
                //   level: point.node?.level,
                //   hasDlOptions: !!point.dlOptions,
                //   colorValue: point.colorValue,
                //   formattedMarketCap: point.formattedMarketCap,
                // })

                if ((point.node?.level === 2 || point.node?.level === 3) && point.dlOptions) {
                  const colorValue = point.colorValue || 0
                  const minFont = 8
                  const maxFont = 24
                  const fontSize = Math.round(minFont + (maxFont - minFont) * colorValue)

                  // console.log('=== Setting font size ===', {
                  //   name: point.name,
                  //   level: point.node?.level,
                  //   colorValue,
                  //   fontSize,
                  //   formattedMarketCap: point.formattedMarketCap,
                  // })

                  // 여러 방법으로 폰트 크기 설정
                  point.dlOptions.style.fontSize = fontSize + 'px'
                  if (point.dataLabel) {
                    point.dataLabel.css({
                      fontSize: fontSize + 'px',
                    })
                  }
                  // DOM 요소 직접 수정
                  if (point.dataLabel && point.dataLabel.element) {
                    point.dataLabel.element.style.fontSize = fontSize + 'px'
                  }
                }
              })
            },
          },
        },
      ],
      title: {
        text: 'World Assets TreeMap',
        align: 'left',
        style: {
          color: 'white',
        },
      },
      subtitle: {
        text: 'Color shows market cap size: Red (large) → Gray (medium) → Green (small). Click to drill down.',
        align: 'left',
        style: {
          color: 'silver',
        },
      },
      tooltip: {
        followPointer: true,
        outside: true,
        formatter: function () {
          const point = this.point
          const custom = point.custom || {}

          let tooltip = ''

          // 헤더 부분 - 카테고리 레벨과 자산 레벨 구분
          if (point.parent) {
            // 자산 레벨
            const name = custom.fullName || point.name
            const marketCap = point.formattedMarketCap || ''
            tooltip += `<span style="font-size: 0.9em"><b>${name}</b>: ${marketCap}</span><br/>`
          } else {
            // 카테고리 레벨
            const name = point.name
            const marketCap = point.formattedMarketCap || ''
            tooltip += `<span style="font-size: 0.9em"><b>${name}</b>: ${marketCap}</span><br/>`
          }

          // 카테고리 정보
          if (point.parent) {
            tooltip += `<b>Category:</b> ${point.parent}<br/>`
          }

          // 비율 정보
          if (custom.ratio) {
            tooltip += `<b>Ratio in ${point.parent || 'Category'}:</b> ${custom.ratio}<br/>`
          }

          // 일일 변동률
          if (custom.change !== undefined && custom.change !== null) {
            tooltip += `<b>Daily Change:</b> ${custom.change}%<br/>`
          }

          // 타입 정보
          if (custom.isTopAsset) {
            tooltip += `<b>Type:</b> Top 30 Asset<br/>`
          } else if (custom.isRemaining) {
            tooltip += `<b>Type:</b> Remaining Assets<br/>`
          } else if (custom.isBond) {
            tooltip += `<b>Type:</b> Bond Market<br/>`
          }

          return tooltip
        },
      },
      colorAxis: {
        minColor: '#2ecc59', // 녹색 (낮은 시가총액)
        maxColor: '#f73539', // 빨간색 (높은 시가총액)
        min: 0,
        max: 0.5,
        gridLineWidth: 0,
        labels: {
          overflow: 'allow',
          format: '{value:.1%}',
          style: {
            color: 'white',
          },
        },
      },
      plotOptions: {
        treemap: {
          states: {
            hover: {
              brightness: 0.2,
            },
          },
        },
      },
      legend: {
        itemStyle: {
          color: 'white',
        },
      },
      exporting: {
        sourceWidth: 1200,
        sourceHeight: 800,
        buttons: {
          fullscreen: {
            text: '<i class="fa fa-arrows-alt"></i> Fullscreen',
            onclick: function () {
              this.fullscreen.toggle()
            },
          },
          contextButton: {
            menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG'],
            text: '<i class="fa fa-share-alt"></i> Export',
            symbol: void 0,
            y: -2,
          },
        },
      },
      navigation: {
        buttonOptions: {
          theme: {
            fill: '#252931',
            style: {
              color: 'silver',
              whiteSpace: 'nowrap',
            },
            states: {
              hover: {
                fill: '#333',
                style: {
                  color: 'white',
                },
              },
            },
          },
          symbolStroke: 'silver',
          useHTML: true,
          y: -2,
        },
      },
    }),
    [transformData, viewType],
  )

  return (
    <div style={{ height: '600px' }}>
      <HighchartsReact highcharts={Highcharts} options={chartOptions} ref={chartRef} />
    </div>
  )
}

export default TreeMapChart
