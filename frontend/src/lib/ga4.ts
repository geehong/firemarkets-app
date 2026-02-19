import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Import credentials directly so they are bundled
import credentials from '../../secrets/ga4-credentials.json';

// Initialize client with credentials object
const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials,
});

const propertyId = '384453505';

export async function getAnalyticsData(dateRange: { startDate: string; endDate: string }) {
    try {
        // 1. Overview Metrics (Total Users, Sessions, Views)
        const [response]: any = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [dateRange],
            metrics: [
                { name: 'activeUsers' },
                { name: 'screenPageViews' },
                { name: 'sessions' },
                { name: 'eventCount' },
            ],
        });

        const overview = {
            activeUsers: response.rows?.[0]?.metricValues?.[0]?.value || '0',
            screenPageViews: response.rows?.[0]?.metricValues?.[1]?.value || '0',
            sessions: response.rows?.[0]?.metricValues?.[2]?.value || '0',
            eventCount: response.rows?.[0]?.metricValues?.[3]?.value || '0',
        };

        // 2. Daily Trend (for AreaChart)
        const [trendResponse]: any = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [dateRange],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
            orderBys: [{ dimension: { orderType: 'ALPHANUMERIC', dimensionName: 'date' } }],
        });

        const trend = trendResponse.rows?.map((row: any) => {
             // Parse date YYYYMMDD -> YYYY-MM-DD for better display (optional, or just pass as is)
             const d = row.dimensionValues?.[0]?.value || ''; 
             const dateFormatted = `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`;
             return {
                date: dateFormatted,
                'Active Users': parseInt(row.metricValues?.[0]?.value || '0', 10),
                'Page Views': parseInt(row.metricValues?.[1]?.value || '0', 10),
            };
        }) || [];

        // 3. Top Pages (for BarList/Table)
        const [pagesResponse]: any = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [dateRange],
            dimensions: [{ name: 'pagePath' }],
            metrics: [{ name: 'screenPageViews' }],
            limit: 10,
            orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        });

        const topPages = pagesResponse.rows?.map((row: any) => ({
            name: row.dimensionValues?.[0]?.value || 'Unknown',
            value: parseInt(row.metricValues?.[0]?.value || '0', 10),
        })) || [];

        // 4. Country/City (for DonutChart or List)
        const [geoResponse]: any = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [dateRange],
            dimensions: [{ name: 'country' }],
            metrics: [{ name: 'activeUsers' }],
            limit: 5,
            orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        });

        const countries = geoResponse.rows?.map((row: any) => ({
            name: row.dimensionValues?.[0]?.value || 'Unknown',
            value: parseInt(row.metricValues?.[0]?.value || '0', 10),
        })) || [];

        return {
            overview,
            trend,
            topPages,
            countries,
        };

    } catch (error) {
        console.error('GA4 API Error:', error);
        throw error;
    }
}
