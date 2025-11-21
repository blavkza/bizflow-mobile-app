import { TaskStatus, Priority } from './auth';

export interface TaskComment {
  id: string;
  author: string;
  message: string;
  timestamp: string | Date;
}

export interface TaskRequirement {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface TaskDetail {
  id: string;
  title: string;
  project: string;
  projectId: string;
  status: TaskStatus;
  timeLogged: number;
  estimatedTime: number;
  dueDate: string | Date | null;
  priority: Priority;
  assignedBy: string;
  assignedDate: string | Date;
  description: string;
  requirements: TaskRequirement[];
  photos: string[];
  comments: TaskComment[];
  progress: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  project: string;
  projectId: string;
  status: TaskStatus;
  timeLogged: number;
  estimatedTime: number;
  dueDate: string | Date | null;
  priority: Priority;
  assignedBy?: string;
  description?: string;
  photos?: string[];
  progress: number;
}
