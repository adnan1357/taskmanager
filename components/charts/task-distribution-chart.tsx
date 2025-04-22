"use client";

import { useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Task } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BarTooltipProps } from '@nivo/bar';

interface TaskDistributionChartProps {
  tasks: Task[];
}

interface UserTaskData {
  user: string;
  avatarUrl: string | null;
  total: number;
  high: number;
  medium: number;
  low: number;
  highPercentage: number;
  mediumPercentage: number;
  lowPercentage: number;
}

interface ChartData {
  user: string;
  highPercentage: number;
  mediumPercentage: number;
  lowPercentage: number;
  [key: string]: string | number;
}

function TaskDistributionBar({ data }: { data: UserTaskData[] }) {
  // Convert to chart data format
  const chartData: ChartData[] = data.map(userData => ({
    user: userData.user,
    highPercentage: userData.highPercentage,
    mediumPercentage: userData.mediumPercentage,
    lowPercentage: userData.lowPercentage
  }));

  return (
    <div className="h-[400px]">
      <ResponsiveBar
        data={chartData}
        keys={['highPercentage', 'mediumPercentage', 'lowPercentage']}
        indexBy="user"
        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear', min: 0, max: 100 }}
        indexScale={{ type: 'band', round: true }}
        colors={['#ef4444', '#f97316', '#22c55e']} // red, orange, green
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          renderTick: (tick) => {
            const userData = data.find(d => d.user === tick.value);
            return (
              <g transform={`translate(${tick.x},${tick.y + 20})`}>
                <foreignObject width={40} height={40} x={-20}>
                  <div className="flex justify-center">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={userData?.avatarUrl || undefined} 
                        alt={userData?.user}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xs bg-primary/10">
                        {userData?.user
                          ? userData.user
                              .split(' ')
                              .slice(0, 2)
                              .map(name => name[0])
                              .join('')
                              .toUpperCase()
                          : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </foreignObject>
              </g>
            );
          }
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Task Distribution (%)',
          legendPosition: 'middle',
          legendOffset: -40,
          format: (value) => `${value}%`
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.85,
            symbolSize: 20,
            effects: [
              {
                on: 'hover',
                style: {
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        tooltip={({ id, value, data }: BarTooltipProps<ChartData>) => {
          const userData = data as unknown as UserTaskData;
          const priority = id.toString().replace('Percentage', '');
          return (
            <div
              style={{
                padding: 12,
                color: 'white',
                background: '#222222',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage 
                    src={userData.avatarUrl || undefined} 
                    alt={userData.user}
                  />
                  <AvatarFallback className="text-xs bg-primary/10">
                    {userData.user
                      .split(' ')
                      .slice(0, 2)
                      .map((name: string) => name[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <strong>{userData.user}</strong>
              </div>
              <div>Total Tasks: {userData.total}</div>
              <div>{priority.charAt(0).toUpperCase() + priority.slice(1)} Priority: {userData[priority as keyof UserTaskData] as number} tasks ({value}%)</div>
            </div>
          );
        }}
      />
    </div>
  );
}

export function TaskDistributionChart({ tasks }: TaskDistributionChartProps) {
  const [view, setView] = useState<'all' | 'open'>('open');

  // Filter tasks based on view
  const filteredTasks = view === 'open' 
    ? tasks.filter(task => task.status !== 'done')
    : tasks;

  // Group tasks by user and calculate percentages
  const userTaskData = filteredTasks.reduce((acc, task) => {
    const userName = task.assignee?.full_name || 'Unassigned';
    const avatarUrl = task.assignee?.avatar_url || null;
    
    if (!acc[userName]) {
      acc[userName] = {
        user: userName,
        avatarUrl,
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
        highPercentage: 0,
        mediumPercentage: 0,
        lowPercentage: 0
      };
    }
    
    acc[userName][task.priority] += 1;
    acc[userName].total += 1;
    
    return acc;
  }, {} as Record<string, UserTaskData>);

  // Calculate percentages for each user
  Object.values(userTaskData).forEach(userData => {
    if (userData.total > 0) {
      userData.highPercentage = (userData.high / userData.total) * 100;
      userData.mediumPercentage = (userData.medium / userData.total) * 100;
      userData.lowPercentage = (userData.low / userData.total) * 100;
    }
  });

  const data = Object.values(userTaskData).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(value) => setView(value as 'all' | 'open')}>
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="open">Open Tasks</TabsTrigger>
        </TabsList>
      </Tabs>
      <TaskDistributionBar data={data} />
    </div>
  );
} 