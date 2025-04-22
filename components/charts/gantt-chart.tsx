"use client";

import { ResponsiveLine } from '@nivo/line';
import { Task } from '@/types';

interface GanttChartProps {
  tasks: Task[];
}

interface ChartDataPoint {
  x: string;
  y: number;
  task: string;
}

interface ChartData {
  id: string;
  data: ChartDataPoint[];
}

export function GanttChart({ tasks }: GanttChartProps) {
  // Add check for empty tasks
  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tasks to display
      </div>
    );
  }

  // Group tasks by status
  const statusGroups = tasks.reduce((acc, task) => {
    // Skip tasks without due dates
    if (!task.due_date) return acc;

    const status = task.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    
    acc[status].push({
      x: new Date(task.due_date).toISOString().split('T')[0],
      y: 1,
      task: task.title
    });
    return acc;
  }, {} as Record<string, ChartDataPoint[]>);

  // Convert to Nivo line chart format and ensure there's data
  const data: ChartData[] = Object.entries(statusGroups)
    .filter(([_, tasks]) => tasks.length > 0) // Remove empty status groups
    .map(([status, tasks]) => ({
      id: status,
      data: tasks.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime())
    }));

  // If no valid data after filtering
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tasks with due dates to display
      </div>
    );
  }

  return (
    <ResponsiveLine
      data={data}
      margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
      xScale={{
        type: 'time',
        format: '%Y-%m-%d',
        useUTC: false,
        precision: 'day',
      }}
      xFormat="time:%Y-%m-%d"
      yScale={{
        type: 'linear',
        min: 0,
        max: 'auto'
      }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        format: '%b %d',
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Due Date',
        legendOffset: 36,
        legendPosition: 'middle'
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Tasks',
        legendOffset: -40,
        legendPosition: 'middle'
      }}
      enablePoints={true}
      pointSize={10}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={2}
      pointBorderColor={{ from: 'serieColor' }}
      pointLabelYOffset={-12}
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
          itemOpacity: 0.75,
          symbolSize: 12,
          symbolShape: 'circle',
          symbolBorderColor: 'rgba(0, 0, 0, .5)',
          effects: [
            {
              on: 'hover',
              style: {
                itemBackground: 'rgba(0, 0, 0, .03)',
                itemOpacity: 1
              }
            }
          ]
        }
      ]}
      tooltip={({ point }) => {
        // Find the original data point that matches this point's coordinates
        const originalData = data
          .find(series => series.id === point.serieId)
          ?.data.find(d => d.x === point.data.xFormatted);
        
        return (
          <div
            style={{
              background: 'white',
              padding: '9px 12px',
              border: '1px solid #ccc',
              borderRadius: '3px'
            }}
          >
            <strong>{originalData?.task || 'Unknown Task'}</strong>
            <br />
            Due: {new Date(point.data.x).toLocaleDateString()}
            <br />
            Status: {point.serieId}
          </div>
        );
      }}
    />
  );
} 