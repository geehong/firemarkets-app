import React from 'react';
import styles from './ChartControls.module.css';

interface ChartControlsProps {
    chartType: 'line' | 'spline' | 'area' | 'areaspline';
    onChartTypeChange: (type: 'line' | 'spline' | 'area' | 'areaspline') => void;
    isAreaMode?: boolean;
    onAreaModeToggle?: () => void;
    showFlags?: boolean;
    onFlagsToggle?: () => void;
    useLogScale: boolean;
    onLogScaleToggle: (checked: boolean) => void;
    colorMode: 'dark' | 'vivid' | 'high-contrast' | 'simple';
    onColorModeChange: (mode: 'dark' | 'vivid' | 'high-contrast' | 'simple') => void;
    showFlagsButton?: boolean;
    // 반감기 차트 관련 props 추가
    isHalvingChart?: boolean;
    halvingStates?: Record<string, boolean>;
    onHalvingToggle?: (id: number) => void;
    halvingColors?: Record<number, string>;
}

const ChartControls: React.FC<ChartControlsProps> = ({
    chartType,
    onChartTypeChange,
    isAreaMode = false,
    onAreaModeToggle,
    showFlags = false,
    onFlagsToggle,
    useLogScale,
    onLogScaleToggle,
    colorMode,
    onColorModeChange,
    showFlagsButton = true,
    // 반감기 차트 관련 props
    isHalvingChart = false,
    halvingStates = {},
    onHalvingToggle = () => { },
    halvingColors = {}
}) => {
    // Line/Spline 토글 핸들러
    const handleLineSplineToggle = () => {
         
        // @ts-ignore
        const newChartType = chartType === 'line' ? 'spline' : 'line';
        onChartTypeChange(newChartType);
    };

    return (
        <div className={styles['chart-controls-container']}>
            {/* 아이콘 버튼들 (좌측 정렬) */}
            <div className={styles['chart-button-group']} style={{ marginRight: 'auto' }}>
                <button
                    type="button"
                    className={`${styles['chart-button']} ${chartType === 'spline' || chartType === 'line' ? styles['chart-button-active'] : styles['chart-button-inactive']}`}
                    onClick={handleLineSplineToggle}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={chartType === 'spline' ? "/images/icons/chart-icons/Line.svg" : "/images/icons/chart-icons/Spline.svg"}
                        alt={chartType === 'spline' ? "Line Chart" : "Spline Chart"}
                        className={styles['chart-icon']}
                    />
                </button>
                <button
                    type="button"
                    className={`${styles['chart-button']} ${isAreaMode ? styles['chart-button-active'] : styles['chart-button-inactive']}`}
                    onClick={onAreaModeToggle}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/icons/chart-icons/Area.svg"
                        alt="Area Chart"
                        className={styles['chart-icon']}
                    />
                </button>
                {showFlagsButton && (
                    <button
                        type="button"
                        className={`${styles['chart-button']} ${showFlags ? styles['flag-button-active'] : styles['flag-button-inactive']}`}
                        onClick={onFlagsToggle}
                        title="Toggle Flags"
                    >
                        {showFlags ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src="/images/icons/chart-icons/Flag.svg"
                                alt="Flags On"
                                className={styles['chart-icon']}
                            />
                        ) : (
                            <div className={styles['flag-container']}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/images/icons/chart-icons/Flag.svg"
                                    alt="Flags Off"
                                    className={styles['flag-icon-inactive']}
                                />
                                <div className={`${styles['x-line']} ${styles['x-line-1']}`}></div>
                                <div className={`${styles['x-line']} ${styles['x-line-2']}`}></div>
                            </div>
                        )}
                    </button>
                )}
                <button
                    type="button"
                    className={`${styles['chart-button']} ${useLogScale ? styles['log-button-active'] : styles['log-button-inactive']}`}
                    onClick={() => onLogScaleToggle(!useLogScale)}
                    title="Toggle Price Log Scale"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={useLogScale ? "/images/icons/chart-icons/Linear.svg" : "/images/icons/chart-icons/Log.svg"}
                        alt="Log Scale"
                        className={styles['chart-icon']}
                    />
                </button>
            </div>

            {/* 반감기 버튼들 (반감기 차트일 때만 표시) */}
            {isHalvingChart && (
                <div className={styles['chart-button-group']} style={{ margin: '0 auto' }}>
                    {[1, 2, 3, 4].map((id) => {
                        const state = halvingStates[`showHalving${id}`] || false;
                        const buttonColor = state ? halvingColors[id] : '#6c757d';
                        return (
                            <button
                                key={id}
                                type="button"
                                className={`${styles['halving-button']} ${state ? 'btn-primary' : 'btn-outline-secondary'}`}
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
            <div className={styles['chart-button-group']} style={{ marginLeft: 'auto' }}>
                <button
                    type="button"
                    className={`${styles['color-mode-button']} ${colorMode === 'dark' ? 'btn-dark' : 'btn-outline-dark'}`}
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
                    className={`${styles['color-mode-button']} ${colorMode === 'vivid' ? 'btn-primary' : 'btn-outline-primary'}`}
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
                    className={`${styles['color-mode-button']} ${colorMode === 'high-contrast' ? 'btn-success' : 'btn-outline-success'}`}
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
                    className={`${styles['color-mode-button']} ${colorMode === 'simple' ? 'btn-secondary' : 'btn-outline-secondary'}`}
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
