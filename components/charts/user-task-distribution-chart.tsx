"use client";

import { ResponsiveBar } from '@nivo/bar';

// Define the Task interface directly in this file since there are issues with importing
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// Define a custom interface for our chart data
interface UserTaskData {
  name: string;
  todo: number;
  in_progress: number;
  done: number;
  total: number;
  [key: string]: string | number; // Allow for any string key
}

interface UserTaskDistributionChartProps {
  tasks: Task[];
}

export function UserTaskDistributionChart({ tasks }: UserTaskDistributionChartProps) {
  // Prepare data for visualization
  // Group tasks by user and count statuses
  const userTasksMap = tasks.reduce<Record<string, UserTaskData>>((acc, task) => {
    const userName = task.assignee?.full_name || 'Unassigned';
    
    if (!acc[userName]) {
      acc[userName] = {
        name: userName,
        todo: 0,
        in_progress: 0,
        done: 0,
        total: 0
      };
    }
    
    // Increment the appropriate status counter
    acc[userName][task.status] = (acc[userName][task.status] || 0) + 1;
    acc[userName].total += 1;
    
    return acc;
  }, {});
  
  // Convert to array format for Nivo chart
  const chartData = Object.values(userTasksMap)
    .sort((a, b) => b.total - a.total); // Sort by total tasks count

  return (
    <div className="w-full h-full">
      <h3 className="text-lg font-medium mb-4">Tasks by User and Status</h3>
      <div className="h-[400px]">
        <ResponsiveBar
          data={chartData}
          keys={['todo', 'in_progress', 'done']}
          indexBy="name"
          margin={{ top: 50, right: 130, bottom: 50, left: 120 }}
          padding={0.3}
          groupMode="grouped"
          layout="horizontal"
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: 'category10' }}
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Number of Tasks',
            legendPosition: 'middle',
            legendOffset: 32
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0
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
          tooltip={({ id, value, color }) => (
            <div
              style={{
                padding: 12,
                background: '#fff',
                border: `1px solid ${color}`,
                borderRadius: 4
              }}
            >
              <strong>
                {id === 'todo' ? 'To Do' : 
                 id === 'in_progress' ? 'In Progress' : 
                 'Done'}: {value}
              </strong>
            </div>
          )}
        />
      </div>
    </div>
  );
} 