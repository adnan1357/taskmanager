"use client";

import { ResponsiveLine } from '@nivo/line';
import { Activity } from '@/types/index';

interface ProjectProgressChartProps {
  activities: Activity[];
}

export function ProjectProgressChart({ activities }: ProjectProgressChartProps) {
  // Group activities by date and count them
  const activityData = activities.reduce((acc, activity) => {
    const date = new Date(activity.created_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = [{
    id: 'activity',
    data: Object.entries(activityData).map(([date, count]) => ({
      x: date,
      y: count
    }))
  }];

  return (
    <ResponsiveLine
      data={data}
      margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
      xScale={{ type: 'time', format: '%Y-%m-%d' }}
      yScale={{ type: 'linear', min: 0, max: 'auto' }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        format: '%b %d',
        legend: 'Date',
        legendOffset: 36,
        legendPosition: 'middle'
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Activity Count',
        legendOffset: -40,
        legendPosition: 'middle'
      }}
      pointSize={10}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={2}
      pointBorderColor={{ from: 'serieColor' }}
      enableArea={true}
      areaOpacity={0.15}
      useMesh={true}
      legends={[
        {
          anchor: 'bottom-right',
          direction: 'column',
          justify: false,
          translateX: 100,
          translateY: 0,
          itemsSpacing: 0,
          itemDirection: 'left-to-right',
          itemWidth: 80,
          itemHeight: 20,
          symbolSize: 12,
          symbolShape: 'circle'
        }
      ]}
    />
  );
} 