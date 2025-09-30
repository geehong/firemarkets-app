const options = {
    title: {
        text: 'Dynamic data in Highcharts Stock'
    },

    xAxis: {
        overscroll: 500000,
        range: 4 * 200000,
        gridLineWidth: 1
    },

    rangeSelector: {
        buttons: [{
            type: 'minute',
            count: 15,
            text: '15m'
        }, {
            type: 'hour',
            count: 1,
            text: '1h'
        }, {
            type: 'all',
            count: 1,
            text: 'All'
        }],
        selected: 1,
        inputEnabled: false
    },

    navigator: {
        series: {
            color: '#000000'
        }
    },

    series: [{
        type: 'candlestick',
        color: '#FF7F7F',
        upColor: '#90EE90',
        lastPrice: {
            enabled: true,
            label: {
                enabled: true,
                backgroundColor: '#FF7F7F'
            }
        }
    }]
};

// Imitate getting point from backend
function getNewPoint(i, data) {
    const lastPoint = data[data.length - 1];

    // Add new point
    if (i === 0 || i % 10 === 0) {
        return [
            lastPoint[0] + 60000,
            lastPoint[4],
            lastPoint[4],
            lastPoint[4],
            lastPoint[4]
        ];
    }
    const updatedLastPoint = data[data.length - 1],
        newClose = Highcharts.correctFloat(
            lastPoint[4] + Highcharts.correctFloat(Math.random() - 0.5, 2),
            4
        );

    // Modify last data point
    return [
        updatedLastPoint[0],
        data[data.length - 2][4],
        newClose >= updatedLastPoint[2] ? newClose : updatedLastPoint[2],
        newClose <= updatedLastPoint[3] ? newClose : updatedLastPoint[3],
        newClose
    ];
}

// On load, start the interval that adds points
options.chart = {
    events: {
        load() {
            const chart = this,
                series = chart.series[0];

            let i = 0;

            setInterval(() => {
                const data = series.options.data,
                    newPoint = getNewPoint(i, data),
                    lastPoint = data[data.length - 1];

                // Different x-value, we need to add a new point
                if (lastPoint[0] !== newPoint[0]) {
                    series.addPoint(newPoint);
                } else {
                // Existing point, update it
                    series.options.data[data.length - 1] = newPoint;

                    series.setData(data);
                }
                i++;
            }, 100);
        }
    }
};

// Apply the data to the options
options.series[0].data = [
    [
        1317888000000,
        372.5101,
        375,
        372.2,
        372.52
    ],
    [
        1317895740000,
        377.16,
        377.79,
        377.01,
        377.4512
    ]
];

// Create the chart
Highcharts.stockChart('container', options);