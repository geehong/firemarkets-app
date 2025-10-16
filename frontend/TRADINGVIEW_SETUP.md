# TradingView Advanced Charts Setup Guide

This guide explains how to set up the TradingView Advanced Charts library for the InteractiveOhlcvChart component.

## Prerequisites

- Access to TradingView's Advanced Charts repository (requires approval)
- Node.js and npm installed
- Basic understanding of file system operations

## Step 1: Download TradingView Library

1. Visit the [TradingView Advanced Charts Repository](https://github.com/tradingview/charting_library)
2. Request access to the repository (access is restricted)
3. Once approved, download the latest release ZIP file

## Step 2: Extract and Copy Files

1. Extract the downloaded ZIP file
2. Copy the following folders to your frontend public directory:
   ```
   /frontend/public/charting_library/
   /frontend/public/datafeeds/
   ```

## Step 3: Verify File Structure

Ensure the following files exist in your project:

```
frontend/
├── public/
│   ├── charting_library/
│   │   ├── charting_library.standalone.js
│   │   ├── charting_library.js
│   │   └── ... (other library files)
│   └── datafeeds/
│       └── udf/
│           └── dist/
│               └── bundle.js
```

## Step 4: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Charts page and click on the "TradingView Chart" tab

3. The chart should now load with real TradingView functionality instead of the demo placeholder

## Troubleshooting

### Common Issues

1. **404 Error for charting_library.standalone.js**
   - Ensure the file exists at `/public/charting_library/charting_library.standalone.js`
   - Check file permissions

2. **404 Error for datafeeds/udf/dist/bundle.js**
   - Ensure the file exists at `/public/datafeeds/udf/dist/bundle.js`
   - Verify the datafeeds folder structure

3. **CORS Issues**
   - Make sure you're serving the files from the same domain
   - Check your Next.js configuration

### Demo Mode

If the TradingView library is not installed, the component will automatically show a demo version with:
- Mock OHLCV data
- Simulated price movements
- Data table with recent values
- Setup instructions

## Configuration Options

The InteractiveOhlcvChart component supports the following props:

```typescript
interface InteractiveOhlcvChartProps {
  symbol?: string;           // Default: 'AAPL'
  interval?: string;         // Default: '1D'
  theme?: 'light' | 'dark'; // Default: 'light'
  height?: number;          // Default: 600
  width?: number | string;  // Default: '100%'
  datafeedUrl?: string;     // Default: 'https://demo-feed-data.tradingview.com'
  onSymbolChange?: (symbol: string) => void;
  onIntervalChange?: (interval: string) => void;
}
```

## Production Deployment

For production deployment:

1. Ensure all TradingView library files are included in your build
2. Test the chart functionality in your production environment
3. Consider using a CDN for better performance
4. Implement proper error handling for network issues

## License

Make sure you comply with TradingView's licensing terms for the Advanced Charts library.

## Support

For issues related to:
- TradingView library: Contact TradingView support
- Component implementation: Check the component documentation
- Setup issues: Refer to this guide or contact the development team
