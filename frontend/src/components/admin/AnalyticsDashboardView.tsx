'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Grid,
  Text,
  Metric,
  TabList,
  Tab,
  AreaChart,
  BarList,
  Title,
  Flex,
  Icon,
  BadgeDelta,
  DonutChart,
  List,
  ListItem,
} from '@tremor/react';
import { 
  UsersIcon, 
  CursorArrowRaysIcon, 
  DocumentTextIcon, 
  GlobeAltIcon 
} from '@heroicons/react/24/outline';

// Mock data for initial UI check if API fails
const mockData = {
  overview: {
    activeUsers: '1,234',
    screenPageViews: '5,678',
    sessions: '2,345',
    eventCount: '12,345',
  },
  trend: [
    { date: '2024-02-01', 'Active Users': 100, 'Page Views': 400 },
    { date: '2024-02-02', 'Active Users': 120, 'Page Views': 450 },
    { date: '2024-02-03', 'Active Users': 110, 'Page Views': 420 },
    { date: '2024-02-04', 'Active Users': 150, 'Page Views': 600 },
    { date: '2024-02-05', 'Active Users': 180, 'Page Views': 700 },
  ],
  topPages: [
    { name: '/', value: 2500 },
    { name: '/news', value: 1200 },
    { name: '/assets', value: 800 },
    { name: '/onchain', value: 500 },
  ],
  countries: [
    { name: 'South Korea', value: 800 },
    { name: 'United States', value: 450 },
    { name: 'Japan', value: 300 },
    { name: 'China', value: 200 },
  ],
};

export default function AnalyticsDashboardView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to fetch GA4 data: ${res.status} ${res.statusText} - ${errorText}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Text>Loading Analytics...</Text>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 space-y-4 bg-slate-50 dark:bg-slate-900 min-h-screen">
         <Title className="text-red-500">Analytics Load Error</Title>
         <Card className="border-red-200 bg-red-50">
            <Text className="text-red-600 font-bold">Error: {error || 'No data found'}</Text>
            <Text className="mt-2 text-sm text-red-500">
               이것은 주로 GA4 속성의 권한 설정이 안 되어 있을 때 발생합니다. <br/>
               아래 이메일을 GA4 [속성 액세스 관리]에 [뷰어] 권한으로 추가해 주세요:
            </Text>
            <code className="block p-3 mt-3 bg-white rounded border border-red-200 text-xs">
               gd4-firmarketsdashboard@gen-lang-client-0577450860.iam.gserviceaccount.com
            </code>
         </Card>
      </div>
    );
  }

  const { overview, trend, topPages, countries } = data;

  return (
    <div className="p-8 space-y-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-outfit">
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-2xl font-bold">Google Analytics 4</Title>
          <Text>Real-time performance overview from Property ID: 384453505</Text>
        </div>
        <BadgeDelta deltaType="moderateIncrease">Last 30 days</BadgeDelta>
      </div>

      {/* KPI Cards */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card decoration="top" decorationColor="blue">
          <Flex justifyContent="start" className="space-x-4">
            <Icon icon={UsersIcon} variant="light" size="xl" color="blue" />
            <div className="truncate">
              <Text>Active Users</Text>
              <Metric>{overview.activeUsers}</Metric>
            </div>
          </Flex>
        </Card>
        <Card decoration="top" decorationColor="indigo">
          <Flex justifyContent="start" className="space-x-4">
            <Icon icon={DocumentTextIcon} variant="light" size="xl" color="indigo" />
            <div className="truncate">
              <Text>Page Views</Text>
              <Metric>{overview.screenPageViews}</Metric>
            </div>
          </Flex>
        </Card>
        <Card decoration="top" decorationColor="violet">
          <Flex justifyContent="start" className="space-x-4">
            <Icon icon={CursorArrowRaysIcon} variant="light" size="xl" color="violet" />
            <div className="truncate">
              <Text>Sessions</Text>
              <Metric>{overview.sessions}</Metric>
            </div>
          </Flex>
        </Card>
        <Card decoration="top" decorationColor="fuchsia">
          <Flex justifyContent="start" className="space-x-4">
            <Icon icon={GlobeAltIcon} variant="light" size="xl" color="fuchsia" />
            <div className="truncate">
              <Text>Total Events</Text>
              <Metric>{overview.eventCount}</Metric>
            </div>
          </Flex>
        </Card>
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <Title>Traffic Trend</Title>
          <AreaChart
            className="h-80 mt-4"
            data={trend}
            index="date"
            categories={['Active Users', 'Page Views']}
            colors={['blue', 'indigo']}
            valueFormatter={(number: number) => number.toString()}
            showLegend={true}
          />
        </Card>

        {/* Geo / Device Distribution */}
        <Card>
          <Title>Top Countries</Title>
          <DonutChart
            className="h-60 mt-4"
            data={countries}
            category="value"
            index="name"
            colors={['slate', 'violet', 'indigo', 'rose', 'cyan']}
          />
          <List className="mt-4">
            {countries.map((item: any) => (
              <ListItem key={item.name}>
                <span>{item.name}</span>
                <span>{item.value} users</span>
              </ListItem>
            ))}
          </List>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Pages */}
        <Card>
          <Title>Most Visited Pages</Title>
          <Flex className="mt-4">
            <Text><span className="font-bold">Page Path</span></Text>
            <Text><span className="font-bold">Views</span></Text>
          </Flex>
          <BarList data={topPages} className="mt-2" color="indigo" />
        </Card>

        {/* Integration Note */}
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
          <Title className="text-white">API Integration Details</Title>
          <Text className="text-slate-100 mt-2">
            This dashboard uses the official Google Analytics Data API (Beta) to fetch
            aggregated reports.
          </Text>
          <div className="mt-6 flex gap-3">
             <div className="p-3 bg-white/10 rounded-lg">
                <Text className="text-white font-bold">Service Account</Text>
                <Text className="text-white/70 text-xs">GA4 Viewer</Text>
             </div>
             <div className="p-3 bg-white/10 rounded-lg">
                <Text className="text-white font-bold">Property ID</Text>
                <Text className="text-white/70 text-xs">384453505</Text>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
