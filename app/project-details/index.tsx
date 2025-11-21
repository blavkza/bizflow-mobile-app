import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image, // Added Image import for Tool modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { format, formatDistanceToNow } from 'date-fns';

// Imports
import { useAuth } from '@/contexts/AuthContext';
import {
  getProjectDetailById,
  addProjectComment,
  addProjectWorkLog,
  deleteProjectNote,
} from '@/lib/project';
import { ProjectDetail } from '@/types/project';
import { Priority, TaskStatus, ProjectStatus } from '@/types/auth';

export default function ProjectDetailsScreen() {
  const { projectId } = useLocalSearchParams();
  const { user, isLoading, refreshUser } = useAuth();

  // --- MODAL VISIBILITY STATES ---
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showFoldersModal, setShowFoldersModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);

  // --- NESTED MODAL STATE ---
  const [showFolderContentModal, setShowFolderContentModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any>(null); // Holds the raw folder object

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [workLog, setWorkLog] = useState({ hours: '', description: '' });

  // Data
  const project = useMemo(() => {
    if (!user || typeof projectId !== 'string') return null;
    return getProjectDetailById(user, projectId);
  }, [user, projectId]);

  // --- RAW DATA LISTS (Used in Modals) ---
  const rawProjectData =
    user?.Project?.find((p: any) => p.id === projectId) ||
    user?.projectTeams?.find((pt: any) => pt.project.id === projectId)
      ?.project ||
    {};

  const foldersList = useMemo(
    () => (rawProjectData as any).Folder || [],
    [rawProjectData]
  );
  const toolsList = useMemo(
    () => (rawProjectData as any).toolInterUses || [],
    [rawProjectData]
  );
  const workLogsList = useMemo(
    () => (rawProjectData as any).workLogs || [],
    [rawProjectData]
  );

  // --- HANDLERS ---

  const handleAddComment = async () => {
    if (!commentText.trim() || !project || !user) return;

    setIsSubmitting(true);
    try {
      await addProjectComment(
        project.id,
        user.id,
        user.name,
        commentText.trim()
      );
      Alert.alert('Success', 'Comment posted successfully!');
      setCommentText('');
      setShowCommentModal(false);
      await refreshUser();
    } catch (e) {
      Alert.alert('Error', 'Failed to add comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddWorkLog = async () => {
    const hours = Number(workLog.hours);
    if (hours <= 0 || !project || !user) {
      Alert.alert('Error', 'Please enter a valid number of hours.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addProjectWorkLog(
        project.id,
        user.id,
        hours,
        workLog.description || `Logged ${hours} hours of work.`
      );
      Alert.alert('Success', 'Work time logged successfully!');
      setWorkLog({ hours: '', description: '' });
      setShowWorkLogModal(false);
      await refreshUser();
    } catch (e) {
      Alert.alert('Error', 'Failed to log work time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string, noteTitle: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the note: "${noteTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProjectNote(noteId);
              Alert.alert('Success', 'Note deleted.');
              await refreshUser();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete note.');
            }
          },
        },
      ]
    );
  };

  // --- NEW FOLDER HANDLER ---
  const handleOpenFolder = (folder: any) => {
    setSelectedFolder(folder);
    setShowFoldersModal(false); // Close the folder list
    setShowFolderContentModal(true); // Open the content view
  };

  // --- RENDERING HELPERS ---

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return '#10b981';
      case ProjectStatus.PLANNING:
        return '#8b5cf6';
      case ProjectStatus.COMPLETED:
        return '#1f3c88';
      case ProjectStatus.ON_HOLD:
        return '#f59e0b';
      case ProjectStatus.CANCELLED:
        return '#d32f2f';
      default:
        return '#8e8e93';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return '#d32f2f';
      case Priority.HIGH:
        return '#f97316';
      case Priority.MEDIUM:
        return '#f59e0b';
      case Priority.LOW:
        return '#10b981';
      default:
        return '#8e8e93';
    }
  };

  const getTaskStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return '#10b981';
      case TaskStatus.IN_PROGRESS:
        return '#f59e0b';
      case TaskStatus.TODO:
        return '#8e8e93';
      case TaskStatus.REVIEW:
        return '#8b5cf6';
      default:
        return '#8e8e93';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const renderTask = ({ item }: { item: ProjectDetail['tasks'][0] }) => (
    <TouchableOpacity
      style={styles.taskItem}
      onPress={() =>
        router.push({ pathname: '/task-details', params: { taskId: item.id } })
      }
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitleText} numberOfLines={1}>
          {item.title}
        </Text>
        <View
          style={[
            styles.taskStatusBadge,
            { backgroundColor: getTaskStatusColor(item.status) },
          ]}
        >
          <Text style={styles.taskStatusText}>
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>
      <View style={styles.taskMeta}>
        <Text style={styles.taskAssignee}>Assigned to: {item.assignee}</Text>
        {item.dueDate && (
          <Text style={styles.taskDueDate}>
            Due: {format(new Date(item.dueDate), 'MMM dd')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderTeamMember = ({
    item,
  }: {
    item: ProjectDetail['team']['members'][0];
  }) => (
    <View style={styles.teamMember}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>{item.name[0]}</Text>
      </View>
      <Text style={styles.memberName} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );

  const renderComment = (item: any) => (
    <View key={item.id} style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>{item.commenterName || 'User'}</Text>
        <Text style={styles.commentTime}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
      <Text style={styles.commentMessage}>{item.content}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f3c88" />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1f3c88', '#2d5aa0']} style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Not Found</Text>
        </LinearGradient>
      </View>
    );
  }

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
          <View style={styles.headerTitles}>
            <Text style={styles.headerSubtitle}>
              {project.projectNumber} / {project.team.clientName}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {project.title}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(project.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {project.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Card */}
        <Card>
          <Text style={styles.cardTitle}>Status</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>Overall Progress</Text>
              <Text
                style={[
                  styles.progressValue,
                  { color: getStatusColor(project.status) },
                ]}
              >
                {project.progress}%
              </Text>
            </View>
            <ProgressBar
              progress={project.progress / 100}
              color={getStatusColor(project.status)}
              style={styles.progressBar}
            />
          </View>
        </Card>

        {/* Details and Description */}
        <Card>
          <Text style={styles.cardTitle}>Details</Text>
          <Text style={styles.descriptionText}>{project.description}</Text>

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Priority</Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: getPriorityColor(project.priority) },
                ]}
              >
                {project.priority}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Manager</Text>
              <Text style={styles.detailValue}>{project.team.managerName}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Deadline</Text>
              <Text style={styles.detailValue}>
                {formatDate(project.deadline)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Tasks</Text>
              <Text style={styles.detailValue}>
                {project.logs.tasksCompleted}/{project.logs.totalTasks} Done
              </Text>
            </View>
          </View>
        </Card>

        {/* Team Members */}
        {project.team.members.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>
              Team ({project.team.members.length})
            </Text>
            <FlatList
              data={project.team.members}
              renderItem={renderTeamMember}
              keyExtractor={(item) => item.userId}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.teamList}
              contentContainerStyle={styles.teamGrid}
            />
          </Card>
        )}

        {/* Tasks List */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tasks ({project.tasks.length})</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {project.tasks.map((task) => (
            <View key={task.id}>{renderTask({ item: task })}</View>
          ))}
        </Card>

        {/* Financial Overview */}
        <Card>
          <Text style={styles.cardTitle}>Financial</Text>
          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Budget</Text>
              <Text style={styles.financialValue}>
                {formatCurrency(
                  project.financial.budget,
                  project.financial.currency
                )}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Budget Spent</Text>
              <Text style={[styles.financialValue, styles.spentValue]}>
                {formatCurrency(
                  project.financial.budgetSpent,
                  project.financial.currency
                )}
              </Text>
            </View>
          </View>

          <View style={styles.financialRow}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Billing Type</Text>
              <Text style={styles.financialSubValue}>
                {project.financial.billingType || 'N/A'}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Time Logged</Text>
              <Text style={styles.financialSubValue}>
                {project.logs.totalTimeLogged} hrs
              </Text>
            </View>
          </View>
        </Card>

        {/* Resources & Logs Buttons (Triggers 6 Modals) */}
        <Card>
          <Text style={styles.cardTitle}>Resources & Logs</Text>
          <View style={styles.fileAccessGrid}>
            <TouchableOpacity
              style={styles.fileRow}
              onPress={() => setShowFoldersModal(true)}
            >
              <Ionicons name="folder" size={24} color="#f59e0b" />
              <Text style={styles.fileText}>
                {project.files.totalFolders} Folders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fileRow}
              onPress={() => setShowDocumentsModal(true)}
            >
              <Ionicons name="document-text" size={24} color="#1f3c88" />
              <Text style={styles.fileText}>
                {project.files.documents.length} Documents
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fileRow}
              onPress={() => setShowNotesModal(true)}
            >
              <Ionicons name="clipboard" size={24} color="#8b5cf6" />
              <Text style={styles.fileText}>
                {project.files.notes.length} Notes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fileRow}
              onPress={() => setShowCommentModal(true)}
            >
              <Ionicons name="chatbubbles" size={24} color="#10b981" />
              <Text style={styles.fileText}>
                {project.logs.totalComments} Comments
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fileRow}
              onPress={() => setShowToolsModal(true)}
            >
              <Ionicons name="hammer" size={24} color="#d32f2f" />
              <Text style={styles.fileText}>
                {project.logs.totalTools} Tools Used
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fileRow}
              onPress={() => setShowWorkLogModal(true)}
            >
              <Ionicons name="timer" size={24} color="#f59e0b" />
              <Text style={styles.fileText}>
                {project.logs.totalWorkLogs} Work Logs
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Project Actions */}
        <Card>
          <Text style={styles.cardTitle}>Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton}>
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Add Task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setShowWorkLogModal(true)}
            >
              <Ionicons name="time" size={20} color="#1f3c88" />
              <Text style={styles.secondaryButtonText}>Log Work Time</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="document-text" size={20} color="#1f3c88" />
              <Text style={styles.secondaryButtonText}>Generate Report</Text>
            </TouchableOpacity>
          </View>
        </Card>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* --- MODAL DEFINITIONS --- */}

      {/* Work Log Modal (Log Work Time) */}
      <Modal
        visible={showWorkLogModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkLogModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={['#1f3c88', '#2d5aa0']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Log Work Time</Text>
            <TouchableOpacity onPress={() => setShowWorkLogModal(false)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView style={styles.modalContent}>
            <Card>
              <Text style={styles.fieldLabel}>Project</Text>
              <Text style={styles.modalProjectTitle}>{project.title}</Text>
            </Card>

            <Card>
              <Text style={styles.fieldLabel}>Hours Worked (Decimal)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2.5"
                keyboardType="numeric"
                value={workLog.hours}
                onChangeText={(text) =>
                  setWorkLog((p) => ({
                    ...p,
                    hours: text.replace(/[^0-9.]/g, ''),
                  }))
                }
              />
            </Card>

            <Card>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.inputArea}
                placeholder="Brief summary of work done..."
                value={workLog.description}
                onChangeText={(text) =>
                  setWorkLog((p) => ({ ...p, description: text }))
                }
                multiline
                numberOfLines={4}
              />
            </Card>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleAddWorkLog}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Submit Time Log</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comment Modal (View and Add) */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCommentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={['#1f3c88', '#2d5aa0']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Project Comments</Text>
            <TouchableOpacity onPress={() => setShowCommentModal(false)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.modalContent}>
            {/* Comment Feed */}
            <ScrollView style={styles.commentFeed}>
              <Text style={styles.commentsLabel}>
                Total Comments: {project.logs.totalComments}
              </Text>

              {(project.comment || [])
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map(renderComment)}

              {project.logs.totalComments === 0 && (
                <Text style={[styles.emptyText, { marginTop: 10 }]}>
                  Be the first to comment!
                </Text>
              )}
            </ScrollView>

            {/* Input Box */}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a new comment..."
                value={commentText}
                onChangeText={setCommentText}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={[
                  styles.commentSendButton,
                  isSubmitting && styles.disabledButton,
                ]}
                onPress={handleAddComment}
                disabled={isSubmitting || !commentText.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Folders Modal (Folder List) */}
      <Modal
        visible={showFoldersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFoldersModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1f3c88', '#2d5aa0']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Project Folders</Text>
            <TouchableOpacity onPress={() => setShowFoldersModal(false)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.commentsLabel}>
              Total Folders: {project.files.totalFolders}
            </Text>
            <Card>
              {foldersList.length > 0 ? (
                foldersList.map((folder: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.folderItem}
                    onPress={() => handleOpenFolder(folder)} // Open sub-modal
                  >
                    <Ionicons name="folder-outline" size={20} color="#f59e0b" />
                    <Text style={styles.folderTitle}>
                      {folder.title || `Folder ${index + 1}`}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>No folders found.</Text>
              )}
            </Card>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Folder Content Modal (Documents and Notes inside a specific folder) */}
      <Modal
        visible={showFolderContentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFolderContentModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1f3c88', '#2d5aa0']}
            style={styles.modalHeader}
          >
            <TouchableOpacity
              onPress={() => {
                setShowFolderContentModal(false);
                setShowFoldersModal(true); // Return to folder list
              }}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedFolder?.title || 'Folder Contents'}
            </Text>
          </LinearGradient>
          <ScrollView style={styles.modalContent}>
            <Card>
              <Text style={styles.fieldLabel}>
                Documents ({selectedFolder?.Document?.length || 0})
              </Text>
              {(selectedFolder?.Document || []).length > 0 ? (
                (selectedFolder.Document || []).map((doc: any) => (
                  <View key={doc.id} style={styles.resourceItem}>
                    <Ionicons
                      name="document-attach-outline"
                      size={20}
                      color="#1f3c88"
                    />
                    <Text style={styles.resourceTitle}>{doc.name}</Text>
                    <Text style={styles.resourceType}>{doc.type}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No documents in this folder.
                </Text>
              )}
            </Card>

            <Card>
              <Text style={styles.fieldLabel}>
                Notes ({selectedFolder?.Note?.length || 0})
              </Text>
              {(selectedFolder?.Note || []).length > 0 ? (
                (selectedFolder.Note || []).map((note: any) => (
                  <View key={note.id} style={styles.resourceItem}>
                    <Ionicons
                      name="clipboard-outline"
                      size={20}
                      color="#8b5cf6"
                    />
                    <Text style={styles.resourceTitle}>{note.title}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteNote(note.id, note.title)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#d32f2f"
                      />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No notes in this folder.</Text>
              )}
            </Card>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Documents Modal */}
      <Modal
        visible={showDocumentsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDocumentsModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1f3c88', '#2d5aa0']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Project Documents</Text>
            <TouchableOpacity onPress={() => setShowDocumentsModal(false)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.commentsLabel}>
              Total Documents: {project.files.documents.length}
            </Text>
            <Card>
              {project.files.documents.length > 0 ? (
                project.files.documents.map((doc) => (
                  <View key={doc.id} style={styles.resourceItem}>
                    <Ionicons
                      name="document-attach-outline"
                      size={20}
                      color="#1f3c88"
                    />
                    <Text style={styles.resourceTitle}>{doc.name}</Text>
                    <Text style={styles.resourceType}>{doc.type}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No documents found.</Text>
              )}
            </Card>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal
        visible={showNotesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1f3c88', '#2d5aa0']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Project Notes</Text>
            <TouchableOpacity onPress={() => setShowNotesModal(false)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.commentsLabel}>
              Total Notes: {project.files.notes.length}
            </Text>
            <Card>
              {project.files.notes.length > 0 ? (
                project.files.notes.map((note) => (
                  <View key={note.id} style={styles.resourceItem}>
                    <Ionicons
                      name="clipboard-outline"
                      size={20}
                      color="#8b5cf6"
                    />
                    <Text style={styles.resourceTitle}>{note.title}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteNote(note.id, note.title)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#d32f2f"
                      />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No notes found.</Text>
              )}
            </Card>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Tools Modal */}
      <Modal
        visible={showToolsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowToolsModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1f3c88', '#2d5aa0']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Tools Used</Text>
            <TouchableOpacity onPress={() => setShowToolsModal(false)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.commentsLabel}>
              Total Tools Logged: {project.logs.totalTools}
            </Text>
            <Card>
              {toolsList.length > 0 ? (
                toolsList.map((toolUse: any, index: number) => (
                  <View key={toolUse.id || index} style={styles.resourceItem}>
                    {/* Show tool image if available */}
                    {toolUse.tool?.image ? (
                      <Image
                        source={{ uri: toolUse.tool.image }}
                        style={styles.toolImage}
                      />
                    ) : (
                      <Ionicons name="hammer" size={20} color="#d32f2f" />
                    )}

                    <Text style={styles.resourceTitle}>
                      {toolUse.tool?.name || 'Tool ID: ' + toolUse.id}
                    </Text>
                    <Text style={styles.resourceType}>Used</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No tools logged.</Text>
              )}
            </Card>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Work Logs Modal (View Logs) */}
      <Modal
        visible={showWorkLogModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkLogModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1f3c88', '#2d5aa0']}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Project Work Logs</Text>
            <TouchableOpacity onPress={() => setShowWorkLogModal(false)}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.commentsLabel}>
              Total Work Logs: {project.logs.totalWorkLogs}
            </Text>
            <Card>
              {workLogsList.length > 0 ? (
                workLogsList.map((log: any, index: number) => (
                  <View key={log.id || index} style={styles.logItem}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logHours}>
                        {Number(log.hours).toFixed(1)} hrs
                      </Text>
                      <Text style={styles.logTime}>
                        {format(new Date(log.date), 'MMM dd, h:mm a')}
                      </Text>
                    </View>
                    <Text style={styles.logDescription}>{log.description}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No work logs recorded.</Text>
              )}
            </Card>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20 },
  backButton: { position: 'absolute', top: 55, left: 10, zIndex: 10 },
  headerContent: {
    alignItems: 'flex-start',
    marginLeft: 30,
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitles: { flex: 1, paddingTop: 5, marginRight: 10 },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#1f3c88',
    fontWeight: '600',
  },

  // Progress
  progressContainer: { marginBottom: 8 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  progressValue: { fontSize: 18, fontWeight: 'bold' },
  progressBar: { marginBottom: 16 },

  // Details
  descriptionText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: { width: '48%', marginBottom: 16 },
  detailLabel: { fontSize: 12, color: '#6c757d', marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },

  // Team
  teamList: { marginHorizontal: -8 },
  teamGrid: { flexDirection: 'row', paddingHorizontal: 8, gap: 10 },
  teamMember: {
    alignItems: 'center',
    width: 80,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginRight: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f3c88',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberInitial: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  memberName: {
    fontSize: 12,
    color: '#1a1a1a',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Tasks
  taskItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  taskTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 12,
  },
  taskStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskStatusText: { fontSize: 10, fontWeight: '600', color: '#ffffff' },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  taskAssignee: { fontSize: 12, color: '#6c757d' },
  taskDueDate: { fontSize: 12, color: '#6c757d' },

  // Financial
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  financialItem: { flex: 1, marginRight: 10 },
  financialLabel: { fontSize: 13, color: '#6c757d', marginBottom: 4 },
  financialValue: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
  financialSubValue: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  spentValue: { color: '#d32f2f' },

  // Files/Resources
  fileAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    width: '48%',
    marginBottom: 8,
  },
  fileText: { fontSize: 15, color: '#1a1a1a', marginLeft: 12 },

  // Actions
  actionButtons: { gap: 12 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f3c88',
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#1f3c88',
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f3c88',
    marginLeft: 8,
  },
  disabledButton: { opacity: 0.6 },

  // Modals
  modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBackButton: { marginRight: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  modalProjectTitle: { fontSize: 16, color: '#1a1a1a' },
  modalContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  inputArea: {
    borderWidth: 1,
    borderColor: '#e5e5e7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Comment Specifics
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e7',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e5e7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  commentSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f3c88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  commentFeed: { maxHeight: 300, marginBottom: 10 },
  commentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: { fontSize: 13, fontWeight: 'bold', color: '#1a1a1a' },
  commentTime: { fontSize: 11, color: '#6c757d' },
  commentMessage: { fontSize: 14, color: '#4b5563', lineHeight: 18 },

  // Resource Item Display
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    justifyContent: 'space-between',
  },
  resourceTitle: {
    fontSize: 15,
    color: '#1a1a1a',
    flex: 1,
    marginLeft: 12,
  },
  resourceType: {
    fontSize: 12,
    color: '#6c757d',
    marginRight: 12,
  },

  // Folder Item Specifics
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
    justifyContent: 'space-between',
  },
  folderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
  },
  // Default empty text style used in modals
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
    paddingVertical: 10,
  },
  // Work Log Modal Specific Styles (FIXED missing styles)
  logItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logHours: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f3c88',
  },
  logTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  logDescription: {
    fontSize: 14,
    color: '#4b5563',
  },
  // Tools Modal Image Style
  toolImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
});
