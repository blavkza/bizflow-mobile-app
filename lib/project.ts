import {
  User,
  ProjectStatus,
  Priority,
  TaskStatus,
  BillingType,
} from '@/types/auth';
import { ProjectSummary, ProjectDetail } from '@/types/project';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://necs-engineers-bizflow.vercel.app/api';

// Helper type to handle API response structure
type APIProject = {
  id: string;
  projectNumber?: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  priority?: Priority;
  progress?: number;
  startDate?: string;
  endDate?: string;
  deadline?: string;

  // Financial
  budget?: number | string | null;
  budgetSpent?: number | string | null;
  currency?: string;
  hourlyRate?: number | string | null;
  billingType?: BillingType | null;

  client?: { name: string };
  manager?: { name: string } | null | undefined;

  // Relations
  tasks?: any[];
  Folder?: any[];
  teamMembers?: any[];
  workLogs?: any[];
  comment?: any[];
  toolInterUses?: any[];
  timeEntries?: any[];
};

// --- READ OPERATIONS ---

export const getProjectsFromUser = (user: User | null): ProjectSummary[] => {
  if (!user) return [];

  const projectsMap = new Map<string, ProjectSummary>();

  const managedProjects = (user.Project || []) as unknown as APIProject[];

  managedProjects.forEach((p) => {
    projectsMap.set(p.id, mapProjectToSummary(p, 'Manager'));
  });

  const teamProjects = user.projectTeams || [];

  teamProjects.forEach((pt: any) => {
    if (pt.project && !projectsMap.has(pt.project.id)) {
      projectsMap.set(pt.project.id, mapProjectToSummary(pt.project, 'Member'));
    }
  });

  return Array.from(projectsMap.values()).sort((a, b) => {
    if (a.status === ProjectStatus.ACTIVE && b.status !== ProjectStatus.ACTIVE)
      return -1;
    if (a.status !== ProjectStatus.ACTIVE && b.status === ProjectStatus.ACTIVE)
      return 1;
    return 0;
  });
};

const mapProjectToSummary = (
  p: APIProject,
  role: 'Manager' | 'Member'
): ProjectSummary => {
  let calculatedProgress = p.progress || 0;
  let taskStats = { total: 0, completed: 0 };

  if (p.tasks && Array.isArray(p.tasks) && p.tasks.length > 0) {
    taskStats.total = p.tasks.length;
    taskStats.completed = p.tasks.filter(
      (t: any) => t.status === TaskStatus.COMPLETED
    ).length;

    if (calculatedProgress === 0) {
      calculatedProgress = Math.round(
        (taskStats.completed / taskStats.total) * 100
      );
    }
  }

  return {
    id: p.id,
    projectNumber: p.projectNumber || 'N/A',
    title: p.title,
    description: p.description || '',
    status: p.status,
    priority: p.priority || Priority.MEDIUM,
    progress: calculatedProgress,
    startDate: p.startDate,
    endDate: p.endDate,
    deadline: p.deadline,
    clientName: p.client?.name || 'Internal',
    managerName: p.manager?.name || 'Unassigned Manager',
    role: role,
    taskCount: taskStats,
  };
};

export const getProjectDetailById = (
  user: User | null,
  projectId: string
): ProjectDetail | null => {
  const allProjects = [
    ...(user?.Project || []),
    ...(user?.projectTeams?.map((pt) => pt.project) || []),
  ] as unknown as APIProject[];

  const project = allProjects.find((p) => p.id === projectId);

  if (!project) return null;

  // --- 1. Task/Log Aggregation ---
  let totalTasks = 0;
  let completedTasks = 0;
  let totalTimeLogged = 0;

  (project.tasks || []).forEach((task) => {
    totalTasks++;
    if (task.status === TaskStatus.COMPLETED) {
      completedTasks++;
    }
    totalTimeLogged += (task.timeEntries || []).reduce(
      (sum: any, te: any) => sum + (Number(te.hours) || 0),
      0
    );
  });

  totalTimeLogged += (project.timeEntries || []).reduce(
    (sum, te) => sum + (Number(te.hours) || 0),
    0
  );

  let progress = project.progress || 0;
  if (totalTasks > 0 && progress === 0) {
    progress = Math.round((completedTasks / totalTasks) * 100);
  }

  // --- 2. File/Note Aggregation (Nested under Folder) ---
  const documents: ProjectDetail['files']['documents'] = [];
  const notes: ProjectDetail['files']['notes'] = [];

  (project.Folder || []).forEach((folder) => {
    (folder.Document || []).forEach((doc: any) => {
      documents.push({ id: doc.id, name: doc.name, type: doc.type });
    });
    (folder.Note || []).forEach((note: any) => {
      notes.push({ id: note.id, title: note.title });
    });
  });

  // --- 3. Final Mapping ---
  return {
    id: project.id,
    projectNumber: project.projectNumber || 'N/A',
    title: project.title,
    description: project.description || 'No description provided.',
    status: project.status,
    priority: project.priority || Priority.MEDIUM,
    progress: progress,

    startDate: project.startDate,
    endDate: project.endDate,
    deadline: project.deadline,

    financial: {
      budget: Number(project.budget) || 0,
      budgetSpent: Number(project.budgetSpent) || 0,
      currency: project.currency || 'ZAR',
      hourlyRate: Number(project.hourlyRate) || 0,
      billingType: project.billingType || null,
    },

    team: {
      managerName: project.manager?.name || 'Unknown',
      clientName: project.client?.name || 'Internal Client',
      members: (project.teamMembers || []).map((m: any) => ({
        name: m.user.name,
        role: m.role || 'Member',
        userId: m.userId,
      })),
    },

    tasks: (project.tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assignee: t.assignees?.[0]?.firstName || 'Unassigned',
      dueDate: t.dueDate,
    })),

    files: {
      documents,
      notes,
      totalFolders: (project.Folder || []).length,
    },

    logs: {
      totalTasks,
      tasksCompleted: completedTasks,
      totalTimeLogged: Number(totalTimeLogged.toFixed(1)),
      totalWorkLogs: (project.workLogs || []).length,
      totalComments: (project.comment || []).length,
      totalTools: (project.toolInterUses || []).length,
    },

    // FIX: Include comment array
    comment: (project.comment || []).map((c: any) => ({
      id: c.id,
      content: c.content,
      commenterName: c.commenterName,
      createdAt: c.createdAt,
    })),
  };
};

// --- WRITE/ACTION OPERATIONS ---

/**
 * Creates a new comment on a project.
 */
export const addProjectComment = async (
  projectId: string,
  userId: string,
  userName: string,
  content: string
) => {
  const payload = {
    projectId,
    content,
    commenterId: userId,
    commenterName: userName,
    // Note: commenterAvatar and commenterRole would ideally come from user profile
  };

  const response = await fetch(`${API_BASE_URL}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to add comment');
  }
  return await response.json();
};

/**
 * Logs hours directly against a project (WorkLog).
 */
export const addProjectWorkLog = async (
  projectId: string,
  userId: string,
  hours: number,
  description: string
) => {
  const payload = {
    projectId,
    userId,
    hours,
    description,
    date: new Date().toISOString(),
  };

  // Assuming API endpoint for WorkLogs exists at /work-logs
  const response = await fetch(`${API_BASE_URL}/work-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to log work time');
  }
  return await response.json();
};

/**
 * Deletes a Note associated with the project.
 */
export const deleteProjectNote = async (noteId: string) => {
  const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete note');
  }
  // API typically returns 204 No Content, but we check ok status.
};
