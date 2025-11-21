import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { format } from 'date-fns';

// Imports
import { useAuth } from '@/contexts/AuthContext';
import { getTasksFromUser } from '@/lib/task';
import { TaskSummary } from '@/types/task';
import { TaskStatus, Priority } from '@/types/auth';

export default function TasksScreen() {
  const { user, userRole, isLoading } = useAuth();

  const fetchedTasks = useMemo(() => getTasksFromUser(user), [user]);

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [filter, setFilter] = useState<'All' | TaskStatus>('All');

  useEffect(() => {
    if (fetchedTasks) {
      setTasks(fetchedTasks);
    }
  }, [fetchedTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'All') return tasks;
    return tasks.filter((task) => task.status === filter);
  }, [tasks, filter]);

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    if (
      newStatus === TaskStatus.IN_PROGRESS ||
      newStatus === TaskStatus.COMPLETED
    ) {
      router.push({
        pathname: '/photo-capture',
        params: {
          type:
            newStatus === TaskStatus.IN_PROGRESS ? 'task-start' : 'task-finish',
          taskId,
          returnTo: '/(tabs)/tasks',
        },
      });
    }

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: newStatus,
              progress: newStatus === TaskStatus.COMPLETED ? 1 : task.progress,
              timeLogged:
                newStatus === TaskStatus.COMPLETED
                  ? task.estimatedTime
                  : task.timeLogged,
            }
          : task
      )
    );
  };

  const openTaskDetails = (task: TaskSummary) => {
    router.push({
      // UPDATED PATH: Uses query parameter instead of dynamic route
      pathname: '/task-details',
      params: { taskId: task.id },
    });
  };

  // ... (Rest of the file styling and helpers remain identical to previous response)

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return '#8e8e93';
      case TaskStatus.IN_PROGRESS:
        return '#f59e0b';
      case TaskStatus.REVIEW:
        return '#8b5cf6';
      case TaskStatus.COMPLETED:
        return '#10b981';
      case TaskStatus.CANCELLED:
        return '#d32f2f';
      default:
        return '#8e8e93';
    }
  };

  const getStatusLabel = (status: string) => {
    return status === 'All' ? 'All' : status.replace(/_/g, ' ');
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW:
        return '#10b981';
      case Priority.MEDIUM:
        return '#f59e0b';
      case Priority.HIGH:
        return '#ff5722';
      case Priority.URGENT:
        return '#d32f2f';
      default:
        return '#8e8e93';
    }
  };

  const renderTaskCard = ({ item: task }: { item: TaskSummary }) => (
    <TouchableOpacity onPress={() => openTaskDetails(task)}>
      <Card style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <TouchableOpacity>
              <Text style={styles.projectName}>{task.project}</Text>
            </TouchableOpacity>
            {task.assignedBy && (
              <Text style={styles.assignedBy}>
                Assigned by: {task.assignedBy}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(task.priority) },
            ]}
          >
            <Text style={styles.priorityText}>{task.priority}</Text>
          </View>
        </View>

        <View style={styles.taskMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={16} color="#6c757d" />
            <Text style={styles.metaText}>
              {task.timeLogged}h / {task.estimatedTime}h
            </Text>
          </View>
          {task.dueDate && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={16} color="#6c757d" />
              <Text style={styles.metaText}>
                {format(new Date(task.dueDate), 'MMM dd')}
              </Text>
            </View>
          )}
          {task.photos && task.photos.length > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="camera" size={16} color="#6c757d" />
              <Text style={styles.metaText}>{task.photos.length} photos</Text>
            </View>
          )}
        </View>

        <ProgressBar
          progress={task.progress}
          color={getStatusColor(task.status)}
          style={styles.taskProgress}
        />

        <View style={styles.taskActions}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(task.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
          </View>

          {task.status !== TaskStatus.COMPLETED &&
            task.status !== TaskStatus.CANCELLED && (
              <View style={styles.actionButtons}>
                {task.status === TaskStatus.TODO && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      updateTaskStatus(task.id, TaskStatus.IN_PROGRESS)
                    }
                  >
                    <Ionicons name="play" size={16} color="#1f3c88" />
                    <Text style={styles.actionButtonText}>Start</Text>
                  </TouchableOpacity>
                )}
                {task.status === TaskStatus.IN_PROGRESS && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      updateTaskStatus(task.id, TaskStatus.COMPLETED)
                    }
                  >
                    <Ionicons name="checkmark" size={16} color="#10b981" />
                    <Text style={styles.actionButtonText}>Finish</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1f3c88" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <Text style={styles.headerSubtitle}>
            {filteredTasks.length} tasks
          </Text>
          {/*   {(userRole === 'MANAGER' ||
            userRole === 'ADMIN_MANAGER' ||
            userRole === 'GENERAL_MANAGER') && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/manager/assign-task')}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          )} */}
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {[
              'All',
              TaskStatus.TODO,
              TaskStatus.IN_PROGRESS,
              TaskStatus.COMPLETED,
            ].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterTab,
                  filter === status && styles.activeFilterTab,
                ]}
                onPress={() => setFilter(status as any)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === status && styles.activeFilterText,
                  ]}
                >
                  {getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {filteredTasks.length > 0 ? (
          <FlatList
            data={filteredTasks}
            renderItem={renderTaskCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tasksList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No tasks found.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  addButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  filterWrapper: {
    paddingVertical: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e5e7',
  },
  activeFilterTab: {
    backgroundColor: '#1f3c88',
    borderColor: '#1f3c88',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  tasksList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  taskCard: {
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    color: '#1f3c88',
    fontWeight: '600',
  },
  assignedBy: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  taskMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metaText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  taskProgress: {
    marginBottom: 16,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
});
