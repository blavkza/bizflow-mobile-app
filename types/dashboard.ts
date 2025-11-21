export interface DashboardStats {
  todayTasks: number;
  completedTasks: number;
  taskProgress: number; // 0 to 1
  checkedIn: boolean;
  overtimeHours: number;
}

export interface DeadlineItem {
  id: string;
  title: string;
  date: string | Date;
  type: 'TASK' | 'PROJECT';
}

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string | Date;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'TASK_COMPLETE' | 'TASK_ASSIGNED';
}
