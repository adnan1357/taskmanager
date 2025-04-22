"use client";

import { useState, useEffect } from 'react';
import { DragDropContext, Draggable, DropResult, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { StrictModeDroppable } from './StrictModeDroppable';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  assignee_id: string | null;
  assignee: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
  onTaskUpdate: () => void;
  onTaskSelect: (taskId: string) => void;
}

type Column = {
  id: string;
  title: string;
  taskIds: string[];
};

type Columns = {
  [key: string]: Column;
};

type BoardData = {
  tasks: {
    [key: string]: Task;
  };
  columns: Columns;
  columnOrder: string[];
};

export function KanbanBoard({ tasks, projectId, onTaskUpdate, onTaskSelect }: KanbanBoardProps) {
  const [boardData, setBoardData] = useState<BoardData>({
    tasks: {},
    columns: {
      todo: {
        id: 'todo',
        title: 'To Do',
        taskIds: []
      },
      in_progress: {
        id: 'in_progress',
        title: 'In Progress',
        taskIds: []
      },
      review: {
        id: 'review',
        title: 'Review',
        taskIds: []
      },
      done: {
        id: 'done',
        title: 'Done',
        taskIds: []
      }
    },
    columnOrder: ['todo', 'in_progress', 'review', 'done']
  });
  const supabase = createClientComponentClient();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const taskMap = tasks.reduce((acc, task) => {
      acc[task.id] = task;
      return acc;
    }, {} as { [key: string]: Task });

    const columnTaskIds = {
      todo: [] as string[],
      in_progress: [] as string[],
      review: [] as string[],
      done: [] as string[]
    };

    tasks.forEach(task => {
      if (task.status in columnTaskIds) {
        columnTaskIds[task.status as keyof typeof columnTaskIds].push(task.id);
      }
    });

    setBoardData(prev => ({
      ...prev,
      tasks: taskMap,
      columns: {
        ...prev.columns,
        todo: { ...prev.columns.todo, taskIds: columnTaskIds.todo },
        in_progress: { ...prev.columns.in_progress, taskIds: columnTaskIds.in_progress },
        review: { ...prev.columns.review, taskIds: columnTaskIds.review },
        done: { ...prev.columns.done, taskIds: columnTaskIds.done }
      }
    }));
  }, [tasks]);

  const onDragStart = () => {
    setIsDragging(true);
  };

  const onDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    
    const { destination, source, draggableId } = result;
    
    // Dropped outside a droppable area
    if (!destination) return;
    
    // Dropped in the same place
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    
    // Moving within the same column
    const sourceColumn = boardData.columns[source.droppableId];
    const destColumn = boardData.columns[destination.droppableId];
    
    if (sourceColumn === destColumn) {
      const newTaskIds = Array.from(sourceColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      
      const newColumn = {
        ...sourceColumn,
        taskIds: newTaskIds
      };
      
      const newState = {
        ...boardData,
        columns: {
          ...boardData.columns,
          [newColumn.id]: newColumn
        }
      };
      
      setBoardData(newState);
    } else {
      // Moving from one column to another
      const sourceTaskIds = Array.from(sourceColumn.taskIds);
      sourceTaskIds.splice(source.index, 1);
      const newSourceColumn = {
        ...sourceColumn,
        taskIds: sourceTaskIds
      };
      
      const destTaskIds = Array.from(destColumn.taskIds);
      destTaskIds.splice(destination.index, 0, draggableId);
      const newDestColumn = {
        ...destColumn,
        taskIds: destTaskIds
      };
      
      const newState = {
        ...boardData,
        columns: {
          ...boardData.columns,
          [newSourceColumn.id]: newSourceColumn,
          [newDestColumn.id]: newDestColumn
        },
        tasks: {
          ...boardData.tasks,
          [draggableId]: {
            ...boardData.tasks[draggableId],
            status: destination.droppableId
          }
        }
      };
      
      // Update UI immediately (optimistic update)
      setBoardData(newState);
      
      // Update the task status in the database
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: destination.droppableId })
          .eq('id', draggableId);
          
        if (error) {
          console.error('Error updating task status:', error);
        } 
        // Remove the callback that causes refreshing
        // Otherwise the data will remain updated in the local state
      } catch (error) {
        console.error('Error updating task status:', error);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-orange-100 text-orange-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDueDateDisplay = (dueDate: string, status: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const isOverdue = date < now && status !== 'done';
    
    return {
      text: formatDistanceToNow(date, { addSuffix: true }),
      isOverdue
    };
  };

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 h-[500px] overflow-x-auto pb-4">
        {boardData.columnOrder.map((columnId) => {
          const column = boardData.columns[columnId];
          const columnTasks = column.taskIds.map(taskId => boardData.tasks[taskId]).filter(Boolean);
          
          return (
            <div key={column.id} className="flex-1 min-w-[300px]">
              <div 
                className={cn(
                  "bg-muted rounded-t-lg p-3 font-medium text-sm",
                  columnId === 'todo' && "bg-blue-50 text-blue-700",
                  columnId === 'in_progress' && "bg-yellow-50 text-yellow-700",
                  columnId === 'done' && "bg-green-50 text-green-700"
                )}
              >
                {column.title} ({columnTasks.length})
              </div>
              <StrictModeDroppable droppableId={column.id} type="task">
                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "bg-muted/30 rounded-b-lg p-2 h-full overflow-y-auto",
                      snapshot.isDraggingOver && "bg-muted/50"
                    )}
                    style={{ minHeight: '400px' }}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "p-3 mb-2 bg-card shadow-sm hover:shadow",
                              snapshot.isDragging && "shadow-md"
                            )}
                            onClick={() => {
                              if (!isDragging && !snapshot.isDragging) {
                                onTaskSelect(task.id);
                              }
                            }}
                          >
                            <h3 className="font-medium mb-2 truncate">{task.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                            <div className="flex justify-between items-center">
                              <span 
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-medium",
                                  getPriorityColor(task.priority)
                                )}
                              >
                                {task.priority}
                              </span>
                              
                              {task.assignee && (
                                <Avatar className="h-5 w-5">
                                  <AvatarImage 
                                    src={task.assignee.avatar_url || undefined} 
                                    alt={task.assignee.full_name || 'User'}
                                  />
                                  <AvatarFallback className="text-xs bg-primary/10">
                                    {task.assignee.full_name 
                                      ? task.assignee.full_name
                                          .split(' ')
                                          .slice(0, 2)
                                          .map((name: string) => name[0])
                                          .join('')
                                          .toUpperCase()
                                      : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                            
                            {task.due_date && (
                              <div className={cn(
                                "flex items-center gap-1 mt-2 text-xs",
                                getDueDateDisplay(task.due_date, task.status).isOverdue && "text-red-600 font-medium"
                              )}>
                                <Clock className={cn(
                                  "h-3 w-3",
                                  getDueDateDisplay(task.due_date, task.status).isOverdue && "text-red-600"
                                )} />
                                {getDueDateDisplay(task.due_date, task.status).text}
                              </div>
                            )}
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
} 