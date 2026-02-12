import { NextResponse } from 'next/server';
import { getAnalyticsData } from '@/lib/ga4';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || '30daysAgo';
        const endDate = searchParams.get('endDate') || 'today';

        const data = await getAnalyticsData({ startDate, endDate });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Analytics API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics data', details: error.message },
            { status: 500 }
        );
    }
}
