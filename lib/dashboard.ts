import { User, TaskStatus } from '@/types/auth';
import { DashboardStats, DeadlineItem, ActivityItem } from '@/types/dashboard';
import { isSameDay, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';

export const getDashboardStats = (user: User | null): DashboardStats => {
  if (!user?.employee) {
    return {
      todayTasks: 0,
      completedTasks: 0,
      taskProgress: 0,
      checkedIn: false,
      overtimeHours: 0,
    };
  }

  const { assignedTasks = [], AttendanceRecord = [] } = user.employee;
  const today = new Date();

  // 1. Calculate Task Progress (Focusing on tasks active today or due today)
  const relevantTasks = assignedTasks.filter(
    (t) =>
      // Include if In Progress, OR Due Today, OR Completed Today
      t.status === TaskStatus.IN_PROGRESS ||
      (t.dueDate && isSameDay(new Date(t.dueDate), today)) ||
      (t.completedAt && isSameDay(new Date(t.completedAt), today))
  );

  const completedTasks = relevantTasks.filter(
    (t) => t.status === TaskStatus.COMPLETED
  ).length;
  const totalTasks = relevantTasks.length;

  // Avoid division by zero
  const taskProgress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  // 2. Check In Status
  // Find record for today
  const todayRecord = AttendanceRecord.find((r) =>
    isSameDay(new Date(r.date), today)
  );
  // Checked in if we have a checkIn time but no checkOut time
  const checkedIn = !!todayRecord?.checkIn && !todayRecord?.checkOut;

  // 3. Weekly Overtime
  const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
  const end = endOfWeek(today, { weekStartsOn: 1 });

  const weeklyOvertime = AttendanceRecord.filter((r) =>
    isWithinInterval(new Date(r.date), { start, end })
  ).reduce((acc, curr) => acc + (Number(curr.overtimeHours) || 0), 0);

  return {
    todayTasks: totalTasks,
    completedTasks,
    taskProgress,
    checkedIn,
    overtimeHours: Number(weeklyOvertime.toFixed(1)),
  };
};

export const getUpcomingDeadlines = (user: User | null): DeadlineItem[] => {
  if (!user?.employee?.assignedTasks) return [];

  const now = new Date();
  // Filter tasks that are due in the future and not completed
  return user.employee.assignedTasks
    .filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) > now &&
        t.status !== TaskStatus.COMPLETED
    )
    .sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
    )
    .slice(0, 3) // Take top 3
    .map((t) => ({
      id: t.id,
      title: t.title,
      date: t.dueDate!,
      type: 'TASK',
    }));
};

export const getRecentActivity = (user: User | null): ActivityItem[] => {
  if (!user?.employee) return [];

  const activities: ActivityItem[] = [];
  const { AttendanceRecord = [], assignedTasks = [] } = user.employee;

  // 1. Attendance Activities
  AttendanceRecord.forEach((record) => {
    if (record.checkIn) {
      activities.push({
        id: `in-${record.id}`,
        title: 'Checked In',
        subtitle: 'Work Started',
        timestamp: record.checkIn,
        type: 'CHECK_IN',
      });
    }
    if (record.checkOut) {
      activities.push({
        id: `out-${record.id}`,
        title: 'Checked Out',
        subtitle: 'Work Ended',
        timestamp: record.checkOut,
        type: 'CHECK_OUT',
      });
    }
  });

  // 2. Task Activities
  assignedTasks.forEach((task) => {
    if (task.completedAt) {
      activities.push({
        id: `comp-${task.id}`,
        title: 'Task Completed',
        subtitle: task.title,
        timestamp: task.completedAt,
        type: 'TASK_COMPLETE',
      });
    } else {
      // Use creation date as "Assigned" date approximation
      activities.push({
        id: `assign-${task.id}`,
        title: 'Task Assigned',
        subtitle: task.title,
        timestamp: task.createdAt,
        type: 'TASK_ASSIGNED',
      });
    }
  });

  // Sort by most recent
  return activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 5);
};
