import {
  ProjectStatus,
  Priority,
  BillingType,
  ProjectType,
  TaskStatus,
} from './auth';

// --- Task structure for the Project Detail list ---
export interface ProjectTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  dueDate: string | Date | null;
}

// --- Used for the detail view (ProjectDetailsScreen) ---
export interface ProjectDetail {
  id: string;
  projectNumber: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  progress: number; // 0-100

  startDate?: string | Date | null;
  endDate?: string | Date | null;
  deadline?: string | Date | null;

  financial: {
    budget: number;
    budgetSpent: number;
    currency: string;
    hourlyRate: number;
    billingType: BillingType | null;
  };

  team: {
    managerName: string;
    clientName: string;
    members: { name: string; role: string; userId: string }[];
  };

  tasks: ProjectTaskSummary[]; // List of tasks

  files: {
    documents: { id: string; name: string; type: string }[];
    notes: { id: string; title: string }[];
    totalFolders: number; // Added for display
  };

  logs: {
    tasksCompleted: number;
    totalTasks: number;
    totalTimeLogged: number;
    totalWorkLogs: number;
    totalComments: number;
    totalTools: number;
  };

  // FIX: Add comment array to ProjectDetail interface
  comment: {
    id: string;
    content: string;
    commenterName: string;
    createdAt: string | Date;
  }[];
}

// --- Used for the list view (TasksScreen) ---
export interface ProjectSummary {
  id: string;
  projectNumber: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  progress: number; // 0-100
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  deadline?: string | Date | null;
  clientName: string;
  managerName: string;
  role: 'Manager' | 'Member';
  taskCount: {
    total: number;
    completed: number;
  };
}
