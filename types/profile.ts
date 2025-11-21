export interface ProfileStatistics {
  attendance: number;
  tasksCompleted: number;
  totalTasks: number;
  taskCompletionRate: number;
  totalHoursThisMonth: number;
  overtimeHours: number;
  activeProjects: number;
  totalProjects: number;
  remainingLeaveDays: number;
  usedLeaveDays: number;
  performanceScore: number;

  // Internal Metrics
  productivityScore: number;
  teamworkScore: number;
  projectContributionScore: number;
}
