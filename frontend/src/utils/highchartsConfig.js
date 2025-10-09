import Highcharts from 'highcharts/highstock'

// Highcharts 모듈들을 안전하게 로드하는 함수
export const initializeHighcharts = () => {
  try {
    // 기본 모듈들만 로드 (안전한 모듈들)
    import('highcharts/modules/exporting').then(module => {
      module.default(Highcharts)
    })
    
    import('highcharts/modules/accessibility').then(module => {
      module.default(Highcharts)
    })
    
    import('highcharts/modules/stock').then(module => {
      module.default(Highcharts)
    })
    
    import('highcharts/modules/drag-panes').then(module => {
      module.default(Highcharts)
    })
    
    import('highcharts/modules/navigator').then(module => {
      module.default(Highcharts)
    })

    // 문제가 있는 모듈들은 제외
    // export-data, stock-tools, full-screen, annotations-advanced, price-indicator
    
    console.log('Highcharts modules loaded successfully')
    return Highcharts
  } catch (error) {
    console.error('Error loading Highcharts modules:', error)
    return Highcharts
  }
}

// 기본 Highcharts 인스턴스 반환
export default Highcharts
