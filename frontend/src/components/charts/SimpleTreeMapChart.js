import React, { useMemo } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import 'highcharts/modules/treemap'

const SimpleTreeMapChart = ({ data }) => {
  const chartOptions = useMemo(() => {
    console.log('SimpleTreeMapChart - data:', data)
    
    // 간단한 테스트 데이터
    const testData = [
      {
        id: 'category1',
        name: 'Technology',
        value: 1000000
      },
      {
        id: 'asset1',
        name: 'Apple',
        value: 500000,
        parent: 'category1'
      },
      {
        id: 'asset2',
        name: 'Microsoft',
        value: 300000,
        parent: 'category1'
      },
      {
        id: 'category2',
        name: 'Finance',
        value: 800000
      },
      {
        id: 'asset3',
        name: 'JPMorgan',
        value: 400000,
        parent: 'category2'
      }
    ]

    return {
      chart: {
        backgroundColor: '#252931',
        height: 600
      },
      title: {
        text: 'Simple TreeMap Test',
        style: {
          color: 'white'
        }
      },
      series: [{
        type: 'treemap',
        data: testData,
        dataLabels: {
          enabled: true,
          style: {
            color: 'white',
            fontSize: '12px'
          }
        }
      }]
    }
  }, [data])

  return (
    <div style={{ height: '600px', backgroundColor: '#252931' }}>
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </div>
  )
}

export default SimpleTreeMapChart


