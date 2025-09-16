import React from 'react'
import PropTypes from 'prop-types'
import { CRow, CCol, CWidgetStatsA } from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import useRealtimePrices, { useDelaySparkline } from '../../hooks/useRealtimePrices'

// 변화율에 따른 배경색 (정방향: -10% 빨강 → 0% 회색 → +10% 초록)
const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
const lerp = (a, b, t) => a + (b - a) * t
const colorFromPercent = (pctRaw) => {
  const pct = typeof pctRaw === 'number' ? pctRaw : 0
  const p = clamp(pct, -10, 10)
  const red = [247, 53, 57]
  const gray = [65, 69, 85]
  const green = [46, 204, 89]
  let r, g, b
  if (p < 0) {
    // 하락: red → gray
    const t = (p + 10) / 10 // [-10..0] → [0..1]
    r = lerp(red[0], gray[0], t)
    g = lerp(red[1], gray[1], t)
    b = lerp(red[2], gray[2], t)
  } else {
    // 상승: gray → green
    const t = p / 10 // [0..10] → [0..1]
    r = lerp(gray[0], green[0], t)
    g = lerp(gray[1], green[1], t)
    b = lerp(gray[2], green[2], t)
  }
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) }
}

// HEX -> RGBA (투명도 percent: 0~1)
const toRGBA = (hex, alpha = 0.3) => {
  try {
    const h = hex.replace('#', '')
    const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  } catch {
    return `rgba(65,69,85, ${alpha})`
  }
}

const RealTimeWidgetsTypeA = ({ symbols = [] }) => {
  const { data: prices = {}, isLoading: pricesLoading } = useRealtimePrices(symbols, 'crypto', {
    refetchInterval: 10000,
  })
  const { data: spark = {}, isLoading: sparkLoading } = useDelaySparkline(symbols, '15m', 96, {
    refetchInterval: 60000,
  })

  const loading = pricesLoading || sparkLoading

  return (
    <CRow xs={{ gutter: 4 }}>
      {(symbols.length ? symbols : Object.keys(prices)).map((sym) => {
        const p = prices[sym] || {}
        const series = (spark[sym] || []).map((pt) => pt.price)
        const labels = (spark[sym] || []).map((pt) => pt.timestamp_utc)
        const base = colorFromPercent(p.change_percent ?? 0)
        const bg = `rgb(${base.r}, ${base.g}, ${base.b})`
        // 보더 네온 색상은 반대 톤: 상승시 레드, 하락시 그린
        const borderNeon = (p.change_percent ?? 0) >= 0
          ? 'rgba(247,53,57,0.35)'
          : 'rgba(46,204,89,0.35)'
        // 코인 티커의 USDT 접미사는 표시에서 제거
        const name = p.name || sym.replace(/USDT$/,'')
        const valueDisplay = p.price != null
          ? `$${Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : 'N/A'
        const changeDisplay = p.change_percent != null
          ? `${p.change_percent >= 0 ? '+' : ''}${Number(p.change_percent).toFixed(2)}%`
          : 'N/A'
        const amountDisplay = p.change_amount != null
          ? `${p.change_amount >= 0 ? '+' : ''}${Number(p.change_amount).toFixed(2)}`
          : 'N/A'

        return (
          <CCol sm={6} xl={4} xxl={3} key={sym}>
            <div className="rtw-card" style={{ backgroundColor: bg, borderRadius: 10, padding: 8, '--bd': borderNeon }}>
            <CWidgetStatsA
              style={{ color: '#fff', backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}
              value={<div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontWeight: 800 }}><span>{name}</span><span>{valueDisplay}</span></div>}
              title={
                <div>
                  <span>{amountDisplay}</span>
                  <span> ({changeDisplay})</span>
                </div>
              }
              chart={
                series && series.length > 0 ? (
                  <CChartLine
                    style={{ height: '56px' }}
                    data={{
                      labels,
                      datasets: [
                        {
                          label: sym,
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          borderColor: 'rgba(255,255,255,0.85)',
                          pointBackgroundColor: 'rgba(255,255,255,0.85)',
                          data: series,
                          fill: true,
                          tension: 0.35,
                        },
                      ],
                    }}
                    options={{
                      plugins: { legend: { display: false }, tooltip: { enabled: false } },
                      maintainAspectRatio: false,
                      scales: { x: { display: false }, y: { display: false } },
                      elements: { line: { borderWidth: 2, tension: 0.35 }, point: { radius: 0 } },
                    }}
                  />
                ) : (
                  <div style={{ height: '56px' }} />
                )
              }
            />
            </div>
          </CCol>
        )
      })}
    </CRow>
  )
}

RealTimeWidgetsTypeA.propTypes = {
  symbols: PropTypes.arrayOf(PropTypes.string),
}

export default RealTimeWidgetsTypeA

// 테두리 애니메이션만 적용
const rtwStyle = document.createElement('style')
rtwStyle.innerHTML = `
.rtw-card { position: relative; }
.rtw-card::after {
  content: '';
  position: absolute; inset: 0;
  border-radius: 10px;
  pointer-events: none;
  border: 0 solid rgba(255,255,255,0.0);
  box-shadow: 0 0 0 rgba(255,255,255,0.0);
  animation: rtw-neon 1.8s ease-in-out infinite;
}
@keyframes rtw-neon {
  0% {
    border-width: 0px;
    border-color: rgba(0,0,0,0.00);
    box-shadow: 0 0 0 rgba(0,0,0,0.00);
  }
  25% {
    border-width: 1px;
    border-color: var(--bd, rgba(255,255,255,0.20));
    box-shadow: 0 0 6px var(--bd, rgba(255,255,255,0.20));
  }
  50% {
    border-width: 2px;
    border-color: var(--bd, rgba(255,255,255,0.28));
    box-shadow: 0 0 10px var(--bd, rgba(255,255,255,0.28)), 0 0 16px var(--bd, rgba(255,255,255,0.18));
  }
  75% {
    border-width: 3px;
    border-color: var(--bd, rgba(255,255,255,0.35));
    box-shadow: 0 0 14px var(--bd, rgba(255,255,255,0.35)), 0 0 22px var(--bd, rgba(255,255,255,0.25));
  }
  100% {
    border-width: 0px;
    border-color: rgba(0,0,0,0.00);
    box-shadow: 0 0 0 rgba(0,0,0,0.00);
  }
}
`
document.head.appendChild(rtwStyle)


