import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';

// Imports
import { useAuth } from '@/contexts/AuthContext';
import {
  getTaskById,
  updateSubtaskStatus,
  startTimeEntry,
  stopTimeEntry,
} from '@/lib/task';
import { TaskStatus, Priority } from '@/types/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export default function TaskDetailsScreen() {
  const { taskId } = useLocalSearchParams();
  const { user, isLoading, refreshUser } = useAuth();

  // Local state for processing actions
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Get real task data
  const task = useMemo(() => {
    if (!user || typeof taskId !== 'string') return null;
    return getTaskById(user, taskId);
  }, [user, taskId]);

  // Find active time entry (one without a timeOut)
  const activeTimeEntry = useMemo(() => {
    // Check raw timeEntries from user object to find open sessions
    const rawTask = user?.employee?.assignedTasks?.find(
      (t: any) => t.id === taskId
    );
    return rawTask?.timeEntries?.find((te: any) => !te.timeOut);
  }, [user, taskId]);

  const handleSubtaskToggle = async (
    subtaskId: string,
    currentStatus: TaskStatus
  ) => {
    try {
      setIsUpdating(true);
      const newStatus =
        currentStatus === TaskStatus.COMPLETED
          ? TaskStatus.TODO
          : TaskStatus.COMPLETED;
      await updateSubtaskStatus(subtaskId, newStatus);
      await refreshUser(); // Refresh context to update UI
    } catch (error) {
      Alert.alert('Error', 'Failed to update subtask.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTimeLogAction = async () => {
    if (!task) return;

    // 1. Request Camera Permissions
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera is required!');
      return;
    }

    // 2. Take Photo
    const result = await ImagePicker.launchCameraAsync({
      // FIX: Reverted to MediaTypeOptions to satisfy TypeScript
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Changed to false to skip cropping
      // aspect: [4, 3], // Removed aspect as it only applies when editing is true
      quality: 0.5, // Compress for faster upload
    });

    if (!result.canceled) {
      try {
        setUploading(true);

        // 3. Upload to Cloudinary
        const photoUrl = await uploadToCloudinary(result.assets[0].uri);

        if (!photoUrl) {
          throw new Error('Image upload failed');
        }

        // 4. Call API
        if (activeTimeEntry) {
          // Clock Out
          await stopTimeEntry(activeTimeEntry.id, task.id, photoUrl);
          Alert.alert('Success', 'Clocked out successfully!');
        } else {
          // Clock In
          const userId = user?.id || '';
          await startTimeEntry(task.id, userId, photoUrl);
          Alert.alert('Success', 'Clocked in successfully!');
        }

        // 5. Refresh Data
        await refreshUser();
      } catch (error: any) {
        console.error(error);
        Alert.alert(
          'Error',
          error.message || 'Failed to log time. Please try again.'
        );
      } finally {
        setUploading(false);
      }
    }
  };

  // --- Styling Helpers ---

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

  const getStatusLabel = (status: TaskStatus) => status.replace(/_/g, ' ');

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

  const renderPhoto = ({ item }: { item: string }) => (
    <TouchableOpacity style={styles.photoContainer}>
      <Image source={{ uri: item }} style={styles.photo} />
    </TouchableOpacity>
  );

  const renderComment = ({ item }: { item: any }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>{item.author}</Text>
        <Text style={styles.commentTime}>
          {format(new Date(item.timestamp), 'MMM dd, h:mm a')}
        </Text>
      </View>
      <Text style={styles.commentMessage}>{item.message}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f3c88" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Not Found</Text>
        </LinearGradient>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
          <Text style={styles.errorText}>
            We couldn't find the task you're looking for.
          </Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalSubtasks = task.requirements.length;
  const completedSubtasks = task.requirements.filter(
    (r) => r.status === TaskStatus.COMPLETED
  ).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(task.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Overview */}
        <Card>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(task.priority) },
              ]}
            >
              <Text style={styles.priorityText}>{task.priority}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.projectLink}>
            <Ionicons name="folder" size={16} color="#1f3c88" />
            <Text style={styles.projectName}>{task.project}</Text>
            <Ionicons name="chevron-forward" size={16} color="#1f3c88" />
          </TouchableOpacity>

          <Text style={styles.description}>{task.description}</Text>

          <View style={styles.taskMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Assigned by:</Text>
              <Text style={styles.metaValue}>{task.assignedBy}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Assigned date:</Text>
              <Text style={styles.metaValue}>
                {format(new Date(task.assignedDate), 'MMM dd, yyyy')}
              </Text>
            </View>
            {task.dueDate && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due date:</Text>
                <Text style={styles.metaValue}>
                  {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Progress */}
        <Card>
          <Text style={styles.cardTitle}>Progress</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {totalSubtasks > 0
                  ? `${completedSubtasks}/${totalSubtasks} Subtasks`
                  : `${task.timeLogged}h / ${task.estimatedTime}h`}
              </Text>
              <Text style={styles.progressPercentage}>
                {Math.round(task.progress * 100)}%
              </Text>
            </View>
            <ProgressBar
              progress={task.progress}
              color={getStatusColor(task.status)}
              style={styles.progressBar}
            />

            {/* Action Buttons - Time Entry Logic */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.logTimeButton,
                  activeTimeEntry ? styles.activeTimerButton : {},
                  uploading && { opacity: 0.7 },
                ]}
                onPress={handleTimeLogAction}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator
                    size="small"
                    color={activeTimeEntry ? '#fff' : '#1f3c88'}
                  />
                ) : (
                  <>
                    <Ionicons
                      name={activeTimeEntry ? 'stop-circle' : 'time'}
                      size={20}
                      color={activeTimeEntry ? '#ffffff' : '#1f3c88'}
                    />
                    <Text
                      style={[
                        styles.logTimeText,
                        activeTimeEntry ? { color: '#ffffff' } : {},
                      ]}
                    >
                      {activeTimeEntry ? 'Clock Out' : 'Clock In'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Requirements / Subtasks */}
        {task.requirements.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Subtasks</Text>
            {task.requirements.map((requirement, index) => {
              const isCompleted = requirement.status === TaskStatus.COMPLETED;
              return (
                <TouchableOpacity
                  key={requirement.id || index}
                  style={styles.requirementItem}
                  onPress={() =>
                    handleSubtaskToggle(requirement.id, requirement.status)
                  }
                  disabled={isUpdating}
                >
                  <Ionicons
                    name={isCompleted ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={isCompleted ? '#10b981' : '#6c757d'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      isCompleted && styles.completedRequirementText,
                    ]}
                  >
                    {requirement.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Card>
        )}

        {/* Photos */}
        {task.photos.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Photos ({task.photos.length})</Text>
            <FlatList
              data={task.photos}
              renderItem={renderPhoto}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosList}
            />
          </Card>
        )}

        {/* Comments */}
        <Card>
          <Text style={styles.cardTitle}>
            Comments ({task.comments.length})
          </Text>
          {task.comments.length > 0 ? (
            task.comments.map((comment) => (
              <View key={comment.id}>{renderComment({ item: comment })}</View>
            ))
          ) : (
            <Text style={styles.noCommentsText}>No comments yet.</Text>
          )}

          <TouchableOpacity style={styles.addCommentButton}>
            <Ionicons name="add-circle" size={20} color="#1f3c88" />
            <Text style={styles.addCommentText}>Add Comment</Text>
          </TouchableOpacity>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Uploading Overlay */}
      {uploading && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.overlayText}>Uploading Photo...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 16 },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 12,
  },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  priorityText: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  projectLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f3c88',
    marginHorizontal: 8,
  },
  description: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
    marginBottom: 16,
  },
  taskMeta: { borderTopWidth: 1, borderTopColor: '#e5e5e7', paddingTop: 16 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: { fontSize: 14, color: '#6c757d' },
  metaValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  progressContainer: { marginBottom: 8 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  progressPercentage: { fontSize: 16, fontWeight: '600', color: '#1f3c88' },
  progressBar: { marginBottom: 16 },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressSubText: { fontSize: 12, color: '#6c757d' },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 4,
  },
  requirementText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  completedRequirementText: {
    color: '#6c757d',
    textDecorationLine: 'line-through',
  },
  photosList: { marginHorizontal: -8 },
  photoContainer: { marginHorizontal: 8 },
  photo: { width: 120, height: 120, borderRadius: 8 },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentAuthor: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  commentTime: { fontSize: 12, color: '#6c757d' },
  commentMessage: { fontSize: 14, color: '#1a1a1a', lineHeight: 20 },
  noCommentsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  addCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e7',
    marginTop: 8,
  },
  addCommentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f3c88',
    marginLeft: 8,
  },
  actionButtons: { gap: 12, marginTop: 8 },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f3c88',
    paddingVertical: 12,
    borderRadius: 8,
  },
  logTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#1f3c88',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTimerButton: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  logTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f3c88',
    marginLeft: 8,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  goBackButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#1f3c88',
    borderRadius: 8,
  },
  goBackText: { color: '#fff', fontWeight: 'bold' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#333',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  overlayText: { color: '#fff', marginTop: 10, fontWeight: '600' },
});
