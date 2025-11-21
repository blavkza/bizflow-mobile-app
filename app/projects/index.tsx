import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
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
import { getProjectsFromUser } from '@/lib/project';
import { ProjectSummary } from '@/types/project';
import { ProjectStatus, Priority } from '@/types/auth';

export default function ProjectsScreen() {
  const { user, isLoading } = useAuth();
  const projects = useMemo(() => getProjectsFromUser(user), [user]);

  const [filter, setFilter] = useState<'All' | ProjectStatus>('All');

  const filteredProjects = useMemo(() => {
    if (filter === 'All') return projects;
    return projects.filter((p) => p.status === filter);
  }, [projects, filter]);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return '#8b5cf6'; // Purple
      case ProjectStatus.ACTIVE:
        return '#10b981'; // Green
      case ProjectStatus.ON_HOLD:
        return '#f59e0b'; // Orange
      case ProjectStatus.COMPLETED:
        return '#1f3c88'; // Blue
      case ProjectStatus.CANCELLED:
        return '#d32f2f'; // Red
      default:
        return '#8e8e93';
    }
  };

  const getStatusLabel = (status: string) => {
    return status === 'All' ? 'All' : status.replace(/_/g, ' ');
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

  const renderProjectCard = ({ item }: { item: ProjectSummary }) => (
    <TouchableOpacity
      onPress={() => {
        router.push({
          pathname: '/project-details',
          params: { projectId: item.id },
        });
      }}
    >
      <Card style={styles.card}>
        {/* Header: Title & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.projectNumber}>{item.projectNumber}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.clientName}>{item.clientName}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        {/* Meta Info */}
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="person" size={14} color="#6c757d" />
            <Text style={styles.metaText}>{item.managerName}</Text>
          </View>
          {item.endDate && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={14} color="#6c757d" />
              <Text style={styles.metaText}>
                Due {format(new Date(item.endDate), 'MMM dd')}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.roleBadge,
              item.role === 'Manager' ? styles.roleManager : styles.roleMember,
            ]}
          >
            <Text
              style={[
                styles.roleText,
                item.role === 'Manager'
                  ? styles.textManager
                  : styles.textMember,
              ]}
            >
              {item.role}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{item.progress}%</Text>
          </View>
          <ProgressBar
            progress={item.progress / 100}
            color={getStatusColor(item.status)}
            style={styles.progressBar}
          />
          <Text style={styles.taskStats}>
            {item.taskCount.completed}/{item.taskCount.total} Tasks Completed
          </Text>
        </View>

        {/* Footer: Priority */}
        <View style={styles.cardFooter}>
          <View
            style={[
              styles.priorityBadge,
              { borderColor: getPriorityColor(item.priority) },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: getPriorityColor(item.priority) },
              ]}
            >
              {item.priority} Priority
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f3c88" />
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
          <Text style={styles.headerTitle}>Projects</Text>
          <Text style={styles.headerSubtitle}>
            {filteredProjects.length} Active
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Filter Tabs */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {[
              'All',
              ProjectStatus.ACTIVE,
              ProjectStatus.PLANNING,
              ProjectStatus.COMPLETED,
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

        {/* Projects List */}
        {filteredProjects.length > 0 ? (
          <FlatList
            data={filteredProjects}
            renderItem={renderProjectCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No projects found.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 16 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' },
  content: { flex: 1 },

  // Filters
  filterWrapper: { paddingVertical: 16 },
  filterContainer: { paddingHorizontal: 20 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e7',
  },
  activeFilterTab: { backgroundColor: '#1f3c88', borderColor: '#1f3c88' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6c757d' },
  activeFilterText: { color: '#ffffff' },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: { marginTop: 16, fontSize: 16, color: '#6c757d' },

  // Card
  card: { marginBottom: 16, padding: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: { flex: 1, marginRight: 12 },
  projectNumber: { fontSize: 12, color: '#6c757d', marginBottom: 2 },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  clientName: { fontSize: 14, color: '#1f3c88', fontWeight: '500' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },

  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#6c757d' },

  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleManager: { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' },
  roleMember: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  roleText: { fontSize: 11, fontWeight: '600' },
  textManager: { color: '#3730a3' },
  textMember: { color: '#4b5563' },

  progressSection: { marginBottom: 16 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#1a1a1a' },
  progressValue: { fontSize: 12, fontWeight: '700', color: '#1f3c88' },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 6 },
  taskStats: { fontSize: 11, color: '#6c757d' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: { fontSize: 11, fontWeight: '600' },
});
