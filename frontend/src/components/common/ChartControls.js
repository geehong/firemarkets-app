import React from 'react';
import styles from '../charts/css/CorrelationChart.module.css';

const ChartControls = ({
  chartType,
  onChartTypeChange,
  isAreaMode,
  onAreaModeToggle,
  showFlags,
  onFlagsToggle,
  useLogScale,
  onLogScaleToggle,
  colorMode,
  onColorModeChange,
  showFlagsButton = true, // 플래그 버튼 표시 여부 (기본값: true)
  // 반감기 차트 관련 props 추가
  isHalvingChart = false,
  halvingStates = {},
  onHalvingToggle = () => {},
  halvingColors = {}
}) => {
  // Line/Spline 토글 핸들러
  const handleLineSplineToggle = () => {
    const newChartType = chartType === 'line' ? 'spline' : 'line';
    onChartTypeChange(newChartType);
  };

  return (
    <div className={styles.controlsContainer}>
      {/* 아이콘 버튼들 (좌측 정렬) */}
      <div className={styles.buttonGroup} style={{ marginRight: 'auto' }}>
        <button
          type="button"
          className={`${styles.chartButton} ${chartType === 'spline' || chartType === 'line' ? styles.chartButtonActive : styles.chartButtonInactive}`}
          onClick={handleLineSplineToggle}
        >
          <img 
            src={chartType === 'spline' ? "/assets/icon/chart-icons/Line.svg" : "/assets/icon/chart-icons/Spline.svg"}
            alt={chartType === 'spline' ? "Line Chart" : "Spline Chart"}
            className={styles.chartIcon}
          />
        </button>
        <button
          type="button"
          className={`${styles.chartButton} ${isAreaMode ? styles.chartButtonActive : styles.chartButtonInactive}`}
          onClick={onAreaModeToggle}
        >
          <img 
            src="/assets/icon/chart-icons/Area.svg"
            alt="Area Chart"
            className={styles.chartIcon}
          />
        </button>
        {showFlagsButton && (
          <button
            type="button"
            className={`${styles.chartButton} ${showFlags ? styles.flagButtonActive : styles.flagButtonInactive}`}
            onClick={onFlagsToggle}
            title="Toggle Flags"
          >
            {showFlags ? (
              <img 
                src="/assets/icon/chart-icons/Flag.svg" 
                alt="Flags On" 
                className={styles.chartIcon}
              />
            ) : (
              <div className={styles.flagContainer}>
                <img 
                  src="/assets/icon/chart-icons/Flag.svg" 
                  alt="Flags Off" 
                  className={styles.flagIconInactive}
                />
                <div className={`${styles.xLine} ${styles.xLine1}`}></div>
                <div className={`${styles.xLine} ${styles.xLine2}`}></div>
              </div>
            )}
          </button>
        )}
        <button
          type="button"
          className={`${styles.chartButton} ${useLogScale ? styles.logButtonActive : styles.logButtonInactive}`}
          onClick={onLogScaleToggle}
          title="Toggle Log Scale"
        >
          <img 
            src={useLogScale ? "/assets/icon/chart-icons/Linear.svg" : "/assets/icon/chart-icons/Log.svg"} 
            alt="Log Scale" 
            className={styles.chartIcon}
          />
        </button>
      </div>

      {/* 반감기 버튼들 (반감기 차트일 때만 표시) */}
      {isHalvingChart && (
        <div className={styles.buttonGroup} style={{ margin: '0 auto' }}>
          {[1, 2, 3, 4].map((id) => {
            const state = halvingStates[`showHalving${id}`] || false;
            const buttonColor = state ? halvingColors[id] : '#6c757d';
            return (
              <button
                key={id}
                type="button"
                className={`btn btn-sm ${state ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => onHalvingToggle(id)}
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 'bold',
                  backgroundColor: state ? buttonColor : 'transparent',
                  borderColor: buttonColor,
                  color: state ? 'white' : buttonColor
                }}
              >
                H{id}
              </button>
            );
          })}
        </div>
      )}

      {/* 색상 모드 선택 */}
      <div className={styles.buttonGroup} style={{ marginLeft: 'auto' }}>
        <button
          type="button"
          className={`btn btn-sm ${colorMode === 'dark' ? 'btn-dark' : 'btn-outline-dark'}`}
          onClick={() => onColorModeChange('dark')}
          style={{ 
            fontSize: '11px', 
            fontWeight: 'bold',
            backgroundColor: colorMode === 'dark' ? '#ffd700' : 'transparent',
            color: colorMode === 'dark' ? 'white' : '#1a1a1a',
            borderColor: colorMode === 'dark' ? '#ffd700' : '#ffd700'
          }}
        >
          DARK
        </button>
        <button
          type="button"
          className={`btn btn-sm ${colorMode === 'vivid' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => onColorModeChange('vivid')}
          style={{ 
            fontSize: '11px', 
            fontWeight: 'bold',
            backgroundColor: colorMode === 'vivid' ? '#ff6b35' : 'transparent',
            color: colorMode === 'vivid' ? 'white' : '#1e3a8a',
            borderColor: colorMode === 'vivid' ? '#ff6b35' : '#ff6b35'
          }}
        >
          VIVID
        </button>
        <button
          type="button"
          className={`btn btn-sm ${colorMode === 'high-contrast' ? 'btn-success' : 'btn-outline-success'}`}
          onClick={() => onColorModeChange('high-contrast')}
          style={{ 
            fontSize: '11px', 
            fontWeight: 'bold',
            backgroundColor: colorMode === 'high-contrast' ? '#ffff00' : 'transparent',
            color: colorMode === 'high-contrast' ? 'black' : '#000000',
            borderColor: colorMode === 'high-contrast' ? '#ffff00' : '#ffff00'
          }}
        >
          HIGH
        </button>
        <button
          type="button"
          className={`btn btn-sm ${colorMode === 'simple' ? 'btn-secondary' : 'btn-outline-secondary'}`}
          onClick={() => onColorModeChange('simple')}
          style={{ 
            fontSize: '11px', 
            fontWeight: 'bold',
            backgroundColor: colorMode === 'simple' ? '#f39c12' : 'transparent',
            color: colorMode === 'simple' ? 'white' : '#374151',
            borderColor: colorMode === 'simple' ? '#f39c12' : '#f39c12'
          }}
        >
          SIMPLE
        </button>
      </div>
    </div>
  );
};

export default ChartControls;
