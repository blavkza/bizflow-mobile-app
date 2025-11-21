import { User, Task, TaskStatus } from '@/types/auth';
import { TaskDetail, TaskSummary } from '@/types/task';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://necs-engineers-bizflow.vercel.app/api';

// --- HELPER: Progress Calculation ---
const calculateTaskProgress = (
  timeLogged: number,
  estimatedTime: number,
  subtasks: any[] = [],
  status: TaskStatus
): number => {
  if (status === TaskStatus.COMPLETED) return 1;

  const timeProgress =
    estimatedTime > 0 ? Math.min(timeLogged / estimatedTime, 1) : 0;

  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter(
    (s: any) => s.status === TaskStatus.COMPLETED
  ).length;
  const subtaskProgress =
    totalSubtasks > 0 ? completedSubtasks / totalSubtasks : 0;

  if (estimatedTime > 0 && totalSubtasks > 0) {
    return (timeProgress + subtaskProgress) / 2;
  } else if (totalSubtasks > 0) {
    return subtaskProgress;
  } else if (estimatedTime > 0) {
    return timeProgress;
  } else {
    return 0;
  }
};

// --- READ OPERATIONS ---

export const getTaskById = (
  user: User | null,
  taskId: string
): TaskDetail | null => {
  const assignedTasks = user?.employee?.assignedTasks;
  if (!assignedTasks) return null;

  const task = assignedTasks.find((t) => t.id === taskId);
  if (!task) return null;

  const timeLogged =
    task.timeEntries?.reduce(
      (total: number, entry: any) => total + (Number(entry.hours) || 0),
      0
    ) ||
    Number(task.actualHours) ||
    0;

  const estimatedTime = Number(task.estimatedHours) || 0;

  const photos =
    task.documents
      ?.filter(
        (doc) =>
          doc.mimeType?.startsWith('image/') ||
          doc.url?.match(/\.(jpeg|jpg|gif|png)$/)
      )
      .map((doc) => doc.url) || [];

  const requirements =
    task.subtask
      ?.sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((st) => ({
        id: st.id,
        title: st.title,
        status: st.status,
      })) || [];

  const comments =
    task.comment
      ?.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((c) => ({
        id: c.id,
        author: c.commenterName || 'Unknown',
        message: c.content,
        timestamp: c.createdAt,
      })) || [];

  const assignedBy = task.project?.manager?.name || 'Manager';
  const progress = calculateTaskProgress(
    timeLogged,
    estimatedTime,
    task.subtask,
    task.status
  );

  return {
    id: task.id,
    title: task.title,
    project: task.project?.title || 'Unknown Project',
    projectId: task.projectId,
    status: task.status,
    timeLogged: Number(timeLogged),
    estimatedTime: estimatedTime,
    dueDate: task.dueDate ?? null,
    priority: task.priority,
    assignedBy: assignedBy,
    assignedDate: task.createdAt,
    description: task.description || 'No description provided.',
    requirements,
    photos,
    comments,
    progress,
  };
};

export const getTasksFromUser = (user: User | null): TaskSummary[] => {
  const assignedTasks = user?.employee?.assignedTasks || [];

  return assignedTasks
    .map((task) => {
      const timeLogged =
        task.timeEntries?.reduce(
          (total: number, entry: any) => total + (Number(entry.hours) || 0),
          0
        ) ||
        Number(task.actualHours) ||
        0;

      const estimatedTime = Number(task.estimatedHours) || 0;

      const photos =
        task.documents
          ?.filter(
            (doc) =>
              doc.mimeType?.startsWith('image/') ||
              doc.url?.match(/\.(jpeg|jpg|gif|png)$/)
          )
          .map((doc) => doc.url) || [];

      const progress = calculateTaskProgress(
        timeLogged,
        estimatedTime,
        task.subtask,
        task.status
      );

      return {
        id: task.id,
        title: task.title,
        project: task.project?.title || 'Unknown Project',
        projectId: task.projectId,
        status: task.status,
        timeLogged: Number(timeLogged),
        estimatedTime: estimatedTime,
        dueDate: task.dueDate ?? null,
        priority: task.priority,
        assignedBy: task.project?.manager?.name || 'Manager',
        description: task.description || '',
        photos: photos,
        progress: progress,
      };
    })
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
};

// --- WRITE OPERATIONS ---

export const updateSubtaskStatus = async (
  subtaskId: string,
  status: TaskStatus
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/subtasksMobile/${subtaskId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }
    );
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to update subtask');
    }
    return await response.json();
  } catch (error) {
    console.error('Subtask Update Error:', error);
    throw error;
  }
};

export const startTimeEntry = async (
  taskId: string,
  userId: string,
  photoUrl: string
) => {
  try {
    const body = JSON.stringify({
      taskId,
      userId,
      timeIn: new Date().toISOString(),
      date: new Date().toISOString(),
      description: 'Task work started',
      hours: 0, // FIX: Initialize mandatory field
    });

    const timeEntryResponse = await fetch(
      `${API_BASE_URL}/time-entries-mobile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      }
    );

    if (!timeEntryResponse.ok) {
      const errData = await timeEntryResponse.json();
      // Log full error data to see backend issues
      console.error('Start Time Failed:', errData);
      throw new Error(errData.error || 'Failed to start timer');
    }
    const timeEntry = await timeEntryResponse.json();

    // Save Photo Evidence
    await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Time In - ${new Date().toLocaleTimeString()}`,
        url: photoUrl,
        type: 'IMAGE',
        taskId: taskId,
        mimeType: 'image/jpeg',
      }),
    });

    return timeEntry;
  } catch (error) {
    console.error('Start Time Error:', error);
    throw error;
  }
};

export const stopTimeEntry = async (
  timeEntryId: string,
  taskId: string,
  photoUrl: string
) => {
  try {
    const now = new Date();

    const response = await fetch(
      `${API_BASE_URL}/time-entries-mobile/${timeEntryId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeOut: now.toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to stop timer');
    }
    const result = await response.json();

    // Save Photo Evidence
    await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Time Out - ${now.toLocaleTimeString()}`,
        url: photoUrl,
        type: 'IMAGE',
        taskId: taskId,
        mimeType: 'image/jpeg',
      }),
    });

    return result;
  } catch (error) {
    console.error('Stop Time Error:', error);
    throw error;
  }
};
