import { User, TaskStatus, AttendanceStatus } from '@/types/auth';
import { ProfileStatistics } from '@/types/profile';

type APIUser = User & {
  Project?: any[];
  employee?: {
    AttendanceRecord?: any[];
    assignedTasks?: any[];
    leaveRequests?: any[];
    annualLeaveDays?: number;
    sickLeaveDays?: number;
  };
};

export const calculateProfileStatistics = (
  user: User | null
): ProfileStatistics => {
  // Cast to APIUser to safely access capitalized keys without TS errors
  const userData = user as APIUser;

  // 1. Use backend stats if available
  const backendStats = user?.statistics;
  if (
    backendStats &&
    Object.keys(backendStats).length > 0 &&
    backendStats.attendance
  ) {
    return backendStats as ProfileStatistics;
  }

  // 2. Fallback: Calculate using Raw Data

  const assignedTasks = userData?.employee?.assignedTasks || [];
  const attendanceRecords = userData?.employee?.AttendanceRecord || [];

  // Handle Capitalized 'Project' key from API
  const managedProjects = userData?.Project || [];
  const teamProjects = userData?.projectTeams || [];

  const allProjects = [
    ...managedProjects,
    ...teamProjects.map((pt: any) => pt.project).filter(Boolean),
  ];

  const timeEntries = userData?.timeEntries || [];

  // --- METRIC CALCULATIONS ---

  const attendanceRate = calculateAttendanceRate(attendanceRecords);
  const taskPerformance = calculateTaskPerformance(assignedTasks);
  const productivityScore = calculateProductivity(assignedTasks);
  const projectContributionScore = calculateProjectContribution(assignedTasks);
  const teamworkScore = calculateTeamwork(assignedTasks);

  // --- OVERALL SCORE ---
  const performanceScore = Math.round(
    attendanceRate * 0.15 +
      taskPerformance * 0.35 +
      productivityScore * 0.25 +
      projectContributionScore * 0.15 +
      teamworkScore * 0.1
  );

  // --- UI DATA ---
  const completedTasksCount = assignedTasks.filter(
    (t: any) => t.status === 'COMPLETED' || t.status === TaskStatus.COMPLETED
  ).length;

  const totalHoursThisMonth = timeEntries.reduce(
    (total: number, entry: any) => total + (Number(entry.hours) || 0),
    0
  );

  const overtimeHours = attendanceRecords.reduce(
    (total: number, record: any) => {
      return total + (Number(record.overtimeHours) || 0);
    },
    0
  );

  const activeProjectsCount = allProjects.filter(
    (project: any) =>
      project?.status === 'ACTIVE' ||
      project?.status === 'PLANNING' ||
      project?.status === 'IN_PROGRESS'
  ).length;

  // Leave
  const annualLeaveDays = userData?.employee?.annualLeaveDays || 21;
  const usedLeaveDays =
    userData?.employee?.leaveRequests
      ?.filter((leave: any) => leave.status === 'APPROVED')
      .reduce((total: number, leave: any) => total + (leave.days || 0), 0) || 0;

  const remainingLeaveDays = Math.max(0, annualLeaveDays - usedLeaveDays);

  return {
    attendance: attendanceRate,
    tasksCompleted: completedTasksCount,
    totalTasks: assignedTasks.length,
    taskCompletionRate: taskPerformance,
    totalHoursThisMonth: Number(totalHoursThisMonth.toFixed(1)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    activeProjects: activeProjectsCount,
    totalProjects: allProjects.length,
    remainingLeaveDays: remainingLeaveDays,
    usedLeaveDays: usedLeaveDays,
    performanceScore: performanceScore,
    productivityScore: productivityScore,
    teamworkScore: teamworkScore,
    projectContributionScore: projectContributionScore,
  };
};

// --- HELPERS ---

function calculateAttendanceRate(records: any[]): number {
  if (!records || records.length === 0) return 100;

  // Using string keys to avoid Enum conflicts if types/auth changes
  const weights: { [key: string]: number } = {
    PRESENT: 1.0,
    HALF_DAY: 0.8,
    LATE: 0.7,
    SICK_LEAVE: 0.5,
    ANNUAL_LEAVE: 0.5,
    UNPAID_LEAVE: 0.3,
    ABSENT: 0.0,
    MATERNITY_LEAVE: 0.5,
    PATERNITY_LEAVE: 0.5,
    STUDY_LEAVE: 0.5,
  };

  let totalScore = 0;
  records.forEach((record) => {
    const weight =
      weights[record.status] !== undefined ? weights[record.status] : 0;
    totalScore += weight;
  });

  return Math.round((totalScore / records.length) * 100);
}

function calculateTaskPerformance(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;

  const completedTasks = tasks.filter(
    (t) => t.status === 'COMPLETED' || t.status === TaskStatus.COMPLETED
  ).length;
  const cancelledTasks = tasks.filter((t) => t.status === 'CANCELLED').length;

  const totalAssignableTasks = Math.max(1, tasks.length - cancelledTasks);

  return Math.round((completedTasks / totalAssignableTasks) * 100);
}

function calculateProductivity(tasks: any[]): number {
  const completedTasks = tasks.filter(
    (t) => t.status === 'COMPLETED' || t.status === TaskStatus.COMPLETED
  );
  if (completedTasks.length === 0) return 0;

  let totalProductivity = 0;
  let validTasks = 0;

  completedTasks.forEach((task) => {
    const estimatedHours = task.estimatedHours
      ? Number(task.estimatedHours)
      : 8;
    const actualHours = task.timeEntries
      ? task.timeEntries.reduce(
          (sum: number, entry: any) => sum + (Number(entry.hours) || 0),
          0
        )
      : 0;

    let taskProductivity = 100;
    if (actualHours > 0 && estimatedHours > 0) {
      taskProductivity = Math.min((estimatedHours / actualHours) * 100, 120);
      taskProductivity = Math.max(70, taskProductivity);
    } else {
      taskProductivity = 90;
    }
    totalProductivity += taskProductivity;
    validTasks++;
  });

  return validTasks > 0 ? Math.round(totalProductivity / validTasks) : 0;
}

function calculateProjectContribution(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;

  const uniqueProjects = new Set(tasks.map((t) => t.projectId).filter(Boolean))
    .size;
  const completedTasksByProject = new Map();

  tasks.forEach((task) => {
    if (task.projectId) {
      const current = completedTasksByProject.get(task.projectId) || {
        total: 0,
        completed: 0,
      };
      current.total++;
      if (task.status === 'COMPLETED' || task.status === TaskStatus.COMPLETED)
        current.completed++;
      completedTasksByProject.set(task.projectId, current);
    }
  });

  let totalProjectContribution = 0;
  completedTasksByProject.forEach((stats) => {
    const completionRate =
      stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    totalProjectContribution += completionRate;
  });

  const average =
    uniqueProjects > 0 ? totalProjectContribution / uniqueProjects : 0;
  return Math.round(Math.min(average, 100));
}

function calculateTeamwork(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 50;

  const collaborativeTasks = tasks.filter(
    (t) => t.subtask && t.subtask.length > 0
  ).length;
  const reviewTasks = tasks.filter(
    (t) => t.status === 'REVIEW' || t.status === 'IN_REVIEW'
  ).length;
  const uniqueProjects = new Set(tasks.map((t) => t.projectId).filter(Boolean))
    .size;

  const collaborationScore = Math.min(
    (collaborativeTasks / Math.max(tasks.length, 1)) * 50,
    50
  );
  const reviewScore = Math.min(
    (reviewTasks / Math.max(tasks.length, 1)) * 30,
    30
  );
  const projectDiversityScore = Math.min(uniqueProjects * 7, 20);

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(collaborationScore + reviewScore + projectDiversityScore)
    )
  );
}

export const getProfileMeta = (user: User | null) => {
  const userData = user as APIUser;
  return {
    departmentName: userData?.employee?.department?.name || 'Unassigned',
    managerName:
      userData?.employee?.department?.manager?.name || 'Not Assigned',
    initials:
      userData?.employee?.firstName && userData?.employee?.lastName
        ? `${userData.employee.firstName[0]}${userData.employee.lastName[0]}`.toUpperCase()
        : userData?.name
        ? userData.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
        : 'U',
    fullName:
      userData?.employee?.firstName && userData?.employee?.lastName
        ? `${userData.employee.firstName} ${userData.employee.lastName}`
        : userData?.name || 'User',
  };
};

export const formatCurrency = (amount: number, currency: string = 'ZAR') => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
